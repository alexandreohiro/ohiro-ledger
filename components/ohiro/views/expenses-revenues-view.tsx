"use client";

import { useMemo } from "react";
import { Transaction } from "@/lib/types";
import { formatCurrency, getAmountInBRL, groupByCategory } from "@/lib/calculations";
import { StatusBadge } from "../risk-badge";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { TrendingDown, TrendingUp } from "lucide-react";

interface FilteredViewProps {
  transactions: Transaction[];
  mode: "gastos" | "receitas";
}

export function ExpensesRevenuesView({ transactions, mode }: FilteredViewProps) {
  const filtered = useMemo(
    () => transactions.filter((t) => (mode === "gastos" ? t.type === "Gasto" : t.type === "Receita")),
    [transactions, mode]
  );
  const total = useMemo(() => filtered.reduce((s, t) => s + getAmountInBRL(t), 0), [filtered]);
  const grouped = useMemo(() => groupByCategory(filtered), [filtered]);

  const isExpenses = mode === "gastos";
  const color = isExpenses ? "text-[hsl(var(--risk-medium))]" : "text-[hsl(var(--risk-low))]";
  const Icon = isExpenses ? TrendingDown : TrendingUp;

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-[1400px] mx-auto">
      <div className="flex items-center gap-3">
        <div className={cn("p-2 rounded-md bg-card border border-border/40", color)}>
          <Icon className="size-5" />
        </div>
        <div>
          <div className="text-[11px] font-mono text-muted-foreground/50 tracking-widest uppercase">
            {isExpenses ? "Controle de Gastos" : "Fluxo de Receitas"}
          </div>
          <div className={cn("text-2xl font-mono font-bold", color)}>{formatCurrency(total)}</div>
        </div>
      </div>

      {/* By category */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {Object.entries(grouped).map(([cat, txns]) => {
          const catTotal = txns.reduce((s, t) => s + getAmountInBRL(t), 0);
          const pct = total > 0 ? (catTotal / total) * 100 : 0;
          return (
            <div key={cat} className="rounded-lg border border-border/40 bg-card/60 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono font-semibold text-foreground">{cat}</span>
                <span className="text-[10px] font-mono text-muted-foreground">{txns.length} lançamentos</span>
              </div>
              <div className={cn("text-lg font-mono font-bold mb-2", color)}>{formatCurrency(catTotal)}</div>
              <Progress value={pct} className="h-1.5 mb-1" />
              <div className="text-[10px] font-mono text-muted-foreground">{pct.toFixed(1)}% do total</div>
              {/* Items */}
              <div className="mt-3 flex flex-col gap-1.5">
                {txns.map((t) => (
                  <div key={t.id} className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-muted-foreground truncate max-w-[130px]">{t.description}</span>
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      <StatusBadge status={t.status} />
                      <span className={cn("font-bold", color)}>{formatCurrency(getAmountInBRL(t))}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Icon className="size-12 mb-4 opacity-20" />
          <div className="font-mono text-sm">Nenhum lançamento encontrado</div>
          <div className="text-[11px] mt-1">Adicione lançamentos no Ledger Operacional</div>
        </div>
      )}
    </div>
  );
}
