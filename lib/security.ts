/**
 * Segurança — validação, sanitização e rate limiting para uploads e chamadas de IA.
 * Todas as funções são server-only (não exportar para client components).
 */

import type { SupabaseClient } from "@supabase/supabase-js";

// ── Tipos de arquivo permitidos ────────────────────────────────────────────────
export const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "text/plain",
  "text/csv",
]);

export const ALLOWED_EXTENSIONS = new Set([
  "jpg", "jpeg", "png", "webp", "gif",
  "pdf", "txt", "csv",
]);

// Limite de 10 MB por arquivo
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
// Máximo de 5 arquivos por request
export const MAX_FILES_PER_REQUEST = 5;
// Máximo de mensagens por janela de 1 minuto
export const RATE_LIMIT_MAX = 15;
export const RATE_LIMIT_WINDOW_MS = 60_000;

// ── Validação de arquivo ───────────────────────────────────────────────────────
export function validateFileType(mimeType: string, filename: string): boolean {
  if (!ALLOWED_MIME_TYPES.has(mimeType)) return false;
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return ALLOWED_EXTENSIONS.has(ext);
}

export function validateFileSize(bytes: number): boolean {
  return bytes > 0 && bytes <= MAX_FILE_SIZE_BYTES;
}

// ── Sanitização de texto ───────────────────────────────────────────────────────
/**
 * Remove caracteres de controle e limita o comprimento da mensagem.
 * Previne prompt injection via truncamento e strip de null bytes.
 */
export function sanitizeMessage(text: string, maxLength = 4000): string {
  return text
    .replace(/\0/g, "")                      // null bytes
    .replace(/[\x01-\x08\x0b\x0c\x0e-\x1f\x7f]/g, "") // control chars (preserva \n \r \t)
    .slice(0, maxLength)
    .trim();
}

// ── Rate limiting compartilhado (tabela Supabase + função atômica) ────────────
// Substitui o antigo Map em memória, que não sobrevivia a múltiplas instâncias serverless.
export async function checkRateLimit(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ allowed: boolean; remaining: number }> {
  const { data, error } = await supabase
    .rpc("check_rate_limit", {
      p_user_id: userId,
      p_window_ms: RATE_LIMIT_WINDOW_MS,
      p_max: RATE_LIMIT_MAX,
    })
    .single();

  if (error || !data) {
    // Falha aberta: erro de infraestrutura não deve bloquear o usuário legítimo.
    return { allowed: true, remaining: RATE_LIMIT_MAX };
  }

  return data as { allowed: boolean; remaining: number };
}

// ── Extração segura de texto de partes multimodais ────────────────────────────
export function extractTextFromParts(
  parts: Array<{ type: string; text?: string }>
): string {
  return parts
    .filter((p): p is { type: "text"; text: string } =>
      p.type === "text" && typeof p.text === "string"
    )
    .map((p) => p.text)
    .join("");
}
