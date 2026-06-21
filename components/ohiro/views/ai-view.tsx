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
  ChevronRight,
  Cpu,
  Activity,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AI_PROVIDERS,
  type ProviderId,
  type AIProviderDef,
  DEFAULT_PROVIDER_ID,
  getTodayUsage,
  recordUsage,
} from "@/lib/ai-providers";

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

  // Agrupa gastos por categoria
  const byCategory: Record<string, number> = {};
  transactions
    .filter((t) => t.type === "Gasto")
    .forEach((t) => { byCategory[t.category] = (byCategory[t.category] ?? 0) + t.amount; });
  const topCategories = Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  return [
    "### Resumo Financeiro Atual",
    `- Receitas totais: ${formatCurrency(summary.totalRevenue)}`,
    `- Gastos totais: ${formatCurrency(summary.totalExpenses)}`,
    `- Saldo livre: ${formatCurrency(summary.freeBalance)}`,
    `- Total dívidas ativas: ${formatCurrency(summary.totalDebts)}`,
    `- Total investimentos: ${formatCurrency(summary.totalInvestments)}`,
    `- Patrimônio líquido: ${formatCurrency(summary.totalPatrimony)}`,
    `- Comprometimento da renda: ${summary.incomeCommitment.toFixed(1)}%`,
    `- Taxa de investimento: ${summary.investmentRate.toFixed(1)}%`,
    `- Nível de risco: ${summary.riskLevel}`,
    `- Total de lançamentos: ${transactions.length}`,
    "",
    "### Gastos por Categoria (maiores)",
    ...topCategories.map(([cat, val]) => `- ${cat}: ${formatCurrency(val)}`),
    "",
    "### Top 5 Maiores Gastos (com IDs para edição)",
    ...topExpenses.map(
      (t) => `- ID:${t.id} | ${t.description} (${t.category}): ${formatCurrency(t.amount)} — ${t.date} — ${t.status}`
    ),
    "",
    "### Dívidas Ativas (com IDs para edição)",
    ...activeDebts.map(
      (d) =>
        `- ID:${d.id} | ${d.creditor}: saldo ${formatCurrency(d.currentAmount)} | parcela ${formatCurrency(d.installmentAmount)} | ${d.interestRate.toFixed(2)}%/mês | prioridade: ${d.priority} | venc: ${d.dueDate ?? "—"}`
    ),
    "",
    "### Carteira de Investimentos",
    ...investments.map(
      (i) =>
        `- ${i.assetName} (${i.class}): ${formatCurrency(i.convertedAmountBRL)} | aporte: ${formatCurrency(i.monthlyContribution)}/mês`
    ),
    "",
    "### Últimos 15 Lançamentos (com IDs para edição)",
    ...transactions
      .slice(0, 15)
      .map((t) => `- ID:${t.id} | [${t.type}] ${t.description} (${t.category}): ${formatCurrency(t.amount)} — ${t.date} — ${t.status}`),
  ].join("\n");
}

