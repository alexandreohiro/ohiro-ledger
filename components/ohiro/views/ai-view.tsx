"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Transaction, Investment, Debt } from "@/lib/types";
import { calcFinancialSummary } from "@/lib/calculations";
import { formatCurrency } from "@/lib/calculations";
import { cn } from "@/lib/utils";
import {
  Bot,
  User,
  Send,
  Sparkles,
  AlertTriangle,
  TrendingUp,
  BarChart3,
  RefreshCw,
  Loader2,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface AIViewProps {
  transactions: Transaction[];
  investments: Investment[];
  debts: Debt[];
}

function buildFinancialContext(
  transactions: Transaction[],
  investments: Investment[],
  debts: Debt[]
): string {
  const summary = calcFinancialSummary(transactions, investments);

  const topExpenses = transactions
    .filter((t) => t.type === "Gasto" && t.status !== "Previsto")
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  const topDebts = debts
    .filter((d) => d.status === "Ativo" || d.status === "Atrasado")
    .sort((a, b) => b.currentAmount - a.currentAmount)
    .slice(0, 5);

  const lines: string[] = [
    `### Resumo Financeiro`,
    `- Receitas totais: ${formatCurrency(summary.totalRevenue)}`,
    `- Gastos totais: ${formatCurrency(summary.totalExpenses)}`,
    `- Saldo livre: ${formatCurrency(summary.freeBalance)}`,
    `- Total em dívidas: ${formatCurrency(summary.totalDebts)}`,
    `- Total em investimentos: ${formatCurrency(summary.totalInvestments)}`,
    `- Patrimônio líquido: ${formatCurrency(summary.totalPatrimony)}`,
    `- Comprometimento da renda: ${summary.incomeCommitment.toFixed(1)}%`,
    `- Taxa de investimento: ${summary.investmentRate.toFixed(1)}%`,
    `- Nível de risco: ${summary.riskLevel}`,
    ``,
    `### Top 5 Maiores Gastos`,
    ...topExpenses.map(
      (t) =>
        `- ${t.description} (${t.category}): ${formatCurrency(t.amount)} — ${t.date}`
    ),
    ``,
    `### Dívidas Ativas (por valor)`,
    ...topDebts.map(
      (d) =>
        `- ${d.creditor}: ${formatCurrency(d.currentAmount)} restantes | parcela: ${formatCurrency(d.installmentAmount)} | juros: ${(d.interestRate * 100).toFixed(2)}%/mês | prioridade: ${d.priority}`
    ),
    ``,
    `### Carteira de Investimentos`,
    ...investments.map(
      (i) =>
        `- ${i.assetName} (${i.class}): ${formatCurrency(i.convertedAmountBRL)} BRL | aporte mensal: ${formatCurrency(i.monthlyContribution)}`
    ),
    ``,
    `### Últimos 10 Lançamentos`,
    ...transactions.slice(0, 10).map(
      (t) =>
        `- [${t.type}] ${t.description}: ${formatCurrency(t.amount)} — ${t.date} (${t.status})`
    ),
  ];

  return lines.join("\n");
}

const QUICK_PROMPTS = [
  {
    icon: AlertTriangle,
    label: "Análise de risco",
    text: "Analise meu nível de risco financeiro atual e me diga quais são os maiores pontos de atenção.",
  },
  {
    icon: TrendingUp,
    label: "Estratégia de dívidas",
    text: "Com base nas minhas dívidas atuais, qual a melhor estratégia para quitá-las mais rápido e pagar menos juros?",
  },
  {
    icon: BarChart3,
    label: "Saúde dos investimentos",
    text: "Como está minha carteira de investimentos? Está bem diversificada? O que posso melhorar?",
  },
  {
    icon: Sparkles,
    label: "Oportunidades de economia",
    text: "Analisando meus gastos, em quais categorias eu poderia cortar despesas para melhorar minha saúde financeira?",
  },
];

export function AIView({ transactions, investments, debts }: AIViewProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [inputValue, setInputValue] = useState("");
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const financialContext = buildFinancialContext(transactions, investments, debts);

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/ai/chat",
      prepareSendMessagesRequest: ({ id, messages }) => ({
        body: {
          id,
          messages,
          context: financialContext,
        },
      }),
    }),
  });

  const isStreaming = status === "streaming" || status === "submitted";

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  // Show scroll-to-bottom button
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    setShowScrollBtn(scrollHeight - scrollTop - clientHeight > 120);
  }, []);

  function scrollToBottom() {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  function handleSend() {
    const text = inputValue.trim();
    if (!text || isStreaming) return;
    sendMessage({ text });
    setInputValue("");
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

  type ChatMessage = (typeof messages)[0];
  const getMessageText = (msg: ChatMessage) => {
    if (!msg.parts) return "";
    return (msg.parts as Array<{ type: string; text?: string }>)
      .filter((p): p is { type: "text"; text: string } => p.type === "text" && typeof p.text === "string")
      .map((p) => p.text)
      .join("");
  };

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border/40 bg-card/30 backdrop-blur-sm shrink-0">
        <div className="flex items-center justify-center size-8 rounded-md bg-primary/10 border border-primary/20">
          <Bot className="size-4 text-primary" />
        </div>
        <div>
          <h1 className="text-sm font-bold font-mono text-foreground tracking-wide">OHIRO-IA</h1>
          <p className="text-[11px] font-mono text-muted-foreground tracking-widest">
            ASSISTENTE FINANCEIRO INTELIGENTE
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div
            className={cn(
              "flex items-center gap-1.5 text-[10px] font-mono px-2 py-1 rounded border",
              isStreaming
                ? "text-primary border-primary/30 bg-primary/10"
                : "text-muted-foreground border-border/40 bg-transparent"
            )}
          >
            <div
              className={cn(
                "size-1.5 rounded-full",
                isStreaming ? "bg-primary animate-pulse" : "bg-muted-foreground/40"
              )}
            />
            {isStreaming ? "PROCESSANDO" : "AGUARDANDO"}
          </div>
        </div>
      </div>

      {/* Messages area */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-6 flex flex-col gap-5"
      >
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-8 py-12">
            {/* Welcome state */}
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center size-16 rounded-2xl bg-primary/10 border border-primary/20 mx-auto mb-4">
                <Sparkles className="size-7 text-primary" />
              </div>
              <h2 className="text-base font-bold font-mono text-foreground">
                Bem-vindo ao OHIRO-IA
              </h2>
              <p className="text-xs font-mono text-muted-foreground max-w-sm leading-relaxed">
                Seu assistente financeiro com acesso completo aos seus dados. Pergunte sobre
                dívidas, investimentos, gastos ou peça uma análise geral da sua saúde financeira.
              </p>
            </div>

            {/* Quick prompts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-xl">
              {QUICK_PROMPTS.map((prompt) => {
                const Icon = prompt.icon;
                return (
                  <button
                    key={prompt.label}
                    onClick={() => handleQuickPrompt(prompt.text)}
                    disabled={isStreaming}
                    className="flex items-start gap-3 p-3 rounded-lg border border-border/40 bg-card/40 hover:bg-card/80 hover:border-primary/30 transition-all text-left group"
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
        ) : (
          messages.map((msg) => {
            const isUser = msg.role === "user";
            const text = getMessageText(msg);
            if (!text) return null;
            return (
              <div
                key={msg.id}
                className={cn("flex gap-3 max-w-3xl", isUser ? "ml-auto flex-row-reverse" : "")}
              >
                {/* Avatar */}
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

                {/* Bubble */}
                <div
                  className={cn(
                    "rounded-xl px-4 py-3 text-xs font-mono leading-relaxed border",
                    isUser
                      ? "bg-muted/30 border-border/30 text-foreground text-right"
                      : "bg-card/60 border-border/40 text-foreground"
                  )}
                >
                  <MarkdownText text={text} />
                </div>
              </div>
            );
          })
        )}

        {/* Streaming indicator */}
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

      {/* Scroll to bottom button */}
      {showScrollBtn && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-24 right-6 flex items-center justify-center size-8 rounded-full bg-card border border-border/60 text-muted-foreground hover:text-foreground shadow-lg transition-all"
        >
          <ChevronDown className="size-4" />
        </button>
      )}

      {/* Input area */}
      <div className="shrink-0 border-t border-border/40 bg-card/30 backdrop-blur-sm px-4 py-3">
        {/* Quick prompts strip (when there are messages) */}
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

        {/* Textarea + Send */}
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Pergunte sobre seus dados financeiros... (Enter para enviar)"
            rows={1}
            disabled={isStreaming}
            className="flex-1 resize-none min-h-[40px] max-h-[120px] rounded-lg border border-border/50 bg-background/60 px-3 py-2.5 text-xs font-mono text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 disabled:opacity-50 transition-all leading-relaxed"
            style={{ height: "40px" }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = "40px";
              target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
            }}
          />
          <Button
            size="sm"
            onClick={handleSend}
            disabled={!inputValue.trim() || isStreaming}
            className="size-10 shrink-0 p-0"
          >
            {isStreaming ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
            <span className="sr-only">Enviar</span>
          </Button>
        </div>

        <p className="text-[10px] font-mono text-muted-foreground/40 text-center mt-2">
          IA com acesso aos seus dados financeiros em tempo real · Gemini 2.0 Flash
        </p>
      </div>
    </div>
  );
}

