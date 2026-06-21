import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  validateFileType,
  validateFileSize,
  sanitizeMessage,
  checkRateLimit,
  extractTextFromParts,
  MAX_FILE_SIZE_BYTES,
  RATE_LIMIT_MAX_AI,
  RATE_LIMIT_MAX_ACTION,
  RATE_LIMIT_WINDOW_MS,
} from "@/lib/security";

// ── validateFileType ──────────────────────────────────────────────────────────

describe("validateFileType", () => {
  it.each([
    ["image/jpeg", "photo.jpg"],
    ["image/jpeg", "photo.jpeg"],
    ["image/png", "image.png"],
    ["image/webp", "img.webp"],
    ["image/gif", "anim.gif"],
    ["application/pdf", "extrato.pdf"],
    ["text/plain", "notas.txt"],
    ["text/csv", "planilha.csv"],
  ])("aceita %s / %s", (mime, filename) => {
    expect(validateFileType(mime, filename)).toBe(true);
  });

  it.each([
    ["application/javascript", "script.js"],
    ["text/html", "page.html"],
    ["application/zip", "archive.zip"],
    ["image/svg+xml", "image.svg"],
    ["application/exe", "malware.exe"],
  ])("rejeita %s / %s", (mime, filename) => {
    expect(validateFileType(mime, filename)).toBe(false);
  });

  it("rejeita quando MIME é válido mas extensão não é", () => {
    expect(validateFileType("image/jpeg", "photo.exe")).toBe(false);
  });

  it("rejeita quando extensão é válida mas MIME não é", () => {
    expect(validateFileType("application/octet-stream", "photo.jpg")).toBe(false);
  });

  it("aceita extensão em maiúsculas (case insensitive)", () => {
    expect(validateFileType("image/jpeg", "PHOTO.JPG")).toBe(true);
  });
});

// ── validateFileSize ──────────────────────────────────────────────────────────

describe("validateFileSize", () => {
  it("aceita tamanho dentro do limite", () => {
    expect(validateFileSize(1)).toBe(true);
    expect(validateFileSize(1024)).toBe(true);
    expect(validateFileSize(MAX_FILE_SIZE_BYTES)).toBe(true);
  });

  it("rejeita tamanho zero", () => {
    expect(validateFileSize(0)).toBe(false);
  });

  it("rejeita tamanho negativo", () => {
    expect(validateFileSize(-1)).toBe(false);
  });

  it("rejeita acima do limite (10 MB + 1 byte)", () => {
    expect(validateFileSize(MAX_FILE_SIZE_BYTES + 1)).toBe(false);
  });

  it("MAX_FILE_SIZE_BYTES é exatamente 10 MB", () => {
    expect(MAX_FILE_SIZE_BYTES).toBe(10 * 1024 * 1024);
  });
});

// ── sanitizeMessage ───────────────────────────────────────────────────────────

describe("sanitizeMessage", () => {
  it("remove null bytes", () => {
    expect(sanitizeMessage("hello\0world")).toBe("helloworld");
  });

  it("remove caracteres de controle (exceto \\n \\r \\t)", () => {
    const msg = "text\x01\x08\x0b\x0c\x0e\x1fend";
    expect(sanitizeMessage(msg)).toBe("textend");
  });

  it("preserva quebras de linha e tab", () => {
    const msg = "linha1\nlinha2\ttab\rlinha3";
    expect(sanitizeMessage(msg)).toBe("linha1\nlinha2\ttab\rlinha3");
  });

  it("trunca para o maxLength padrão (4000)", () => {
    const long = "a".repeat(5000);
    const result = sanitizeMessage(long);
    expect(result).toHaveLength(4000);
  });

  it("respeita maxLength personalizado", () => {
    const result = sanitizeMessage("abcde", 3);
    expect(result).toBe("abc");
  });

  it("faz trim de espaços nas bordas", () => {
    expect(sanitizeMessage("  hello  ")).toBe("hello");
  });

  it("string vazia retorna vazio", () => {
    expect(sanitizeMessage("")).toBe("");
  });

  it("texto limpo sem alterações", () => {
    const msg = "Receita de R$ 5.000 em junho/2025";
    expect(sanitizeMessage(msg)).toBe(msg);
  });
});

