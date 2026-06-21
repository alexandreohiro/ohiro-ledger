/**
 * Segurança — validação, sanitização e rate limiting para uploads e chamadas de IA.
 * Todas as funções são server-only (não exportar para client components).
 */

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
// Janela de 1 minuto
export const RATE_LIMIT_WINDOW_MS = 60_000;
// Máximo de requisições por janela — rota de IA
export const RATE_LIMIT_MAX_AI = 15;
// Máximo de requisições por janela — actions de mutação
export const RATE_LIMIT_MAX_ACTION = 60;
// Retrocompatibilidade
export const RATE_LIMIT_MAX = RATE_LIMIT_MAX_AI;

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

// ── Rate limiting em memória (por userId) ─────────────────────────────────────
// Em produção, usar Redis/Upstash. Esta implementação é por processo.
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

/**
 * @param key  identificador único, ex: `ai:userId` ou `action:userId`
 * @param max  máximo de requisições por janela (default: RATE_LIMIT_MAX_AI)
 */
export function checkRateLimit(
  key: string,
  max = RATE_LIMIT_MAX_AI,
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: max - 1 };
  }

  if (entry.count >= max) {
    return { allowed: false, remaining: 0 };
  }

  entry.count += 1;
  return { allowed: true, remaining: max - entry.count };
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
