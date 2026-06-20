"use client";

import { cn } from "@/lib/utils";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RiskBadge } from "./risk-badge";
import { RiskLevel } from "@/lib/types";

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

interface TopbarProps {
  activeView: string;
  currentMonth: number;
  currentYear: number;
  riskLevel: RiskLevel;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onAddTransaction: () => void;
  className?: string;
}

const viewLabels: Record<string, string> = {
  dashboard: "PAINEL ESTRATÉGICO",
  ledger: "LEDGER OPERACIONAL",
  gastos: "CONTROLE DE GASTOS",
  receitas: "FLUXO DE RECEITAS",
  dividas: "GESTÃO DE DÍVIDAS",
  investimentos: "CARTEIRA DE INVESTIMENTOS",
  projecoes: "SIMULADOR DE CENÁRIOS",
  configuracoes: "CONFIGURAÇÕES",
};

export function Topbar({
  activeView,
  currentMonth,
  currentYear,
  riskLevel,
  onPrevMonth,
  onNextMonth,
  onAddTransaction,
  className,
}: TopbarProps) {
  const viewLabel = viewLabels[activeView] ?? activeView.toUpperCase();

  return (
    <header
      className={cn(
        "h-14 flex items-center justify-between px-4 border-b border-border/40 bg-background/80 backdrop-blur-sm sticky top-0 z-30",
        className
      )}
    >
      {/* Left: view label */}
      <div className="flex items-center gap-3 ml-10 md:ml-0">
        <div>
          <div className="text-[11px] font-mono text-muted-foreground/60 tracking-widest hidden sm:block">
            OHIRO LEDGER / {viewLabel}
          </div>
          <div className="text-sm font-mono font-semibold text-foreground tracking-tight">
            {viewLabel}
          </div>
        </div>
      </div>

      {/* Center: month selector */}
      <div className="flex items-center gap-1">
        <button
          onClick={onPrevMonth}
          className="p-1 rounded hover:bg-muted/40 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Mês anterior"
        >
          <ChevronLeft className="size-4" />
        </button>
        <div className="min-w-[130px] text-center">
          <span className="text-xs font-mono font-semibold text-foreground tracking-wide">
            {MONTHS[currentMonth]} {currentYear}
          </span>
        </div>
        <button
          onClick={onNextMonth}
          className="p-1 rounded hover:bg-muted/40 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Próximo mês"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      {/* Right: risk + add button */}
      <div className="flex items-center gap-3">
        <RiskBadge level={riskLevel} size="sm" />
        <Button
          size="sm"
          onClick={onAddTransaction}
          className="h-8 text-xs font-mono font-medium"
        >
          <Plus className="size-3.5" data-icon="inline-start" />
          <span className="hidden sm:inline">Lançamento</span>
        </Button>
      </div>
    </header>
  );
}
