"use client";

import {
  useRef,
  useEffect,
  useState,
  useCallback,
  type ChangeEvent,
  type DragEvent,
} from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Transaction, Investment, Debt } from "@/lib/types";
import { calcFinancialSummary, formatCurrency } from "@/lib/calculations";
import { cn } from "@/lib/utils";
import {
  Bot,
  User,
  Send,
  Sparkles,
  AlertTriangle,
  TrendingUp,
  BarChart3,
  Loader2,
  ChevronDown,
  Paperclip,
  X,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Database,
  PlusCircle,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ── Tipos de arquivo aceitos ──────────────────────────────────────────────────
const ACCEPT_TYPES = "image/jpeg,image/png,image/webp,application/pdf,text/plain,text/csv";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_FILES = 5;

interface AttachedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  base64: string;
  preview?: string; // URL para imagens
}

interface AIViewProps {
  transactions: Transaction[];
  investments: Investment[];
  debts: Debt[];
}

// ── Context builder ───────────────────────────────────────────────────────────
function buildFinancialContext(
  transactions: Transaction[],
  investments: Investment[],
  debts: Debt[]
): string {
  const summary = calcFinancialSummary(transactions, investments);
  const topExpenses = transactions
    .filter((t) => t.type === "Gasto")
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);
  const activeDebts = debts.filter((d) => d.status === "Ativo" || d.status === "Atrasado");

  return [
    "### Resumo Financeiro",
    `- Receitas: ${formatCurrency(summary.totalRevenue)}`,
    `- Gastos: ${formatCurrency(summary.totalExpenses)}`,
    `- Saldo livre: ${formatCurrency(summary.freeBalance)}`,
    `- Total dívidas: ${formatCurrency(summary.totalDebts)}`,
    `- Total investimentos: ${formatCurrency(summary.totalInvestments)}`,
    `- Patrimônio líquido: ${formatCurrency(summary.totalPatrimony)}`,
    `- Comprometimento renda: ${summary.incomeCommitment.toFixed(1)}%`,
    `- Taxa investimento: ${summary.investmentRate.toFixed(1)}%`,
    `- Nível de risco: ${summary.riskLevel}`,
    "",
    "### Top 5 Maiores Gastos",
    ...topExpenses.map(
      (t) => `- ${t.description} (${t.category}): ${formatCurrency(t.amount)} — ${t.date}`
    ),
    "",
    "### Dívidas Ativas",
    ...activeDebts.map(
      (d) =>
        `- ${d.creditor}: ${formatCurrency(d.currentAmount)} | parcela: ${formatCurrency(d.installmentAmount)} | ${(d.interestRate * 100).toFixed(2)}%/mês | prioridade: ${d.priority} | venc: ${d.dueDate ?? "—"}`
    ),
    "",
    "### Carteira de Investimentos",
    ...investments.map(
      (i) =>
        `- ${i.assetName} (${i.class}): ${formatCurrency(i.convertedAmountBRL)} | aporte: ${formatCurrency(i.monthlyContribution)}/mês`
    ),
    "",
    "### Últimos 10 Lançamentos",
    ...transactions
      .slice(0, 10)
      .map((t) => `- [${t.type}] ${t.description}: ${formatCurrency(t.amount)} — ${t.date} (${t.status})`),
  ].join("\n");
}

const QUICK_PROMPTS = [
  {
    icon: AlertTriangle,
    label: "Análise de risco",
    text: "Analise meu nível de risco financeiro atual e quais são os maiores pontos de atenção.",
  },
  {
    icon: TrendingUp,
    label: "Estratégia de dívidas",
    text: "Qual a melhor estratégia para quitar minhas dívidas mais rápido e pagar menos juros?",
  },
  {
    icon: BarChart3,
    label: "Saúde dos investimentos",
    text: "Como está minha carteira de investimentos? Está diversificada? O que posso melhorar?",
  },
  {
    icon: Sparkles,
    label: "Oportunidades de economia",
    text: "Em quais categorias posso cortar despesas para melhorar minha saúde financeira?",
  },
];

