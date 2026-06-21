import { createGoogleGenerativeAI } from "@ai-sdk/google";
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

// Usa @ai-sdk/google diretamente com GEMINI_API_KEY
function getGeminiModel() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY não configurada.");
  const google = createGoogleGenerativeAI({ apiKey });
  return google("gemini-2.5-flash");
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
        limit: z.number().min(1).max(30).default(10),
      }),
      execute: async (input) => {
        try {
          const supabase = await createClient();
          let q = supabase
            .from("transactions")
            .select("id,date,type,category,description,amount,status,account")
            .eq("user_id", userId)
            .order("date", { ascending: false })
            .limit(input.limit);

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
  const systemPrompt = `Você é OHIRO-IA, assistente financeiro pessoal integrado ao Ohiro Ledger.

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
- Ao receber contracheque (imagem/PDF): extraia salário bruto, todos os descontos (INSS, IR, planos) e salário líquido. Insira cada item com addTransaction após mostrar o resumo ao usuário.
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

  // ── Streaming ─────────────────────────────────────────────────────────────────
  try {
    const model = getGeminiModel();
    const result = streamText({
      model,
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
    if (msg.toLowerCase().includes("api key") || msg.toLowerCase().includes("gemini_api_key")) {
      return new Response(
        JSON.stringify({ error: "GEMINI_API_KEY não configurada. Adicione a chave em Vars nas configurações do projeto." }),
        { status: 500 }
      );
    }
    return new Response(
      JSON.stringify({ error: `Erro ao processar: ${msg}` }),
      { status: 500 }
    );
  }
}