// ── checkRateLimit ────────────────────────────────────────────────────────────

describe("checkRateLimit", () => {
  // Cada teste usa chave única para isolamento (sem reset do Map entre testes)

  it("primeira requisição é permitida", () => {
    const key = `test-first-${crypto.randomUUID()}`;
    const { allowed, remaining } = checkRateLimit(key, 5);
    expect(allowed).toBe(true);
    expect(remaining).toBe(4);
  });

  it("permite até o limite máximo", () => {
    const key = `test-max-${crypto.randomUUID()}`;
    const max = 3;
    for (let i = 0; i < max; i++) {
      const { allowed } = checkRateLimit(key, max);
      expect(allowed).toBe(true);
    }
  });

  it("bloqueia após atingir o limite", () => {
    const key = `test-block-${crypto.randomUUID()}`;
    const max = 2;
    checkRateLimit(key, max);
    checkRateLimit(key, max);
    const { allowed, remaining } = checkRateLimit(key, max);
    expect(allowed).toBe(false);
    expect(remaining).toBe(0);
  });

  it("usa RATE_LIMIT_MAX_AI como padrão", () => {
    const key = `test-default-${crypto.randomUUID()}`;
    const { remaining } = checkRateLimit(key);
    expect(remaining).toBe(RATE_LIMIT_MAX_AI - 1);
  });

  it("namespaces distintos são independentes", () => {
    const base = crypto.randomUUID();
    const keyA = `ai:${base}`;
    const keyB = `action:${base}`;
    checkRateLimit(keyA, 1);
    checkRateLimit(keyA, 1); // deve bloquear keyA
    const resA = checkRateLimit(keyA, 1);
    const resB = checkRateLimit(keyB, 5); // keyB ainda livre
    expect(resA.allowed).toBe(false);
    expect(resB.allowed).toBe(true);
  });

  it("RATE_LIMIT_MAX_AI é 15", () => {
    expect(RATE_LIMIT_MAX_AI).toBe(15);
  });

  it("RATE_LIMIT_MAX_ACTION é 60", () => {
    expect(RATE_LIMIT_MAX_ACTION).toBe(60);
  });

  it("RATE_LIMIT_WINDOW_MS é 60 segundos", () => {
    expect(RATE_LIMIT_WINDOW_MS).toBe(60_000);
  });
});

// ── extractTextFromParts ──────────────────────────────────────────────────────

describe("extractTextFromParts", () => {
  it("extrai texto de partes do tipo text", () => {
    const parts = [
      { type: "text", text: "Olá " },
      { type: "text", text: "mundo" },
    ];
    expect(extractTextFromParts(parts)).toBe("Olá mundo");
  });

  it("ignora partes que não são text", () => {
    const parts = [
      { type: "image_url", url: "https://example.com/img.png" },
      { type: "text", text: "apenas este" },
      { type: "file", data: "base64..." },
    ];
    expect(extractTextFromParts(parts)).toBe("apenas este");
  });

  it("retorna string vazia para lista vazia", () => {
    expect(extractTextFromParts([])).toBe("");
  });

  it("ignora partes text sem propriedade text", () => {
    const parts = [
      { type: "text" }, // sem .text
      { type: "text", text: "válido" },
    ];
    expect(extractTextFromParts(parts)).toBe("válido");
  });

  it("concatena sem separador", () => {
    const parts = [
      { type: "text", text: "A" },
      { type: "text", text: "B" },
      { type: "text", text: "C" },
    ];
    expect(extractTextFromParts(parts)).toBe("ABC");
  });
});