// Simple markdown renderer for bold/lists/headers
function MarkdownText({ text }: { text: string }) {
  const lines = text.split("\n");

  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        // Heading ##
        if (line.startsWith("### ")) {
          return (
            <div key={i} className="font-bold text-foreground mt-2 first:mt-0">
              {renderInline(line.slice(4))}
            </div>
          );
        }
        if (line.startsWith("## ")) {
          return (
            <div key={i} className="font-bold text-foreground text-sm mt-2 first:mt-0">
              {renderInline(line.slice(3))}
            </div>
          );
        }
        // List item
        if (line.startsWith("- ") || line.startsWith("* ")) {
          return (
            <div key={i} className="flex gap-1.5">
              <span className="text-primary mt-[2px] shrink-0">·</span>
              <span>{renderInline(line.slice(2))}</span>
            </div>
          );
        }
        // Numbered list
        if (/^\d+\. /.test(line)) {
          const num = line.match(/^(\d+)\. /)?.[1];
          return (
            <div key={i} className="flex gap-1.5">
              <span className="text-primary shrink-0 tabular-nums">{num}.</span>
              <span>{renderInline(line.replace(/^\d+\. /, ""))}</span>
            </div>
          );
        }
        // Horizontal rule
        if (line === "---" || line === "***") {
          return <hr key={i} className="border-border/30 my-1" />;
        }
        // Empty line
        if (!line.trim()) {
          return <div key={i} className="h-1" />;
        }
        return <div key={i}>{renderInline(line)}</div>;
      })}
    </div>
  );
}

function renderInline(text: string): React.ReactNode {
  // Bold **text** or __text__
  const parts = text.split(/(\*\*[^*]+\*\*|__[^_]+__)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-bold text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("__") && part.endsWith("__")) {
      return (
        <strong key={i} className="font-bold text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}
