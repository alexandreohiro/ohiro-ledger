import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGroq } from "@ai-sdk/groq";
import {
  streamText,
  tool,
  stepCountIs,
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  type UIMessage,
  type UIMessageChunk,
  type LanguageModel,
} from "ai";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  sanitizeMessage,
  checkRateLimitSupabase,
  validateFileType,
  validateFileSize,
  MAX_FILES_PER_REQUEST,
} from "@/lib/security";
import type { ProviderId } from "@/lib/ai-providers";
import { getProvider, calculateCostUSD } from "@/lib/ai-providers";

export const maxDuration = 60;

// ── Router de providers: tenta o solicitado e cai para outros configurados ───
// Hoje só GEMINI_API_KEY/GROQ_API_KEY (gratuitos) costumam estar configuradas.
// Ao lançar com plano pago, basta adicionar OPENAI_API_KEY/ANTHROPIC_API_KEY nas
// env vars do projeto — elas entram automaticamente na cadeia de fallback, sem
// precisar mudar código.
const PROVIDER_ENV_KEYS: Record<ProviderId, string> = {
  gemini: "GEMINI_API_KEY",
  groq: "GROQ_API_KEY",
  openai: "OPENAI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
};

function isProviderConfigured(id: ProviderId): boolean {
  return Boolean(process.env[PROVIDER_ENV_KEYS[id]]);
}

function buildFallbackOrder(requested: ProviderId): ProviderId[] {
  const order: ProviderId[] = ["gemini", "groq", "openai", "anthropic"];
  const rest = order.filter((id) => id !== requested && isProviderConfigured(id));
  return isProviderConfigured(requested) ? [requested, ...rest] : rest;
}

// ── Instancia o modelo correto de acordo com o provider solicitado ─────────────
function resolveModel(providerId: ProviderId, hasFiles: boolean): LanguageModel {
  const def = getProvider(providerId);

  // Se o provider não suporta arquivos e há arquivos, avisa ao caller
  if (hasFiles && !def.supportsFiles) {
    throw new Error(
      `${def.label} (${def.modelLabel}) não suporta envio de arquivos. Use Gemini, OpenAI ou Anthropic para processar imagens e PDFs.`
    );
  }

  switch (providerId) {
    case "gemini": {
      const key = process.env.GEMINI_API_KEY;
      if (!key) throw new Error("GEMINI_API_KEY não configurada. Adicione em Vars nas configurações do projeto.");
      return createGoogleGenerativeAI({ apiKey: key })(def.model);
    }
    case "openai": {
      const key = process.env.OPENAI_API_KEY;
      if (!key) throw new Error("OPENAI_API_KEY não configurada. Adicione em Vars nas configurações do projeto.");
      return createOpenAI({ apiKey: key })(def.model);
    }
    case "anthropic": {
      const key = process.env.ANTHROPIC_API_KEY;
      if (!key) throw new Error("ANTHROPIC_API_KEY não configurada. Adicione em Vars nas configurações do projeto.");
      return createAnthropic({ apiKey: key })(def.model);
    }
    case "groq": {
      const key = process.env.GROQ_API_KEY;
      if (!key) throw new Error("GROQ_API_KEY não configurada. Adicione em Vars nas configurações do projeto.");
      return createGroq({ apiKey: key })(def.model);
    }
    default: {
      // Fallback seguro para Gemini
      const key = process.env.GEMINI_API_KEY;
      if (!key) throw new Error("GEMINI_API_KEY não configurada.");
      return createGoogleGenerativeAI({ apiKey: key })("gemini-2.5-flash");
    }
  }
}

