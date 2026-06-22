"use client";

import { RiskLevel } from "@/lib/types";
import { cn } from "@/lib/utils";
import { RISK_LEVEL_LABEL, TRANSACTION_STATUS_LABEL, DEBT_STATUS_LABEL } from "@/lib/i18n-labels";

interface RiskBadgeProps {
  level: RiskLevel;
  size?: "sm" | "md" | "lg";
  showDot?: boolean;
}

const riskConfig: Record<RiskLevel, { label: string; className: string }> = {
  Baixo: {
    label: RISK_LEVEL_LABEL["Baixo"].toUpperCase(),
    className: "text-[hsl(var(--risk-low))] border-[hsl(var(--risk-low))/30] bg-[hsl(var(--risk-low))/10]",
  },
  Médio: {
    label: RISK_LEVEL_LABEL["Médio"].toUpperCase(),
    className: "text-[hsl(var(--risk-medium))] border-[hsl(var(--risk-medium))/30] bg-[hsl(var(--risk-medium))/10]",
  },
  Alto: {
    label: RISK_LEVEL_LABEL["Alto"].toUpperCase(),
    className: "text-[hsl(var(--risk-high))] border-[hsl(var(--risk-high))/30] bg-[hsl(var(--risk-high))/10]",
  },
  Crítico: {
    label: RISK_LEVEL_LABEL["Crítico"].toUpperCase(),
    className: "text-[hsl(var(--risk-critical))] border-[hsl(var(--risk-critical))/30] bg-[hsl(var(--risk-critical))/10]",
  },
};

export function RiskBadge({ level, size = "sm", showDot = true }: RiskBadgeProps) {
  const config = riskConfig[level];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 border rounded-sm font-mono font-semibold tracking-widest",
        size === "sm" && "text-[10px] px-2 py-0.5",
        size === "md" && "text-xs px-2.5 py-1",
        size === "lg" && "text-sm px-3 py-1.5",
        config.className
      )}
    >
      {showDot && (
        <span
          className={cn(
            "rounded-full animate-pulse",
            size === "sm" && "size-1.5",
            size === "md" && "size-2",
            size === "lg" && "size-2.5",
            level === "Baixo" && "bg-[hsl(var(--risk-low))]",
            level === "Médio" && "bg-[hsl(var(--risk-medium))]",
            level === "Alto" && "bg-[hsl(var(--risk-high))]",
            level === "Crítico" && "bg-[hsl(var(--risk-critical))]"
          )}
        />
      )}
      {config.label}
    </span>
  );
}

interface StatusBadgeProps {
  status: string;
}

const statusConfig: Record<string, string> = {
  Pago: "text-[hsl(var(--risk-low))] border-[hsl(var(--risk-low))/30] bg-[hsl(var(--risk-low))/10]",
  Recorrente: "text-[hsl(var(--accent))] border-[hsl(var(--accent))/30] bg-[hsl(var(--accent))/10]",
  Pendente: "text-[hsl(var(--risk-medium))] border-[hsl(var(--risk-medium))/30] bg-[hsl(var(--risk-medium))/10]",
  Previsto: "text-muted-foreground border-border bg-muted/30",
  Atrasado: "text-[hsl(var(--risk-critical))] border-[hsl(var(--risk-critical))/30] bg-[hsl(var(--risk-critical))/10]",
  Ativo: "text-[hsl(var(--accent))] border-[hsl(var(--accent))/30] bg-[hsl(var(--accent))/10]",
  Quitado: "text-[hsl(var(--risk-low))] border-[hsl(var(--risk-low))/30] bg-[hsl(var(--risk-low))/10]",
  Renegociado: "text-[hsl(var(--risk-medium))] border-[hsl(var(--risk-medium))/30] bg-[hsl(var(--risk-medium))/10]",
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const className = statusConfig[status] ?? "text-muted-foreground border-border bg-muted/30";
  // `status` is a raw PT enum value (TransactionStatus or DebtStatus) used as the
  // statusConfig lookup key — keep it untranslated for the lookup, but translate
  // for display via the combined label maps with a fallback to the raw value.
  const label =
    (TRANSACTION_STATUS_LABEL as Record<string, string>)[status] ??
    (DEBT_STATUS_LABEL as Record<string, string>)[status] ??
    status;
  return (
    <span
      className={cn(
        "inline-flex items-center border rounded-sm font-mono text-[10px] px-2 py-0.5 font-semibold tracking-wider uppercase",
        className
      )}
    >
      {label}
    </span>
  );
}

export function CurrencyBadge({ currency }: { currency: string }) {
  return (
    <span className="inline-flex items-center border border-border/40 rounded-sm font-mono text-[10px] px-1.5 py-0.5 text-muted-foreground bg-muted/20 tracking-wider">
      {currency}
    </span>
  );
}
