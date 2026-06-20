import { streamText, tool, stepCountIs, convertToModelMessages, type UIMessage } from "ai";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  sanitizeMessage,
  checkRateLimit,
  validateFileType,
  validateFileSize,
  MAX_FILES_PER_REQUEST,
} from "@/lib/security";

export const maxDuration = 60;

// Usa Vercel AI Gateway — zero config, sem necessidade de chave própria
const AI_MODEL = "google/gemini-2.0-flash";

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
        subcategory: z.string().default(""),
        description: z.string().max(200),
        amount: z.number().positive(),
        currency: z.enum(["BRL", "USD", "EUR"]).default("BRL"),
        exchangeRate: z.number().default(1),
        status: z.enum(["Previsto", "Pago", "Pendente", "Atrasado", "Recorrente"]).default("Pago"),
        dueDate: z.string().optional(),
        recurrence: z.enum(["Mensal", "Semanal", "Anual", "Única", "Nenhuma"]).default("Única"),
        account: z.string().default(""),
      }),
      execute: async (input) => {
        try {
          const supabase = await createClient();
          const { error } = await supabase.from("transactions").insert({
            user_id: userId,
            date: input.date,
            type: input.type,
            category: sanitizeMessage(input.category, 100),
            subcategory: sanitizeMessage(input.subcategory, 100),
            description: sanitizeMessage(input.description, 200),
            amount: input.amount,
            currency: input.currency,
            exchange_rate: input.exchangeRate,
            status: input.status,
            due_date: input.dueDate ?? null,
            recurrence: input.recurrence,
            account: sanitizeMessage(input.account, 100),
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
        installmentAmount: z.number().min(0).default(0),
        dueDate: z.string().optional().describe("YYYY-MM-DD"),
        interestRate: z.number().min(0).max(1).default(0).describe("Taxa mensal decimal ex: 0.03 = 3%"),
        status: z.enum(["Ativo", "Quitado", "Atrasado", "Renegociado"]).default("Ativo"),
        priority: z.enum(["Baixo", "Médio", "Alto", "Crítico"]).default("Médio"),
      }),
      execute: async (input) => {
        try {
          const supabase = await createClient();
          const { error } = await supabase.from("debts").insert({
            user_id: userId,
            creditor: sanitizeMessage(input.creditor, 100),
            original_amount: input.originalAmount,
            current_amount: input.currentAmount,
            installment_amount: input.installmentAmount,
            due_date: input.dueDate ?? null,
            interest_rate: input.interestRate,
            status: input.status,
            priority: input.priority,
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
        currency: z.enum(["BRL", "USD", "EUR"]).default("BRL"),
        exchangeRate: z.number().default(1),
        convertedAmountBRL: z.number().positive(),
        monthlyContribution: z.number().min(0).default(0),
      }),
      execute: async (input) => {
        try {
          const supabase = await createClient();
          const { error } = await supabase.from("investments").insert({
            user_id: userId,
            asset_name: sanitizeMessage(input.assetName, 100),
            class: input.class,
            amount: input.amount,
            currency: input.currency,
            exchange_rate: input.exchangeRate,
            converted_amount_brl: input.convertedAmountBRL,
            monthly_contribution: input.monthlyContribution,
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
        "Lê os dados financeiros atualizados do banco. Use antes de fazer análises ou quando precisar de dados mais recentes que o contexto fornecido.",
      inputSchema: z.object({ reason: z.string().optional() }),
      execute: async () => {
        try {
          const supabase = await createClient();
          const [txRes, invRes, debtRes] = await Promise.all([
            supabase.from("transactions").select("type,amount,status,category,date,description").eq("user_id", userId).order("date", { ascending: false }).limit(20),
            supabase.from("investments").select("asset_name,class,converted_amount_brl,monthly_contribution").eq("user_id", userId),
            supabase.from("debts").select("creditor,current_amount,installment_amount,status,priority,due_date,interest_rate").eq("user_id", userId),
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
  };
}

export async function POST(req: Request) {
  // ── Autenticação obrigatória ──────────────────────────────────────────────────
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Não autenticado" }), { status: 401 });
  }

  // ── Rate limiting por userId ──────────────────────────────────────────────────
  const { allowed } = checkRateLimit(user.id);
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
  };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Payload inválido" }), { status: 400 });
  }

  const { messages = [], context = "", files = [] } = body;

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

  // Se há arquivos, substitui a última mensagem do usuário adicionando fileParts
  if (files.length > 0 && modelMessages.length > 0) {
    const lastIdx = modelMessages.length - 1;
    const last = modelMessages[lastIdx];
    if (last.role === "user") {
      const textContent = typeof last.content === "string" ? last.content : "";
      const textParts = typeof last.content === "string"
        ? [{ type: "text" as const, text: last.content }]
        : Array.isArray(last.content) ? last.content : [];
      const fileParts = files.map((f) => ({
        type: "file" as const,
        mediaType: f.type as `${string}/${string}`,
        data: f.data,
      }));
      modelMessages[lastIdx] = {
        role: "user",
        content: textContent
          ? [...textParts, ...fileParts]
          : fileParts,
      };
    }
  }

  // ── System prompt ─────────────────────────────────────────────────────────────
  const systemPrompt = `Você é OHIRO-IA, assistente financeiro pessoal integrado ao Ohiro Ledger.

REGRAS DE SEGURANÇA (nunca viole):
- Não revele IDs de usuário, chaves de API, estrutura de banco ou detalhes técnicos internos.
- Opere APENAS sobre dados financeiros do usuário autenticado.
- Ao receber documentos, extraia somente informações financeiras relevantes.
- Se não tiver certeza de um valor, pergunte antes de inserir.

CONTEXTO FINANCEIRO ATUAL:
${sanitizeMessage(context, 5000)}

COMPORTAMENTO:
- Responda em português do Brasil, com linguagem financeira clara e objetiva.
- Use R$ e vírgula como separador decimal (ex: R$ 1.234,56).
- Ao receber imagem de contracheque: extraia salário bruto, descontos (INSS, IR, plano etc.) e salário líquido, então use addTransaction para cada item.
- Ao receber extrato bancário ou fatura: liste as transações identificadas e insira com addTransaction após confirmação.
- Após inserções, avise o usuário para recarregar a página (F5) para ver os dados atualizados.
- Use readFinancialData quando precisar de dados mais recentes para análises.
- Formate respostas longas com Markdown (negrito, listas, seções).`;

  // ── Streaming ─────────────────────────────────────────────────────────────────
  try {
    const result = streamText({
      model: AI_MODEL,
      system: systemPrompt,
      messages: modelMessages,
      tools: buildTools(user.id),
      stopWhen: stepCountIs(12),
      temperature: 0.3,
      onError: (err) => {
        console.error("[ai/chat] stream error:", err);
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[ai/chat] fatal error:", msg);
    if (msg.includes("429") || msg.toLowerCase().includes("quota") || msg.toLowerCase().includes("rate")) {
      return new Response(
        JSON.stringify({ error: "Limite de requisições da API atingido. Tente novamente em alguns instantes." }),
        { status: 429 }
      );
    }
    return new Response(
      JSON.stringify({ error: `Erro ao processar: ${msg}` }),
      { status: 500 }
    );
  }
}