// ── Tools de mutação de dados (scoped por userId) ─────────────────────────────
function buildTools(userId: string) {
  return {
    addTransaction: tool({
      description:
        "Adiciona um novo lançamento financeiro ao ledger. Use quando o usuário pedir para registrar receita, gasto, salário, conta, fatura ou qualquer movimentação financeira — inclusive ao extrair dados de documentos enviados.",
      inputSchema: z.object({
        date: z.string().describe("Data no formato YYYY-MM-DD"),
        type: z.enum(["Receita", "Gasto", "Dívida", "Investimento", "Transferência", "Reserva"]),
        category: z.string().describe("Categoria: Alimentação, Salário, Aluguel, Saúde etc."),
        subcategory: z.string().optional(),
        description: z.string().max(200),
        amount: z.number().positive(),
        currency: z.enum(["BRL", "USD", "EUR"]).optional(),
        exchangeRate: z.number().optional(),
        status: z.enum(["Previsto", "Pago", "Pendente", "Atrasado", "Recorrente"]).optional(),
        dueDate: z.string().optional(),
        recurrence: z.enum(["Mensal", "Semanal", "Anual", "Única", "Nenhuma"]).optional(),
        account: z.string().optional(),
      }),
      execute: async (input) => {
        try {
          const supabase = await createClient();
          const { error } = await supabase.from("transactions").insert({
            user_id: userId,
            date: input.date,
            type: input.type,
            category: sanitizeMessage(input.category, 100),
            subcategory: sanitizeMessage(input.subcategory ?? "", 100),
            description: sanitizeMessage(input.description, 200),
            amount: input.amount,
            currency: input.currency ?? "BRL",
            exchange_rate: input.exchangeRate ?? 1,
            status: input.status ?? "Pago",
            due_date: input.dueDate ?? null,
            recurrence: input.recurrence ?? "Única",
            account: sanitizeMessage(input.account ?? "", 100),
          });
          if (error) return { success: false, error: error.message };
          return { success: true, message: `Lançamento "${input.description}" de R$ ${input.amount.toFixed(2)} adicionado.` };
        } catch (e) {
          return { success: false, error: String(e) };
        }
      },
    }),

    upsertDebt: tool({
      description:
        "Registra uma nova dívida (financiamento, cartão, empréstimo). Use ao identificar dívidas em documentos ou quando o usuário mencionar.",
      inputSchema: z.object({
        creditor: z.string().max(100),
        originalAmount: z.number().positive(),
        currentAmount: z.number().positive(),
        installmentAmount: z.number().min(0).optional(),
        dueDate: z.string().optional().describe("YYYY-MM-DD"),
        interestRate: z.number().min(0).max(100).optional().describe("Taxa de juros mensal em pontos percentuais, ex: 3.5 = 3,5% a.m."),
        status: z.enum(["Ativo", "Quitado", "Atrasado", "Renegociado"]).optional(),
        priority: z.enum(["Baixo", "Médio", "Alto", "Crítico"]).optional(),
      }),
      execute: async (input) => {
        try {
          const supabase = await createClient();
          const { error } = await supabase.from("debts").insert({
            user_id: userId,
            creditor: sanitizeMessage(input.creditor, 100),
            original_amount: input.originalAmount,
            current_amount: input.currentAmount,
            installment_amount: input.installmentAmount ?? 0,
            due_date: input.dueDate ?? null,
            interest_rate: input.interestRate ?? 0,
            status: input.status ?? "Ativo",
            priority: input.priority ?? "Médio",
          });
          if (error) return { success: false, error: error.message };
          return { success: true, message: `Dívida com ${input.creditor} de R$ ${input.currentAmount.toFixed(2)} registrada.` };
        } catch (e) {
          return { success: false, error: String(e) };
        }
      },
    }),

    upsertInvestment: tool({
      description:
        "Registra um investimento na carteira do usuário (ação, fundo, poupança, cripto etc.).",
      inputSchema: z.object({
        assetName: z.string().max(100),
        class: z.enum(["Renda Fixa", "Renda Variável", "Conta Global", "Cripto", "Reserva de Emergência", "Outros"]),
        amount: z.number().positive(),
        currency: z.enum(["BRL", "USD", "EUR"]).optional(),
        exchangeRate: z.number().optional(),
        convertedAmountBRL: z.number().positive(),
        monthlyContribution: z.number().min(0).optional(),
      }),
      execute: async (input) => {
        try {
          const supabase = await createClient();
          const { error } = await supabase.from("investments").insert({
            user_id: userId,
            asset_name: sanitizeMessage(input.assetName, 100),
            class: input.class,
            amount: input.amount,
            currency: input.currency ?? "BRL",
            exchange_rate: input.exchangeRate ?? 1,
            converted_amount_brl: input.convertedAmountBRL,
            monthly_contribution: input.monthlyContribution ?? 0,
          });
          if (error) return { success: false, error: error.message };
          return { success: true, message: `Investimento "${input.assetName}" de R$ ${input.convertedAmountBRL.toFixed(2)} registrado.` };
        } catch (e) {
          return { success: false, error: String(e) };
        }
      },
    }),

    readFinancialData: tool({
      description:
        "Lê todos os dados financeiros atualizados (transações recentes, investimentos, dívidas). Use sempre antes de análises detalhadas ou quando o contexto parecer desatualizado.",
      inputSchema: z.object({ reason: z.string().optional() }),
      execute: async () => {
        try {
          const supabase = await createClient();
          const [txRes, invRes, debtRes] = await Promise.all([
            supabase
              .from("transactions")
              .select("id,type,amount,status,category,subcategory,date,description,account,currency,recurrence,due_date")
              .eq("user_id", userId)
              .order("date", { ascending: false })
              .limit(50),
            supabase
              .from("investments")
              .select("id,asset_name,class,amount,currency,converted_amount_brl,monthly_contribution")
              .eq("user_id", userId),
            supabase
              .from("debts")
              .select("id,creditor,original_amount,current_amount,installment_amount,status,priority,due_date,interest_rate")
              .eq("user_id", userId),
          ]);
          return {
            transactions: txRes.data ?? [],
            investments: invRes.data ?? [],
            debts: debtRes.data ?? [],
          };
        } catch (e) {
          return { error: String(e) };
        }
      },
    }),

    searchTransactions: tool({
      description:
        "Busca lançamentos por descrição, categoria, tipo ou período. Retorna IDs reais que podem ser usados em updateTransaction ou deleteTransaction.",
      inputSchema: z.object({
        query: z.string().optional().describe("Texto livre para buscar na descrição ou categoria"),
        type: z.enum(["Receita", "Gasto", "Dívida", "Investimento", "Transferência", "Reserva"]).optional(),
        category: z.string().optional(),
        dateFrom: z.string().optional().describe("YYYY-MM-DD"),
        dateTo: z.string().optional().describe("YYYY-MM-DD"),
        limit: z.number().min(1).max(30).optional(),
      }),
      execute: async (input) => {
        try {
          const supabase = await createClient();
          let q = supabase
            .from("transactions")
            .select("id,date,type,category,description,amount,status,account")
            .eq("user_id", userId)
            .order("date", { ascending: false })
            .limit(input.limit ?? 10);

          if (input.type) q = q.eq("type", input.type);
          if (input.category) q = q.ilike("category", `%${input.category}%`);
          if (input.dateFrom) q = q.gte("date", input.dateFrom);
          if (input.dateTo) q = q.lte("date", input.dateTo);
          if (input.query) q = q.or(`description.ilike.%${input.query}%,category.ilike.%${input.query}%`);

          const { data, error } = await q;
          if (error) return { success: false, error: error.message };
          return { success: true, count: data?.length ?? 0, transactions: data ?? [] };
        } catch (e) {
          return { success: false, error: String(e) };
        }
      },
    }),

    updateTransaction: tool({
      description:
        "Atualiza campos de um lançamento existente pelo ID. Use searchTransactions primeiro para obter o ID correto. Só altere os campos que o usuário pediu.",
      inputSchema: z.object({
        id: z.string().describe("ID do lançamento obtido via searchTransactions ou readFinancialData"),
        date: z.string().optional(),
        type: z.enum(["Receita", "Gasto", "Dívida", "Investimento", "Transferência", "Reserva"]).optional(),
        category: z.string().optional(),
        subcategory: z.string().optional(),
        description: z.string().max(200).optional(),
        amount: z.number().positive().optional(),
        currency: z.enum(["BRL", "USD", "EUR"]).optional(),
        exchangeRate: z.number().optional(),
        status: z.enum(["Previsto", "Pago", "Pendente", "Atrasado", "Recorrente"]).optional(),
        dueDate: z.string().optional(),
        recurrence: z.enum(["Mensal", "Semanal", "Anual", "Única", "Nenhuma"]).optional(),
        account: z.string().optional(),
      }),
      execute: async (input) => {
        try {
          const supabase = await createClient();
          // Verifica que o registro pertence ao usuário antes de atualizar
          const { data: existing } = await supabase
            .from("transactions")
            .select("id")
            .eq("id", input.id)
            .eq("user_id", userId)
            .single();

          if (!existing) return { success: false, error: "Lançamento não encontrado ou sem permissão." };

          const updates: Record<string, unknown> = {};
          if (input.date !== undefined) updates.date = input.date;
          if (input.type !== undefined) updates.type = input.type;
          if (input.category !== undefined) updates.category = sanitizeMessage(input.category, 100);
          if (input.subcategory !== undefined) updates.subcategory = sanitizeMessage(input.subcategory, 100);
          if (input.description !== undefined) updates.description = sanitizeMessage(input.description, 200);
          if (input.amount !== undefined) updates.amount = input.amount;
          if (input.currency !== undefined) updates.currency = input.currency;
          if (input.exchangeRate !== undefined) updates.exchange_rate = input.exchangeRate;
          if (input.status !== undefined) updates.status = input.status;
          if (input.dueDate !== undefined) updates.due_date = input.dueDate;
          if (input.recurrence !== undefined) updates.recurrence = input.recurrence;
          if (input.account !== undefined) updates.account = sanitizeMessage(input.account, 100);

          const { error } = await supabase
            .from("transactions")
            .update(updates)
            .eq("id", input.id)
            .eq("user_id", userId);

          if (error) return { success: false, error: error.message };
          return { success: true, message: `Lançamento atualizado com sucesso.` };
        } catch (e) {
          return { success: false, error: String(e) };
        }
      },
    }),

    deleteTransaction: tool({
      description:
        "Remove um lançamento pelo ID. SEMPRE confirme com o usuário antes de deletar — pergunte 'Confirma a exclusão do lançamento X?' e só execute após resposta afirmativa.",
      inputSchema: z.object({
        id: z.string().describe("ID do lançamento a remover"),
        description: z.string().describe("Descrição do lançamento para confirmar ao usuário"),
        confirmed: z.boolean().describe("true somente se o usuário confirmou explicitamente a exclusão"),
      }),
      execute: async (input) => {
        if (!input.confirmed) {
          return {
            success: false,
            requiresConfirmation: true,
            message: `Para confirmar a exclusão de "${input.description}", responda "sim, pode apagar".`,
          };
        }
        try {
          const supabase = await createClient();
          const { data: existing } = await supabase
            .from("transactions")
            .select("id")
            .eq("id", input.id)
            .eq("user_id", userId)
            .single();

          if (!existing) return { success: false, error: "Lançamento não encontrado ou sem permissão." };

          const { error } = await supabase
            .from("transactions")
            .delete()
            .eq("id", input.id)
            .eq("user_id", userId);

          if (error) return { success: false, error: error.message };
          return { success: true, message: `Lançamento "${input.description}" removido com sucesso.` };
        } catch (e) {
          return { success: false, error: String(e) };
        }
      },
    }),

    findMissingRecurringExpenses: tool({
      description:
        "Detecta lançamentos recorrentes (ex: água, luz, internet, aluguel) que apareceram nos últimos meses mas estão ausentes no mês de referência. Use SEMPRE depois de processar um contracheque/salário, para checar se o usuário esqueceu de lançar alguma conta — o saldo livre pode estar superestimado por causa disso.",
      inputSchema: z.object({
        referenceMonth: z.string().describe("Mês de referência no formato YYYY-MM (geralmente o mês do contracheque processado)"),
      }),
      execute: async (input) => {
        try {
          const supabase = await createClient();
          const [refYear, refMonthNum] = input.referenceMonth.split("-").map(Number);
          const lookbackStart = new Date(refYear, refMonthNum - 1 - 3, 1);

          const { data, error } = await supabase
            .from("transactions")
            .select("category,subcategory,description,amount,date,recurrence,type")
            .eq("user_id", userId)
            .eq("type", "Gasto")
            .gte("date", lookbackStart.toISOString().slice(0, 10))
            .lt("date", new Date(refYear, refMonthNum, 1).toISOString().slice(0, 10))
            .order("date", { ascending: false })
            .limit(500);

          if (error) return { success: false, error: error.message };
          const rows = data ?? [];

          const refMonthKey = `${refYear}-${String(refMonthNum).padStart(2, "0")}`;
          const monthKeyOf = (d: string) => d.slice(0, 7);

          // Agrupa por categoria+subcategoria, contando em quantos dos 3 meses anteriores ao mês de referência apareceu
          const priorMonthKeys = [1, 2, 3].map((n) => {
            const d = new Date(refYear, refMonthNum - 1 - n, 1);
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          });

          type Group = { category: string; subcategory: string; monthsPresent: Set<string>; amounts: number[]; lastDescription: string };
          const groups = new Map<string, Group>();
          for (const row of rows) {
            const mk = monthKeyOf(row.date);
            if (mk === refMonthKey) continue; // só nos interessa o histórico anterior
            const key = `${row.category}|${row.subcategory ?? ""}`;
            const g: Group = groups.get(key) ?? { category: row.category, subcategory: row.subcategory ?? "", monthsPresent: new Set<string>(), amounts: [], lastDescription: row.description };
            g.monthsPresent.add(mk);
            g.amounts.push(Number(row.amount));
            groups.set(key, g);
          }

          const presentThisMonth = new Set(
            rows.filter((r) => monthKeyOf(r.date) === refMonthKey).map((r) => `${r.category}|${r.subcategory ?? ""}`)
          );

          const missing = Array.from(groups.values())
            .filter((g) => {
              const key = `${g.category}|${g.subcategory}`;
              if (presentThisMonth.has(key)) return false;
              // Recorrente: apareceu em pelo menos 2 dos 3 meses anteriores
              const monthsHit = priorMonthKeys.filter((mk) => g.monthsPresent.has(mk)).length;
              return monthsHit >= 2;
            })
            .map((g) => ({
              category: g.category,
              subcategory: g.subcategory,
              lastDescription: g.lastDescription,
              averageAmount: g.amounts.reduce((s, a) => s + a, 0) / g.amounts.length,
              monthsSeenRecently: priorMonthKeys.filter((mk) => g.monthsPresent.has(mk)).length,
            }));

          return { success: true, referenceMonth: refMonthKey, missingCount: missing.length, missing };
        } catch (e) {
          return { success: false, error: String(e) };
        }
      },
    }),

    updateDebt: tool({
      description:
        "Atualiza uma dívida existente (ex: registrar pagamento de parcela, mudar status para Quitado, atualizar saldo devedor).",
      inputSchema: z.object({
        id: z.string().describe("ID da dívida obtido via readFinancialData"),
        currentAmount: z.number().positive().optional(),
        installmentAmount: z.number().min(0).optional(),
        dueDate: z.string().optional(),
        interestRate: z.number().min(0).max(1).optional(),
        status: z.enum(["Ativo", "Quitado", "Atrasado", "Renegociado"]).optional(),
        priority: z.enum(["Baixo", "Médio", "Alto", "Crítico"]).optional(),
      }),
      execute: async (input) => {
        try {
          const supabase = await createClient();
          const { data: existing } = await supabase
            .from("debts")
            .select("id,creditor")
            .eq("id", input.id)
            .eq("user_id", userId)
            .single();

          if (!existing) return { success: false, error: "Dívida não encontrada ou sem permissão." };

          const updates: Record<string, unknown> = {};
          if (input.currentAmount !== undefined) updates.current_amount = input.currentAmount;
          if (input.installmentAmount !== undefined) updates.installment_amount = input.installmentAmount;
          if (input.dueDate !== undefined) updates.due_date = input.dueDate;
          if (input.interestRate !== undefined) updates.interest_rate = input.interestRate;
          if (input.status !== undefined) updates.status = input.status;
          if (input.priority !== undefined) updates.priority = input.priority;

          const { error } = await supabase
            .from("debts")
            .update(updates)
            .eq("id", input.id)
            .eq("user_id", userId);

          if (error) return { success: false, error: error.message };
          return { success: true, message: `Dívida com ${existing.creditor} atualizada com sucesso.` };
        } catch (e) {
          return { success: false, error: String(e) };
        }
      },
    }),
  };
}

