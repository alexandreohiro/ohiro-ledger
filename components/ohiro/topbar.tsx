"use client";

import { cn } from "@/lib/utils";
import { Plus, ChevronLeft, ChevronRight, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RiskBadge } from "./risk-badge";
import { RiskLevel } from "@/lib/types";
import { NotificationBell } from "./notification-bell";
import type { Notification } from "@/lib/notification-actions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  userEmail?: string;
  onSignOut?: () => void;
  isPending?: boolean;
  notifications?: Notification[];
  hasPrev?: boolean;
  hasNext?: boolean;
  availableMonthsCount?: number;
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
  ia: "IA FINANCEIRA",
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
  userEmail,
  onSignOut,
  isPending,
  notifications = [],
  hasPrev = true,
  hasNext = true,
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
            OHIRO / {viewLabel}
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
          disabled={!hasPrev}
          className="p-1 rounded hover:bg-muted/40 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-25 disabled:cursor-not-allowed"
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
          disabled={!hasNext}
          className="p-1 rounded hover:bg-muted/40 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-25 disabled:cursor-not-allowed"
          aria-label="Próximo mês"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      {/* Right: risk + notifications + add button + user */}
      <div className="flex items-center gap-3">
        <RiskBadge level={riskLevel} size="sm" />
        <NotificationBell notifications={notifications} />
        <Button
          size="sm"
          onClick={onAddTransaction}
          className="h-8 text-xs font-mono font-medium"
          disabled={isPending}
        >
          <Plus className="size-3.5" data-icon="inline-start" />
          <span className="hidden sm:inline">Lançamento</span>
        </Button>
        {userEmail && onSignOut && (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button className="flex size-8 items-center justify-center rounded-full bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-colors font-mono text-xs font-bold">
                  {userEmail[0].toUpperCase()}
                </button>
              }
            />
            <DropdownMenuContent align="end" className="w-56 font-mono text-xs">
              <div className="px-2 py-1.5 text-[11px] text-muted-foreground truncate">
                {userEmail}
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onSignOut} className="text-destructive focus:text-destructive cursor-pointer">
                <LogOut className="size-3.5 mr-2" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
