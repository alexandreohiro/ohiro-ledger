#!/usr/bin/env node
/**
 * Aplica as migrations do diretório supabase/migrations/ em ordem numérica.
 * Rastreia quais já foram aplicadas na tabela pública `_migrations`.
 *
 * Uso:
 *   pnpm migrate
 *   # ou diretamente:
 *   node --env-file-if-exists=.env.development.local scripts/migrate.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { readdir, readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, "..", "supabase", "migrations");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error(
    "[migrate] Variáveis NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias."
  );
  process.exit(1);
}

const sb = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
});

// Garante que a tabela de controle existe
async function ensureMigrationsTable() {
  const { error } = await sb.rpc("exec_sql", {
    sql: `
      CREATE TABLE IF NOT EXISTS public._migrations (
        id          serial PRIMARY KEY,
        name        text NOT NULL UNIQUE,
        applied_at  timestamptz NOT NULL DEFAULT now()
      );
    `,
  });
  // exec_sql pode não existir — usa service role diretamente via REST
  if (error) {
    // Se exec_sql não existe, cria via DDL na API de management (fallback informativo)
    console.warn(
      "[migrate] exec_sql RPC não disponível. Crie a tabela _migrations manualmente ou via SQL Editor no Supabase:\n\n" +
      "  CREATE TABLE IF NOT EXISTS public._migrations (\n" +
      "    id serial PRIMARY KEY,\n" +
      "    name text NOT NULL UNIQUE,\n" +
      "    applied_at timestamptz NOT NULL DEFAULT now()\n" +
      "  );\n"
    );
  }
}

async function getAppliedMigrations() {
  const { data, error } = await sb
    .from("_migrations")
    .select("name")
    .order("name");
  if (error) {
    // Tabela pode não existir ainda
    return new Set();
  }
  return new Set((data ?? []).map((r) => r.name));
}

async function markApplied(name) {
  const { error } = await sb.from("_migrations").insert({ name });
  if (error) console.warn(`[migrate] Não foi possível registrar ${name}:`, error.message);
}

async function run() {
  console.log("[migrate] Conectando ao Supabase...");
  await ensureMigrationsTable();

  const applied = await getAppliedMigrations();
  console.log(`[migrate] ${applied.size} migration(s) já aplicada(s).`);

  // Lê todos os .sql, ordena pelo nome (001_, 002_, …)
  const files = (await readdir(MIGRATIONS_DIR))
    .filter((f) => f.endsWith(".sql"))
    .sort();

  let count = 0;
  for (const file of files) {
    if (applied.has(file)) {
      console.log(`[migrate] skip  ${file}`);
      continue;
    }

    const sql = await readFile(join(MIGRATIONS_DIR, file), "utf8");
    console.log(`[migrate] apply ${file} …`);

    // Tenta via exec_sql RPC (requer função criada previamente)
    const { error } = await sb.rpc("exec_sql", { sql });
    if (error) {
      console.error(`[migrate] ERRO ao aplicar ${file}:`, error.message);
      console.error(
        "[migrate] Execute o SQL manualmente no SQL Editor do Supabase Dashboard."
      );
      process.exit(1);
    }

    await markApplied(file);
    count++;
    console.log(`[migrate] ok    ${file}`);
  }

  console.log(
    count > 0
      ? `[migrate] ${count} migration(s) aplicada(s) com sucesso.`
      : "[migrate] Nada a aplicar. Banco ja esta atualizado."
  );
}

run().catch((err) => {
  console.error("[migrate] Erro fatal:", err.message);
  process.exit(1);
});