export async function POST(req: Request) {
  // ── Autenticação obrigatória ──────────────────────────────────────────────────
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Não autenticado" }), { status: 401 });
  }

  // ── Rate limiting via Supabase RPC (distribuído, sobrevive a múltiplas instâncias) ──
  const { allowed } = await checkRateLimitSupabase(supabase, user.id);
  if (!allowed) {
    return new Response(
      JSON.stringify({ error: "Muitas requisições. Aguarde 1 minuto." }),
      { status: 429 }
    );
  }

  // ── Parse seguro do body ──────────────────────────────────────────────────────
  let body: {
    messages?: UIMessage[];
    context?: string;
    files?: Array<{ name: string; type: string; data: string }>;
    provider?: string;
  };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Payload inválido" }), { status: 400 });
  }

  const { messages = [], context = "", files = [], provider: rawProvider = "gemini" } = body;
  const providerId: ProviderId = (["gemini", "openai", "anthropic", "groq"].includes(rawProvider)
    ? rawProvider
    : "gemini") as ProviderId;

  // ── Validação de arquivos ─────────────────────────────────────────────────────
  if (files.length > MAX_FILES_PER_REQUEST) {
    return new Response(
      JSON.stringify({ error: `Máximo de ${MAX_FILES_PER_REQUEST} arquivos por mensagem.` }),
      { status: 400 }
    );
  }

  for (const file of files) {
    if (!validateFileType(file.type, file.name)) {
      return new Response(
        JSON.stringify({ error: `Tipo não permitido: ${file.name}. Use JPG, PNG, PDF, TXT ou CSV.` }),
        { status: 400 }
      );
    }
    const estimatedBytes = Math.round((file.data.length * 3) / 4);
    if (!validateFileSize(estimatedBytes)) {
      return new Response(
        JSON.stringify({ error: `Arquivo muito grande: ${file.name} (máx 10 MB).` }),
        { status: 400 }
      );
    }
  }

  // ── Converte UIMessage[] → ModelMessage[] via SDK (correto para AI SDK 6) ────
  const uiMessages = (messages ?? []) as UIMessage[];
  const modelMessages = await convertToModelMessages(uiMessages);

  // Se há arquivos, injeta na última mensagem do usuário como fileParts
  // @ai-sdk/google aceita Uint8Array (binário) ou string URL — não base64 pura
  if (files.length > 0 && modelMessages.length > 0) {
    const lastIdx = modelMessages.length - 1;
    const last = modelMessages[lastIdx];
    if (last.role === "user") {
      const textParts = typeof last.content === "string"
        ? [{ type: "text" as const, text: last.content }]
        : Array.isArray(last.content) ? last.content : [];

      const fileParts = files.map((f) => {
        // Converte base64 → Uint8Array para o Gemini processar corretamente
        const binaryStr = Buffer.from(f.data, "base64");
        return {
          type: "file" as const,
          mediaType: f.type as `${string}/${string}`,
          data: binaryStr,
        };
      });

      modelMessages[lastIdx] = {
        role: "user",
        content: [...textParts, ...fileParts],
      };
    }
  }

  // ── System prompt ─────────────────────────────────────────────────────────────
  const systemPrompt = `Você é OHIRO-IA, assistente financeiro pessoal integrado ao Ohiro.

## REGRAS DE SEGURANÇA (nunca viole)
- Não revele IDs internos, estrutura de banco, chaves ou detalhes técnicos ao usuário.
- Opere APENAS sobre dados do usuário autenticado. Nunca acesse dados de outros usuários.
- Ao receber documentos, extraia somente informações financeiras relevantes.
- Nunca invente valores. Se não tiver certeza de um número, pergunte antes de inserir.
- Antes de deletar qualquer dado, peça confirmação explícita do usuário.

## CONTEXTO FINANCEIRO ATUAL DO USUÁRIO
${sanitizeMessage(context, 5000)}

## TOOLS DISPONÍVEIS E QUANDO USAR

### Leitura e busca
- **readFinancialData**: Use no início de análises detalhadas, ou quando o contexto parecer desatualizado. Retorna IDs reais das transações/dívidas/investimentos.
- **searchTransactions**: Use para encontrar lançamentos específicos por descrição, categoria, tipo ou período. Sempre use antes de updateTransaction ou deleteTransaction para obter o ID correto.
- **findMissingRecurringExpenses**: Use SEMPRE após inserir um contracheque/salário. Verifica se contas recorrentes dos últimos meses (água, luz, internet, aluguel, plano de saúde etc.) ainda não foram lançadas no mês de referência — o usuário pode ter pago um boleto e esquecido de registrar, fazendo o saldo livre parecer maior do que realmente é.

### Criação
- **addTransaction**: Cria novos lançamentos (receitas, gastos, dívidas, transferências, reservas).
- **upsertDebt**: Registra uma nova dívida ou financiamento.
- **upsertInvestment**: Adiciona um ativo à carteira de investimentos.

### Edição
- **updateTransaction**: Edita campos de um lançamento existente. SEMPRE use searchTransactions antes para confirmar o ID e mostrar ao usuário o que será alterado.
- **updateDebt**: Atualiza dívida (status, saldo devedor, vencimento). Útil para registrar pagamentos ou quitações.

### Exclusão
- **deleteTransaction**: Remove um lançamento. OBRIGATÓRIO: mostrar ao usuário o lançamento encontrado e pedir confirmação antes de setar confirmed=true.

## COMPORTAMENTO
- Responda SEMPRE em português do Brasil, linguagem financeira clara e objetiva.
- Valores monetários: R$ com vírgula decimal (ex: R$ 1.234,56).
- Ao receber contracheque (imagem/PDF): extraia salário bruto, todos os descontos (INSS, IR, planos) e salário líquido. Insira cada item com addTransaction após mostrar o resumo ao usuário. Em seguida, SEMPRE chame findMissingRecurringExpenses para o mês do contracheque — se houver contas recorrentes (água, luz, internet, etc.) ausentes nesse mês, avise o usuário explicitamente: "Notei que sua conta de [categoria] (~R$ [valor médio]) aparece nos últimos meses mas não foi lançada em [mês] — você já pagou e esqueceu de registrar, ou ainda está pendente?" e ofereça para adicionar com addTransaction caso o usuário confirme.
- Ao receber extrato bancário ou fatura: liste todas as transações identificadas, confirme com o usuário e depois insira com addTransaction.
- Após qualquer mutação de dados, avise: "Os dados foram salvos. Recarregue a página (F5 ou Ctrl+R) para ver as atualizações no dashboard."
- Quando o usuário pedir "edite", "atualize", "mude", "corrija" ou "apague" algo: use searchTransactions para localizar, mostre o que foi encontrado e peça confirmação antes de executar.
- Formate respostas longas com Markdown (## seções, **negrito**, listas com -).
- Para análises financeiras: use os dados do contexto e, se precisar de mais detalhes, chame readFinancialData primeiro.

## CATEGORIAS DISPONÍVEIS
Receita: Salário, 13º Salário, Férias, Benefícios, Vale Refeição, Vale Transporte, Adicionais, Hora Extra, Bônus, Freelance, Aluguel Recebido, Dividendos, Pensão Recebida, Outros
Gasto: Alimentação, Supermercado, Restaurante, Delivery, Moradia, Aluguel, Condomínio, IPTU, Água, Luz, Gás, Internet, Telefone, Transporte, Combustível, Uber / Táxi, Estacionamento, Manutenção Veículo, Saúde, Farmácia, Plano de Saúde, Dentista, Educação, Cursos, Material Escolar, Lazer, Streaming, Assinaturas, Roupas, Beleza, Academia, Cartão de Crédito, Financiamento, Igreja, Doações, Outros
Dívida: Cartão de Crédito, Cheque Especial, Empréstimo Pessoal, Empréstimo Consignado, Financiamento Veículo, Financiamento Imóvel, Banco, Crediário, Pensão Alimentícia, Outros
Investimento: Renda Fixa, CDB, LCI / LCA, Tesouro Direto, Renda Variável, Ações, FIIs, ETF, Conta Global, Cripto, Previdência Privada, Reserva de Emergência, Poupança, Outros`;

  // ── Streaming com router/fallback entre providers configurados ───────────────
  // Tenta o provider escolhido; se falhar ANTES de gerar qualquer conteúdo
  // (chave inválida, cota esgotada, erro de schema etc.), tenta o próximo
  // provider configurado, na ordem de buildFallbackOrder().
  const candidates = buildFallbackOrder(providerId);
  if (candidates.length === 0) {
    return new Response(
      JSON.stringify({ error: "Nenhum provider de IA configurado. Adicione uma API key nas variáveis do projeto." }),
      { status: 500 }
    );
  }

  // O provider escolhido pelo usuário não tem API key configurada na Vercel:
  // falha explicitamente em vez de cair silenciosamente para outro provider
  // (ex: usuário seleciona Groq mas o backend usa Gemini sem avisar, e se o
  // Gemini estiver com cota esgotada o usuário só vê um erro genérico).
  if (!isProviderConfigured(providerId)) {
    return new Response(
      JSON.stringify({
        error: `${getProvider(providerId).label} (${getProvider(providerId).modelLabel}) não configurada neste ambiente. Adicione ${PROVIDER_ENV_KEYS[providerId]} nas variáveis de ambiente da Vercel ou selecione outro modelo.`,
      }),
      { status: 500 }
    );
  }

  // ── Plano por créditos: providers pagos (Anthropic/OpenAI) só seguem se houver
  // saldo em USD. Providers free (Gemini/Groq) continuam no limite diário (client-side).
  const providerDef = getProvider(providerId);
  if (providerDef.billedByCredit) {
    const { data: balance } = await supabase.rpc("check_ai_credit_balance", {
      p_user_id: user.id,
      p_provider_id: providerId,
    });
    if (!balance || Number(balance) <= 0) {
      return new Response(
        JSON.stringify({
          error: `Saldo de créditos esgotado para ${providerDef.label} (${providerDef.modelLabel}). Adicione mais créditos ou selecione um modelo gratuito (Gemini, Groq).`,
        }),
        { status: 402 }
      );
    }
  }

  let usedProviderId: ProviderId = candidates[0];
  let lastErrorMsg = "";

  try {
    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        for (const candidateId of candidates) {
          const providerDef = getProvider(candidateId);
          try {
            const model = resolveModel(candidateId, files.length > 0);
            const result = streamText({
              model,
              system: systemPrompt,
              messages: modelMessages,
              // Groq não suporta tool calling em todos os modelos — desativa tools para evitar erro
              tools: candidateId !== "groq" ? buildTools(user.id) : undefined,
              stopWhen: candidateId !== "groq" ? stepCountIs(12) : undefined,
              temperature: 0.3,
              onError: (err) => {
                console.error(`[ai/chat][${providerDef.modelLabel}] stream error:`, err);
              },
              onFinish: async ({ totalUsage }) => {
                if (!providerDef.billedByCredit) return;
                const inputTokens = totalUsage.inputTokens ?? 0;
                const outputTokens = totalUsage.outputTokens ?? 0;
                const cost = calculateCostUSD(candidateId, inputTokens, outputTokens);
                if (cost <= 0) return;
                const { error } = await supabase.rpc("debit_ai_credit", {
                  p_user_id: user.id,
                  p_provider_id: candidateId,
                  p_model: providerDef.model,
                  p_input_tokens: inputTokens,
                  p_output_tokens: outputTokens,
                  p_cost_usd: cost,
                });
                if (error) console.error(`[ai/chat][${providerDef.modelLabel}] debit error:`, error.message);
              },
            });

            const iterator: AsyncIterator<UIMessageChunk> = result
              .toUIMessageStream()[Symbol.asyncIterator]();
            const buffered: UIMessageChunk[] = [];
            let failedEarly = false;

            // Consome até o primeiro chunk de conteúdo real para decidir se o provider "pegou".
            while (true) {
              const { value, done } = await iterator.next();
              if (done) break;
              buffered.push(value);
              if (value.type === "error") {
                failedEarly = true;
                lastErrorMsg = "error" in value ? String(value.error) : "Erro desconhecido do provider.";
                break;
              }
              if (value.type !== "start" && value.type !== "start-step") break;
            }

            if (failedEarly) continue; // tenta o próximo provider da lista

            usedProviderId = candidateId;
            for (const chunk of buffered) writer.write(chunk);
            while (true) {
              const { value, done } = await iterator.next();
              if (done) break;
              writer.write(value);
            }
            return; // sucesso — encerra o loop de fallback
          } catch (err) {
            lastErrorMsg = err instanceof Error ? err.message : String(err);
            console.error(`[ai/chat][${candidateId}] fallback error:`, lastErrorMsg);
            continue;
          }
        }

        // Todos os providers configurados falharam
        throw new Error(lastErrorMsg || "Todos os providers de IA configurados falharam.");
      },
      onError: (error) => (error instanceof Error ? error.message : String(error)),
    });

    return createUIMessageStreamResponse({
      stream,
      headers: {
        "X-AI-Provider": usedProviderId,
        "X-AI-Model": getProvider(usedProviderId).modelLabel,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[ai/chat][${providerId}] fatal error:`, msg);

    if (msg.includes("429") || msg.toLowerCase().includes("quota") || msg.toLowerCase().includes("rate limit")) {
      return new Response(
        JSON.stringify({ error: `Limite de requisições atingido (${getProvider(providerId).label}). Tente novamente em instantes ou troque de modelo.` }),
        { status: 429 }
      );
    }
    if (msg.toLowerCase().includes("api key") || msg.toLowerCase().includes("_api_key")) {
      return new Response(
        JSON.stringify({ error: msg }),
        { status: 500 }
      );
    }
    if (msg.toLowerCase().includes("não suporta")) {
      return new Response(
        JSON.stringify({ error: msg }),
        { status: 400 }
      );
    }
    return new Response(
      JSON.stringify({ error: `Erro ao processar: ${msg}` }),
      { status: 500 }
    );
  }
}