const QUICK_PROMPTS = [
  {
    icon: AlertTriangle,
    label: "Análise de risco",
    text: "Leia meus dados atuais e analise meu nível de risco financeiro. Quais são os maiores pontos de atenção?",
  },
  {
    icon: TrendingUp,
    label: "Estratégia de dívidas",
    text: "Quais dívidas devo priorizar para quitar primeiro? Calcule o custo total de cada uma e sugira uma ordem de pagamento.",
  },
  {
    icon: BarChart3,
    label: "Resumo do mês",
    text: "Faça um resumo completo do mês atual: receitas, gastos por categoria, saldo livre e comparação com o que é ideal.",
  },
  {
    icon: Sparkles,
    label: "Onde economizar",
    text: "Analise meus gastos e aponte as 3 categorias onde estou gastando mais do que deveria, com sugestões práticas de corte.",
  },
  {
    icon: Database,
    label: "Listar lançamentos",
    text: "Liste meus últimos 20 lançamentos com ID, data, descrição e valor para eu poder revisar.",
  },
  {
    icon: PlusCircle,
    label: "Registrar contracheque",
    text: "Quero registrar meu contracheque. Me diga quais informações preciso fornecer ou envie a imagem diretamente.",
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
  // Guarda os arquivos enviados por ID da mensagem para exibi-los na bolha
  const [sentFilesMap, setSentFilesMap] = useState<Record<string, AttachedFile[]>>({});
  const [isDragging, setIsDragging] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [needsRefresh, setNeedsRefresh] = useState(false);

  // Provider selecionado e painel de troca
  const [selectedProvider, setSelectedProvider] = useState<ProviderId>(DEFAULT_PROVIDER_ID);
  const [showProviderPanel, setShowProviderPanel] = useState(false);
  // Uso diário rastreado localmente
  const [todayUsage, setTodayUsage] = useState(() => getTodayUsage());

  const financialContext = buildFinancialContext(transactions, investments, debts);

  // Ref para capturar os arquivos pendentes no momento do envio
  const pendingFilesRef = useRef<AttachedFile[]>([]);
  // Ref com arquivos aguardando ser associados à próxima mensagem do usuário
  const nextMsgFilesRef = useRef<AttachedFile[]>([]);

  // useChat cria a instância de chat (e o transport) apenas uma vez no mount,
  // então prepareSendMessagesRequest fica com um closure "congelado". Refs
  // garantem que cada envio use o provider e o contexto financeiro atuais.
  const selectedProviderRef = useRef(selectedProvider);
  selectedProviderRef.current = selectedProvider;
  const financialContextRef = useRef(financialContext);
  financialContextRef.current = financialContext;

  const [apiError, setApiError] = useState<string | null>(null);

  const { messages, sendMessage, status, stop, regenerate } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/ai/chat",
      prepareSendMessagesRequest: ({ id, messages: msgs }) => ({
        body: {
          id,
          messages: msgs,
          context: financialContextRef.current,
          provider: selectedProviderRef.current,
          files: pendingFilesRef.current.map((f) => ({
            name: f.name,
            type: f.type,
            data: f.base64,
          })),
        },
      }),
    }),
    onError: (err) => {
      const msg = err?.message ?? String(err);
      const lower = msg.toLowerCase();
      if (lower.includes("429") || lower.includes("quota") || lower.includes("rate")) {
        setApiError("Limite de requisições atingido. Aguarde alguns instantes ou troque de modelo.");
      } else if (msg.includes("401") || lower.includes("autenticad")) {
        setApiError("Sessão expirada. Recarregue a página.");
      } else if (lower.includes("não suporta") || lower.includes("não configurada")) {
        // Mensagens já vêm em português e específicas do servidor (ex: provider sem
        // suporte a arquivos, API key ausente) — mostra direto, sem genericizar.
        setApiError(msg);
      } else if (lower.includes("failed to fetch") || lower.includes("network")) {
        setApiError("Sem conexão com o servidor. Verifique sua internet e tente novamente.");
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
      (p: { type: string }) => p.type === "tool-invocation"
    );
    if (hasTool) setNeedsRefresh(true);
  }, [messages]);

  // Quando uma nova mensagem do usuário aparecer e houver arquivos pendentes, associa
  useEffect(() => {
    if (nextMsgFilesRef.current.length === 0) return;
    const userMsgs = messages.filter((m) => m.role === "user");
    if (userMsgs.length === 0) return;
    const lastUser = userMsgs[userMsgs.length - 1];
    setSentFilesMap((prev) => {
      if (prev[lastUser.id]) return prev; // já associado
      const files = nextMsgFilesRef.current;
      nextMsgFilesRef.current = [];
      return { ...prev, [lastUser.id]: files };
    });
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
    const msgText = text || "Analise os arquivos enviados e extraia as informações financeiras relevantes.";

    // Captura os arquivos em duas refs: uma para o body da request, outra para a UI
    const snapshot = [...attachedFiles];
    pendingFilesRef.current = snapshot;
    if (snapshot.length > 0) {
      nextMsgFilesRef.current = snapshot; // será associado via useEffect quando a msg aparecer
    }

    sendMessage({ text: msgText });

    // Registra +1 requisição local para o provider selecionado
    recordUsage(selectedProvider);
    setTodayUsage(getTodayUsage());

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
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/40 bg-card/30 backdrop-blur-sm shrink-0">
        <div className="flex items-center justify-center size-8 rounded-md bg-primary/10 border border-primary/20 shrink-0">
          <Bot className="size-4 text-primary" />
        </div>
        <div className="min-w-0">
          <h1 className="text-sm font-bold font-mono text-foreground tracking-wide">OHIRO-IA</h1>
          <p className="text-[10px] font-mono text-muted-foreground tracking-widest truncate">
            ASSISTENTE FINANCEIRO · MULTIMODAL
          </p>
        </div>

        <div className="ml-auto flex items-center gap-2 shrink-0">
          {needsRefresh && (
            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-1.5 text-[10px] font-mono px-2.5 py-1 rounded-md border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 transition-colors animate-pulse"
            >
              <RefreshCw className="size-3" />
              Recarregar
            </button>
          )}

          {/* Botão seletor de provider */}
          <button
            onClick={() => setShowProviderPanel((v) => !v)}
            className={cn(
              "flex items-center gap-1.5 text-[10px] font-mono px-2.5 py-1.5 rounded-md border transition-all",
              showProviderPanel
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border/50 bg-card/40 text-muted-foreground hover:text-foreground hover:border-border/80"
            )}
            aria-label="Selecionar modelo de IA"
          >
            <Cpu className="size-3 shrink-0" />
            <span className="hidden sm:inline">{AI_PROVIDERS.find((p) => p.id === selectedProvider)?.modelLabel}</span>
            <ChevronRight className={cn("size-3 transition-transform", showProviderPanel && "rotate-90")} />
          </button>

          <div className="flex items-center gap-1.5 text-[10px] font-mono px-2 py-1 rounded border border-border/40">
            <ShieldCheck className="size-3 text-muted-foreground/60" />
            <span className="text-muted-foreground/60 hidden sm:inline">Criptografado</span>
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
            <span className="hidden sm:inline">{isStreaming ? "PROCESSANDO" : "AGUARDANDO"}</span>
          </div>
        </div>
      </div>

      {/* Painel de seleção de provider */}
      {showProviderPanel && (
        <ProviderPanel
          providers={AI_PROVIDERS}
          selected={selectedProvider}
          todayUsage={todayUsage}
          onSelect={(id) => {
            setSelectedProvider(id);
            setShowProviderPanel(false);
          }}
          onClose={() => setShowProviderPanel(false)}
        />
      )}

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

                  {/* Arquivos anexados (apenas mensagens do usuário) */}
                  {isUser && sentFilesMap[msg.id]?.length > 0 && (
                    <div className="flex gap-2 flex-wrap justify-end">
                      {sentFilesMap[msg.id].map((f) => (
                        <FileThumbnail key={f.id} file={f} />
                      ))}
                    </div>
                  )}

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
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => {
                    setApiError(null);
                    regenerate();
                  }}
                  aria-label="Tentar novamente"
                  className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-md border border-destructive/30 hover:bg-destructive/10 transition-colors"
                >
                  <RefreshCw className="size-3" />
                  Tentar de novo
                </button>
                <button onClick={() => setApiError(null)} aria-label="Fechar erro" className="hover:opacity-70 transition-opacity">
                  <X className="size-3.5" />
                </button>
              </div>
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

        {/* Attached files preview — sempre com miniatura, estilo Claude Code */}
        {attachedFiles.length > 0 && (
          <div className="flex gap-2 mb-2 flex-wrap">
            {attachedFiles.map((f) => (
              <FileThumbnail key={f.id} file={f} onRemove={() => removeFile(f.id)} />
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

          {isStreaming ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => stop()}
              className="size-10 shrink-0 p-0 border-destructive/40 text-destructive hover:bg-destructive/10"
              aria-label="Parar resposta"
            >
              <XCircle className="size-4" />
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handleSend}
              disabled={!inputValue.trim() && attachedFiles.length === 0}
              className="size-10 shrink-0 p-0"
              aria-label="Enviar mensagem"
            >
              <Send className="size-4" />
            </Button>
          )}
        </div>

        {(() => {
          const prov = AI_PROVIDERS.find((p) => p.id === selectedProvider)!;
          const usage = todayUsage.requests[selectedProvider] ?? 0;
          const limit = prov.freeDailyRequests;
          return (
            <p className="text-[10px] font-mono text-muted-foreground/40 text-center mt-2">
              {prov.label} · {prov.modelLabel}
              {limit != null && (
                <> · <span className={cn(usage / limit > 0.8 ? "text-destructive/50" : "")}>
                  {usage}/{limit} req hoje
                </span></>
              )}
              {!limit && <> · pago por token</>}
              {" · "}Arraste arquivos para a tela
            </p>
          );
        })()}
      </div>
    </div>
  );
}

// ── Provider Panel ────────────────────────────────────────────────────────────
interface ProviderPanelProps {
  providers: AIProviderDef[];
  selected: ProviderId;
  todayUsage: ReturnType<typeof getTodayUsage>;
  onSelect: (id: ProviderId) => void;
  onClose: () => void;
}

function ProviderPanel({ providers, selected, todayUsage, onSelect, onClose }: ProviderPanelProps) {
  return (
    <div className="shrink-0 border-b border-border/40 bg-card/50 backdrop-blur-sm px-4 py-3">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Cpu className="size-3.5 text-muted-foreground" />
          <span className="text-[11px] font-mono font-semibold text-foreground tracking-wide">
            MODELO DE IA
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-muted-foreground/60 hover:text-foreground transition-colors"
          aria-label="Fechar painel"
        >
          <X className="size-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {providers.map((prov) => {
          const isSelected = prov.id === selected;
          const usage = todayUsage.requests[prov.id] ?? 0;
          const limit = prov.freeDailyRequests;
          const usagePct = limit ? Math.min(usage / limit, 1) : 0;
          const isNearLimit = limit != null && usagePct > 0.8;
          const isAtLimit = limit != null && usage >= limit;

          return (
            <button
              key={prov.id}
              onClick={() => !isAtLimit && onSelect(prov.id)}
              disabled={isAtLimit}
              className={cn(
                "flex flex-col gap-2 p-3 rounded-lg border text-left transition-all",
                isSelected
                  ? "border-primary/50 bg-primary/8"
                  : isAtLimit
                  ? "border-border/30 bg-muted/10 opacity-50 cursor-not-allowed"
                  : "border-border/40 bg-card/40 hover:border-border/80 hover:bg-card/70"
              )}
              aria-pressed={isSelected}
            >
              {/* Linha 1: nome + badge selecionado */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {/* Dot colorido do provider */}
                  <span
                    className="size-2 rounded-full shrink-0"
                    style={{ backgroundColor: prov.color }}
                  />
                  <div className="min-w-0">
                    <div className="text-[11px] font-mono font-semibold text-foreground truncate">
                      {prov.modelLabel}
                    </div>
                    <div className="text-[10px] font-mono text-muted-foreground/70 truncate">
                      {prov.label}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {prov.supportsFiles && (
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-border/40 text-muted-foreground/60">
                      arquivos
                    </span>
                  )}
                  {isSelected && (
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-primary/40 bg-primary/10 text-primary">
                      ativo
                    </span>
                  )}
                </div>
              </div>

              {/* Linha 2: barra de uso (só para providers com free tier) */}
              {limit != null ? (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[9px] font-mono">
                    <span className="text-muted-foreground/60">Uso hoje</span>
                    <span className={cn(isNearLimit ? "text-destructive/70" : "text-muted-foreground/60")}>
                      {usage} / {limit} req
                    </span>
                  </div>
                  <div className="h-1 rounded-full bg-muted/30 overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        isAtLimit
                          ? "bg-destructive/60"
                          : isNearLimit
                          ? "bg-amber-500/60"
                          : "bg-primary/50"
                      )}
                      style={{ width: `${usagePct * 100}%` }}
                    />
                  </div>
                  <div className="text-[9px] font-mono text-muted-foreground/50 truncate">
                    {isAtLimit ? "Limite atingido — use outro modelo" : prov.freeInfo}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-[9px] font-mono text-muted-foreground/50">
                  <Info className="size-2.5 shrink-0" />
                  {prov.freeInfo}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Nota sobre chaves de API */}
      <p className="text-[9px] font-mono text-muted-foreground/40 mt-3 text-center">
        Cada modelo requer uma chave de API própria configurada em Vars · O uso exibido é estimado localmente
      </p>
    </div>
  );
}

// ── File thumbnail — miniatura de arquivo anexado, estilo Claude Code ─────────
export function FileThumbnail({
  file,
  onRemove,
}: {
  file: AttachedFile;
  onRemove?: () => void;
}) {
  const ext = file.name.split(".").pop()?.toUpperCase() ?? "FILE";
  const sizeLabel = file.size < 1024 * 1024
    ? `${Math.round(file.size / 1024)} KB`
    : `${(file.size / (1024 * 1024)).toFixed(1)} MB`;

  return (
    <div className="relative flex items-center gap-2 pr-2.5 py-1.5 pl-1.5 rounded-lg border border-border/50 bg-card/60 max-w-[200px] group shrink-0">
      {file.preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={file.preview}
          alt={file.name}
          className="size-9 rounded-md object-cover shrink-0 border border-border/40"
        />
      ) : (
        <div
          className={cn(
            "flex items-center justify-center size-9 rounded-md shrink-0 border",
            file.type === "application/pdf"
              ? "bg-destructive/10 border-destructive/25 text-destructive"
              : "bg-primary/10 border-primary/20 text-primary"
          )}
        >
          <FileText className="size-4" />
        </div>
      )}
      <div className="flex flex-col min-w-0 leading-tight">
        <span className="text-[10px] font-mono text-foreground truncate max-w-[110px]">{file.name}</span>
        <span className="text-[9px] font-mono text-muted-foreground/70 tracking-wide">
          {ext} · {sizeLabel}
        </span>
      </div>
      {onRemove && (
        <button
          onClick={onRemove}
          aria-label={`Remover ${file.name}`}
          className="absolute -top-1.5 -right-1.5 flex items-center justify-center size-4 rounded-full bg-destructive text-white opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
        >
          <X className="size-2.5" />
        </button>
      )}
    </div>
  );
}

// ── Tool card — exibe status de execução de tools ─────────────────────────────
export function ToolCard({ part }: { part: { type: string; toolName?: string; state?: string; result?: unknown } }) {
  const toolLabels: Record<string, { label: string; icon: React.ElementType }> = {
    addTransaction:       { label: "Registrando lançamento",      icon: PlusCircle },
    upsertDebt:           { label: "Registrando dívida",           icon: PlusCircle },
    upsertInvestment:     { label: "Registrando investimento",     icon: PlusCircle },
    readFinancialData:    { label: "Lendo dados financeiros",      icon: Database },
    searchTransactions:   { label: "Buscando lançamentos",         icon: Database },
    updateTransaction:    { label: "Atualizando lançamento",       icon: RefreshCw },
    deleteTransaction:    { label: "Removendo lançamento",         icon: XCircle },
    updateDebt:           { label: "Atualizando dívida",           icon: RefreshCw },
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
export function MarkdownText({ text }: { text: string }) {
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
