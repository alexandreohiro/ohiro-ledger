/**
 * Definição centralizada de providers de IA disponíveis.
 * Cada provider tem metadados sobre plano gratuito, limites e capacidades.
 */

export type ProviderId = "gemini" | "openai" | "anthropic" | "groq";

export interface AIProviderDef {
  id: ProviderId;
  label: string;
  model: string;
  /** Nome amigável do modelo */
  modelLabel: string;
  /** Descrição curta do plano gratuito */
  freeInfo: string;
  /** Limite mensal estimado de requisições no plano gratuito (null = desconhecido/pago) */
  freeMonthlyRequests: number | null;
  /** Limite diário de requisições no plano gratuito */
  freeDailyRequests: number | null;
  /** Limite diário de tokens (input+output) no plano gratuito */
  freeDailyTokens: number | null;
  /** Suporta envio de imagens/arquivos */
  supportsFiles: boolean;
  /** Nome da env var que habilita este provider */
  envKey: string;
  /** Cor para identificação visual */
  color: string;
  /** true = plano por créditos em USD debitados por token; false = plano free com limite diário */
  billedByCredit: boolean;
  /** Preço oficial do provider em USD por 1M tokens (apenas providers billedByCredit) */
  pricePerMillionTokens?: { input: number; output: number };
}

/** Calcula o custo real em USD de uma chamada, conforme o preço oficial do modelo. */
export function calculateCostUSD(
  providerId: ProviderId,
  inputTokens: number,
  outputTokens: number
): number {
  const def = getProvider(providerId);
  if (!def.pricePerMillionTokens) return 0;
  const { input, output } = def.pricePerMillionTokens;
  return (inputTokens / 1_000_000) * input + (outputTokens / 1_000_000) * output;
}

export const AI_PROVIDERS: AIProviderDef[] = [
  {
    id: "gemini",
    label: "Google Gemini",
    model: "gemini-2.5-flash",
    modelLabel: "Gemini 2.5 Flash",
    freeInfo: "1.500 req/dia · 1M tokens/min (free tier)",
    freeMonthlyRequests: null,
    freeDailyRequests: 1500,
    freeDailyTokens: null,
    supportsFiles: true,
    envKey: "GEMINI_API_KEY",
    color: "hsl(142 58% 44%)", // verde
    billedByCredit: false,
  },
  {
    id: "openai",
    label: "OpenAI",
    model: "gpt-4o-mini",
    modelLabel: "GPT-4o Mini",
    freeInfo: "Plano por créditos — saldo em USD debitado por token",
    freeMonthlyRequests: null,
    freeDailyRequests: null,
    freeDailyTokens: null,
    supportsFiles: true,
    envKey: "OPENAI_API_KEY",
    color: "hsl(220 70% 55%)", // azul
    billedByCredit: true,
    // Preço oficial gpt-4o-mini: $0.15/1M input, $0.60/1M output
    pricePerMillionTokens: { input: 0.15, output: 0.6 },
  },
  {
    id: "anthropic",
    label: "Anthropic",
    model: "claude-haiku-4-5",
    modelLabel: "Claude Haiku 4.5",
    freeInfo: "Plano por créditos — saldo em USD debitado por token",
    freeMonthlyRequests: null,
    freeDailyRequests: null,
    freeDailyTokens: null,
    supportsFiles: true,
    envKey: "ANTHROPIC_API_KEY",
    color: "hsl(28 85% 56%)", // laranja
    billedByCredit: true,
    // Preço oficial Claude Haiku 4.5: $1/1M input, $5/1M output
    pricePerMillionTokens: { input: 1, output: 5 },
  },
  {
    id: "groq",
    label: "Groq",
    model: "llama-3.3-70b-versatile",
    modelLabel: "Llama 3.3 70B",
    freeInfo: "14.400 req/dia · 500K tokens/dia (free tier)",
    freeMonthlyRequests: null,
    freeDailyRequests: 14400,
    freeDailyTokens: 500000,
    supportsFiles: false,
    envKey: "GROQ_API_KEY",
    color: "hsl(280 50% 60%)", // lilás
    billedByCredit: false,
  },
];

export const DEFAULT_PROVIDER_ID: ProviderId = "gemini";

export function getProvider(id: ProviderId): AIProviderDef {
  return AI_PROVIDERS.find((p) => p.id === id) ?? AI_PROVIDERS[0];
}

// ── Tracking de uso local (client-side) ──────────────────────────────────────
// Armazena contagens diárias por provider em localStorage.
// Reset automático no início de cada dia UTC.

const USAGE_KEY = "ohiro_ai_usage_v1";

interface DayUsage {
  date: string; // YYYY-MM-DD UTC
  requests: Record<ProviderId, number>;
  tokens: Record<ProviderId, number>;
}

export function getTodayUsage(): DayUsage {
  if (typeof window === "undefined") return makeEmptyDay();
  try {
    const raw = localStorage.getItem(USAGE_KEY);
    if (!raw) return makeEmptyDay();
    const parsed: DayUsage = JSON.parse(raw);
    if (parsed.date !== todayUTC()) return makeEmptyDay();
    return parsed;
  } catch {
    return makeEmptyDay();
  }
}

export function recordUsage(providerId: ProviderId, tokensUsed = 0) {
  if (typeof window === "undefined") return;
  const usage = getTodayUsage();
  usage.requests[providerId] = (usage.requests[providerId] ?? 0) + 1;
  usage.tokens[providerId] = (usage.tokens[providerId] ?? 0) + tokensUsed;
  localStorage.setItem(USAGE_KEY, JSON.stringify(usage));
}

export function resetUsage() {
  if (typeof window === "undefined") return;
  localStorage.setItem(USAGE_KEY, JSON.stringify(makeEmptyDay()));
}

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

function makeEmptyDay(): DayUsage {
  return {
    date: todayUTC(),
    requests: { gemini: 0, openai: 0, anthropic: 0, groq: 0 },
    tokens: { gemini: 0, openai: 0, anthropic: 0, groq: 0 },
  };
}