// ── Componente principal ───────────────────────────────────────────────────────
export function AIView({ transactions, investments, debts }: AIViewProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [inputValue, setInputValue] = useState("");
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [needsRefresh, setNeedsRefresh] = useState(false);

  const financialContext = buildFinancialContext(transactions, investments, debts);

  const [apiError, setApiError] = useState<string | null>(null);

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/ai/chat",
      prepareSendMessagesRequest: ({ id, messages: msgs }) => ({
        body: {
          id,
          messages: msgs,
          context: financialContext,
          files: attachedFiles.map((f) => ({
            name: f.name,
            type: f.type,
            data: f.base64,
          })),
        },
      }),
    }),
    onError: (err) => {
      const msg = err?.message ?? String(err);
      if (msg.includes("429") || msg.toLowerCase().includes("quota") || msg.toLowerCase().includes("rate")) {
        setApiError("Limite de requisições atingido. Aguarde alguns instantes e tente novamente.");
      } else if (msg.includes("401") || msg.toLowerCase().includes("autenticad")) {
        setApiError("Sessão expirada. Recarregue a página.");
      } else {
        setApiError("Falha na comunicação com a IA. Verifique sua conexão e tente novamente.");
      }
    },
  });

  const isStreaming = status === "streaming" || status === "submitted";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    setShowScrollBtn(scrollHeight - scrollTop - clientHeight > 120);
  }, []);

  // Detecta quando a IA inseriu dados (tool addTransaction, upsertDebt etc.)
  useEffect(() => {
    const lastMsg = messages[messages.length - 1];
    if (!lastMsg || lastMsg.role !== "assistant") return;
    const hasTool = lastMsg.parts?.some(
      (p: { type: string }) =>
        p.type === "tool-invocation"
    );
    if (hasTool) setNeedsRefresh(true);
  }, [messages]);

  // ── File handling ─────────────────────────────────────────────────────────
  async function processFiles(fileList: FileList | File[]) {
    setFileError(null);
    const files = Array.from(fileList);
    if (attachedFiles.length + files.length > MAX_FILES) {
      setFileError(`Máximo de ${MAX_FILES} arquivos por mensagem.`);
      return;
    }

    const newAttached: AttachedFile[] = [];
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        setFileError(`"${file.name}" excede 10 MB.`);
        return;
      }
      const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf", "text/plain", "text/csv"];
      if (!allowedTypes.includes(file.type)) {
        setFileError(`Tipo não suportado: ${file.name}. Use imagem, PDF, TXT ou CSV.`);
        return;
      }

      const base64 = await fileToBase64(file);
      const preview = file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined;
      newAttached.push({
        id: crypto.randomUUID(),
        name: file.name,
        type: file.type,
        size: file.size,
        base64,
        preview,
      });
    }
    setAttachedFiles((prev) => [...prev, ...newAttached]);
  }

  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove "data:type;base64," prefix — envia apenas o dado puro
        resolve(result.split(",")[1] ?? result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function handleFileInput(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files?.length) processFiles(e.target.files);
    e.target.value = "";
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length) processFiles(e.dataTransfer.files);
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave() {
    setIsDragging(false);
  }

  function removeFile(id: string) {
    setAttachedFiles((prev) => {
      const removed = prev.find((f) => f.id === id);
      if (removed?.preview) URL.revokeObjectURL(removed.preview);
      return prev.filter((f) => f.id !== id);
    });
  }

  // ── Send ──────────────────────────────────────────────────────────────────
  function handleSend() {
    const text = inputValue.trim();
    if ((!text && attachedFiles.length === 0) || isStreaming) return;
    const msgText = text || (attachedFiles.length > 0 ? "Analise os arquivos enviados e extraia as informações financeiras relevantes." : "");
    sendMessage({ text: msgText });
    setInputValue("");
    setAttachedFiles([]);
    setFileError(null);
    setApiError(null);
    setNeedsRefresh(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleQuickPrompt(text: string) {
    if (isStreaming) return;
    sendMessage({ text });
  }

  // ── Message text extractor ────────────────────────────────────────────────
  type Part = { type: string; text?: string; toolName?: string; state?: string; result?: unknown };
  function getMessageText(parts: Part[]): string {
    return (parts ?? [])
      .filter((p): p is { type: "text"; text: string } => p.type === "text" && typeof p.text === "string")
      .map((p) => p.text)
      .join("");
  }

  function getToolParts(parts: Part[]): Part[] {
    return (parts ?? []).filter((p) => p.type === "tool-invocation");
  }

  return (
    <div
      className={cn(
        "flex flex-col h-[calc(100vh-3.5rem)] relative",
        isDragging && "ring-2 ring-primary ring-inset"
      )}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      {/* Drag overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-background/80 backdrop-blur-sm pointer-events-none">
          <div className="flex items-center justify-center size-16 rounded-2xl bg-primary/10 border-2 border-dashed border-primary/40">
            <Paperclip className="size-7 text-primary" />
          </div>
          <p className="text-sm font-mono font-semibold text-primary">Solte os arquivos aqui</p>
          <p className="text-xs font-mono text-muted-foreground">Imagens, PDF, TXT, CSV — máx 10 MB cada</p>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border/40 bg-card/30 backdrop-blur-sm shrink-0">
        <div className="flex items-center justify-center size-8 rounded-md bg-primary/10 border border-primary/20">
          <Bot className="size-4 text-primary" />
        </div>
        <div>
          <h1 className="text-sm font-bold font-mono text-foreground tracking-wide">OHIRO-IA</h1>
          <p className="text-[11px] font-mono text-muted-foreground tracking-widest">
            ASSISTENTE FINANCEIRO · MULTIMODAL
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {/* Refresh hint quando IA inseriu dados */}
          {needsRefresh && (
            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-1.5 text-[10px] font-mono px-2.5 py-1 rounded-md border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 transition-colors animate-pulse"
            >
              <RefreshCw className="size-3" />
              Recarregar dados
            </button>
          )}
          <div className="flex items-center gap-1.5 text-[10px] font-mono px-2 py-1 rounded border border-border/40">
            <ShieldCheck className="size-3 text-muted-foreground/60" />
            <span className="text-muted-foreground/60">Dados criptografados</span>
          </div>
          <div
            className={cn(
              "flex items-center gap-1.5 text-[10px] font-mono px-2 py-1 rounded border",
              isStreaming
                ? "text-primary border-primary/30 bg-primary/10"
                : "text-muted-foreground border-border/40"
            )}
          >
            <div className={cn("size-1.5 rounded-full", isStreaming ? "bg-primary animate-pulse" : "bg-muted-foreground/40")} />
            {isStreaming ? "PROCESSANDO" : "AGUARDANDO"}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-6 flex flex-col gap-5"
      >
        {messages.length === 0 ? (
          <WelcomeState onPrompt={handleQuickPrompt} isStreaming={isStreaming} />
        ) : (
          messages.map((msg) => {
            const parts = (msg.parts ?? []) as Part[];
            const text = getMessageText(parts);
            const toolParts = getToolParts(parts);
            const isUser = msg.role === "user";

            if (!text && toolParts.length === 0) return null;

            return (
              <div key={msg.id} className={cn("flex gap-3", isUser ? "ml-auto flex-row-reverse max-w-xl" : "max-w-3xl")}>
                <div
                  className={cn(
                    "flex items-center justify-center size-7 rounded-md shrink-0 mt-0.5 border",
                    isUser
                      ? "bg-muted/40 border-border/40"
                      : "bg-primary/10 border-primary/20"
                  )}
                >
                  {isUser ? (
                    <User className="size-3.5 text-muted-foreground" />
                  ) : (
                    <Bot className="size-3.5 text-primary" />
                  )}
                </div>

                <div className="flex flex-col gap-2 min-w-0">
                  {/* Tool invocations */}
                  {toolParts.map((tp, i) => (
                    <ToolCard key={i} part={tp} />
                  ))}
                  {/* Text bubble */}
                  {text && (
                    <div
                      className={cn(
                        "rounded-xl px-4 py-3 text-xs font-mono leading-relaxed border",
                        isUser
                          ? "bg-muted/30 border-border/30 text-foreground"
                          : "bg-card/60 border-border/40 text-foreground"
                      )}
                    >
                      <MarkdownText text={text} />
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* API error banner */}
        {apiError && (
          <div className="flex items-start gap-3 max-w-3xl">
            <div className="flex items-center justify-center size-7 rounded-md shrink-0 mt-0.5 border bg-destructive/10 border-destructive/25">
              <AlertTriangle className="size-3.5 text-destructive" />
            </div>
            <div className="flex items-center justify-between gap-3 flex-1 rounded-xl px-4 py-3 bg-destructive/5 border border-destructive/20 text-xs font-mono text-destructive">
              <span>{apiError}</span>
              <button onClick={() => setApiError(null)} aria-label="Fechar erro" className="shrink-0 hover:opacity-70 transition-opacity">
                <X className="size-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Streaming dots */}
        {isStreaming && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex gap-3 max-w-3xl">
            <div className="flex items-center justify-center size-7 rounded-md shrink-0 mt-0.5 border bg-primary/10 border-primary/20">
              <Bot className="size-3.5 text-primary" />
            </div>
            <div className="rounded-xl px-4 py-3 bg-card/60 border border-border/40">
              <div className="flex gap-1 items-center">
                <div className="size-1.5 rounded-full bg-primary animate-bounce [animation-delay:0ms]" />
                <div className="size-1.5 rounded-full bg-primary animate-bounce [animation-delay:150ms]" />
                <div className="size-1.5 rounded-full bg-primary animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Scroll button */}
      {showScrollBtn && (
        <button
          onClick={() => bottomRef.current?.scrollIntoView({ behavior: "smooth" })}
          className="absolute bottom-28 right-6 flex items-center justify-center size-8 rounded-full bg-card border border-border/60 text-muted-foreground hover:text-foreground shadow-lg transition-all z-10"
          aria-label="Rolar para o final"
        >
          <ChevronDown className="size-4" />
        </button>
      )}

      {/* Input area */}
      <div className="shrink-0 border-t border-border/40 bg-card/30 backdrop-blur-sm px-4 py-3">
        {/* Quick prompts strip */}
        {messages.length > 0 && (
          <div className="flex gap-2 mb-3 overflow-x-auto pb-1 scrollbar-none">
            {QUICK_PROMPTS.map((p) => {
              const Icon = p.icon;
              return (
                <button
                  key={p.label}
                  onClick={() => handleQuickPrompt(p.text)}
                  disabled={isStreaming}
                  className="flex items-center gap-1.5 shrink-0 text-[10px] font-mono px-2.5 py-1.5 rounded-md border border-border/40 bg-card/40 hover:border-primary/40 hover:text-primary hover:bg-primary/5 text-muted-foreground transition-all disabled:opacity-40"
                >
                  <Icon className="size-3 shrink-0" />
                  {p.label}
                </button>
              );
            })}
          </div>
        )}

        {/* File error */}
        {fileError && (
          <div className="flex items-center gap-2 mb-2 px-3 py-2 rounded-md bg-destructive/10 border border-destructive/25 text-destructive text-[11px] font-mono">
            <AlertTriangle className="size-3.5 shrink-0" />
            {fileError}
            <button onClick={() => setFileError(null)} className="ml-auto">
              <X className="size-3" />
            </button>
          </div>
        )}

        {/* Attached files preview */}
        {attachedFiles.length > 0 && (
          <div className="flex gap-2 mb-2 flex-wrap">
            {attachedFiles.map((f) => (
              <div
                key={f.id}
                className="flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-lg border border-border/40 bg-muted/20 text-[10px] font-mono text-muted-foreground max-w-[160px] group"
              >
                {f.preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={f.preview} alt={f.name} className="size-5 rounded object-cover shrink-0" />
                ) : f.type === "application/pdf" ? (
                  <FileText className="size-4 text-destructive/70 shrink-0" />
                ) : (
                  <FileText className="size-4 text-muted-foreground/60 shrink-0" />
                )}
                <span className="truncate">{f.name}</span>
                <button
                  onClick={() => removeFile(f.id)}
                  aria-label={`Remover ${f.name}`}
                  className="ml-1 hover:text-foreground transition-colors shrink-0"
                >
                  <X className="size-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Textarea row */}
        <div className="flex gap-2 items-end">
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT_TYPES}
            multiple
            className="sr-only"
            onChange={handleFileInput}
            aria-label="Anexar arquivo"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isStreaming || attachedFiles.length >= MAX_FILES}
            aria-label="Anexar arquivo"
            className={cn(
              "flex items-center justify-center size-10 shrink-0 rounded-lg border transition-colors",
              attachedFiles.length > 0
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border/50 bg-background/60 text-muted-foreground hover:text-foreground hover:border-border",
              "disabled:opacity-40"
            )}
          >
            <Paperclip className="size-4" />
          </button>

          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Pergunte, envie um contracheque, extrato ou fatura… (Enter para enviar)"
            rows={1}
            disabled={isStreaming}
            className="flex-1 resize-none min-h-[40px] max-h-[120px] rounded-lg border border-border/50 bg-background/60 px-3 py-2.5 text-xs font-mono text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 disabled:opacity-50 transition-all leading-relaxed"
            style={{ height: "40px" }}
            onInput={(e) => {
              const t = e.target as HTMLTextAreaElement;
              t.style.height = "40px";
              t.style.height = `${Math.min(t.scrollHeight, 120)}px`;
            }}
          />

          <Button
            size="sm"
            onClick={handleSend}
            disabled={(!inputValue.trim() && attachedFiles.length === 0) || isStreaming}
            className="size-10 shrink-0 p-0"
            aria-label="Enviar mensagem"
          >
            {isStreaming ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          </Button>
        </div>

        <p className="text-[10px] font-mono text-muted-foreground/40 text-center mt-2">
          Vercel AI Gateway · Gemini 2.0 Flash · Dados inseridos diretamente no seu ledger · Arraste arquivos para a tela
        </p>
      </div>
    </div>
  );
}

// ── Tool card — exibe status de execução de tools ─────────────────────────────
function ToolCard({ part }: { part: { type: string; toolName?: string; state?: string; result?: unknown } }) {
  const toolLabels: Record<string, { label: string; icon: React.ElementType }> = {
    addTransaction: { label: "Registrando lançamento", icon: PlusCircle },
    upsertDebt: { label: "Registrando dívida", icon: PlusCircle },
    upsertInvestment: { label: "Registrando investimento", icon: PlusCircle },
    readFinancialData: { label: "Lendo dados financeiros", icon: Database },
  };

  const info = toolLabels[part.toolName ?? ""] ?? { label: part.toolName ?? "Tool", icon: Database };
  const Icon = info.icon;
  const isDone = part.state === "output-available" || part.state === "output-error";
  const isError = part.state === "output-error";
  const result = part.result as { success?: boolean; message?: string; error?: string } | undefined;

  return (
    <div
      className={cn(
        "flex items-center gap-2.5 px-3 py-2 rounded-lg border text-[10px] font-mono",
        isError
          ? "border-destructive/30 bg-destructive/5 text-destructive"
          : isDone && result?.success
          ? "border-primary/25 bg-primary/5 text-primary"
          : isDone
          ? "border-border/40 bg-muted/20 text-muted-foreground"
          : "border-border/40 bg-muted/20 text-muted-foreground"
      )}
    >
      <div className="shrink-0">
        {!isDone ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : isError || result?.success === false ? (
          <XCircle className="size-3.5 text-destructive" />
        ) : (
          <CheckCircle2 className="size-3.5 text-primary" />
        )}
      </div>
      <Icon className="size-3.5 shrink-0 opacity-70" />
      <span>
        {!isDone ? info.label + "…" : result?.message ?? result?.error ?? info.label}
      </span>
    </div>
  );
}

// ── Welcome state ─────────────────────────────────────────────────────────────
function WelcomeState({
  onPrompt,
  isStreaming,
}: {
  onPrompt: (text: string) => void;
  isStreaming: boolean;
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-8 py-12">
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center size-16 rounded-2xl bg-primary/10 border border-primary/20 mx-auto mb-4">
          <Sparkles className="size-7 text-primary" />
        </div>
        <h2 className="text-base font-bold font-mono text-foreground">OHIRO-IA</h2>
        <p className="text-xs font-mono text-muted-foreground max-w-sm leading-relaxed">
          Assistente financeiro com acesso direto ao seu ledger. Envie arquivos, fotos de
          contracheques, extratos ou faturas — a IA extrai e registra tudo automaticamente.
        </p>
        <div className="flex items-center justify-center gap-4 mt-3">
          {[
            { icon: ImageIcon, label: "Contracheques" },
            { icon: FileText, label: "Extratos" },
            { icon: FileText, label: "Faturas" },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground/60">
              <Icon className="size-3" />
              {label}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-xl">
        {QUICK_PROMPTS.map((prompt) => {
          const Icon = prompt.icon;
          return (
            <button
              key={prompt.label}
              onClick={() => onPrompt(prompt.text)}
              disabled={isStreaming}
              className="flex items-start gap-3 p-3 rounded-lg border border-border/40 bg-card/40 hover:bg-card/80 hover:border-primary/30 transition-all text-left group disabled:opacity-40"
            >
              <div className="flex items-center justify-center size-7 rounded-md bg-primary/10 border border-primary/15 shrink-0 mt-0.5 group-hover:bg-primary/20 transition-colors">
                <Icon className="size-3.5 text-primary" />
              </div>
              <div>
                <div className="text-xs font-mono font-semibold text-foreground leading-tight">
                  {prompt.label}
                </div>
                <div className="text-[11px] font-mono text-muted-foreground leading-relaxed mt-0.5 line-clamp-2">
                  {prompt.text}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Markdown renderer ─────────────────────────────────────────────────────────
function MarkdownText({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        if (line.startsWith("### "))
          return <div key={i} className="font-bold text-foreground mt-2 first:mt-0">{renderInline(line.slice(4))}</div>;
        if (line.startsWith("## "))
          return <div key={i} className="font-bold text-sm text-foreground mt-2 first:mt-0">{renderInline(line.slice(3))}</div>;
        if (line.startsWith("# "))
          return <div key={i} className="font-bold text-sm text-foreground mt-2 first:mt-0">{renderInline(line.slice(2))}</div>;
        if (line.startsWith("- ") || line.startsWith("* "))
          return (
            <div key={i} className="flex gap-1.5">
              <span className="text-primary mt-[2px] shrink-0">·</span>
              <span>{renderInline(line.slice(2))}</span>
            </div>
          );
        if (/^\d+\. /.test(line)) {
          const num = line.match(/^(\d+)\. /)?.[1];
          return (
            <div key={i} className="flex gap-1.5">
              <span className="text-primary shrink-0 tabular-nums">{num}.</span>
              <span>{renderInline(line.replace(/^\d+\. /, ""))}</span>
            </div>
          );
        }
        if (line === "---") return <hr key={i} className="border-border/30 my-1" />;
        if (!line.trim()) return <div key={i} className="h-1" />;
        return <div key={i}>{renderInline(line)}</div>;
      })}
    </div>
  );
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**"))
      return <strong key={i} className="font-bold text-foreground">{part.slice(2, -2)}</strong>;
    if (part.startsWith("`") && part.endsWith("`"))
      return <code key={i} className="px-1 rounded bg-muted/50 text-primary/90">{part.slice(1, -1)}</code>;
    return part;
  });
}
