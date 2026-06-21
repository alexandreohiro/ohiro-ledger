"use client";

import { useMemo } from "react";
import { Transaction } from "@/lib/types";
import {
  formatCurrency,
  getAmountInBRL,
  groupByCategory,
  buildMonthlyChartData,
  formatMonthLabel,
} from "@/lib/calculations";
import { StatusBadge } from "../risk-badge";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { TrendingDown, TrendingUp } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface FilteredViewProps {
  transactions: Transaction[];
  monthTransactions: Transaction[];
  selectedMonthKey: string;
  mode: "gastos" | "receitas";
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border/60 rounded-md px-3 py-2 shadow-xl text-xs font-mono">
      {label && <div className="text-muted-foreground mb-1">{label}</div>}
      {payload.map((p) => (
        <div key={p.name} className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full" style={{ background: p.color }} />
            <span className="text-muted-foreground">{p.name}</span>
          </div>
          <span className="font-bold text-foreground">{formatCurrency(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

export function ExpensesRevenuesView({ transactions, monthTransactions, selectedMonthKey, mode }: FilteredViewProps) {
  // Dados do mês selecionado
  const filtered = useMemo(
    () => monthTransactions.filter((t) => (mode === "gastos" ? t.type === "Gasto" : t.type === "Receita")),
    [monthTransactions, mode]
  );
  const total = useMemo(() => filtered.reduce((s, t) => s + getAmountInBRL(t), 0), [filtered]);
  const grouped = useMemo(() => groupByCategory(filtered), [filtered]);

  // Total acumulado de todos os meses (para comparação)
  const allFiltered = useMemo(
    () => transactions.filter((t) => (mode === "gastos" ? t.type === "Gasto" : t.type === "Receita")),
    [transactions, mode]
  );
  const totalAll = useMemo(() => allFiltered.reduce((s, t) => s + getAmountInBRL(t), 0), [allFiltered]);

  // Dados históricos para o gráfico
  const monthlyData = useMemo(
    () =>
      buildMonthlyChartData(transactions, 12).map((p) => ({
        label: p.label,
        valor: mode === "gastos" ? p.gastos : p.receita,
      })),
    [transactions, mode]
  );

  const isExpenses = mode === "gastos";
  const color = isExpenses ? "text-[hsl(var(--risk-medium))]" : "text-[hsl(var(--risk-low))]";
  const barColor = isExpenses ? "hsl(var(--risk-medium))" : "hsl(var(--risk-low))";
  const Icon = isExpenses ? TrendingDown : TrendingUp;
  const monthLabel = formatMonthLabel(selectedMonthKey);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-[1400px] mx-auto">

      {/* Header + KPIs */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className={cn("p-2.5 rounded-md bg-card border border-border/40 self-start", color)}>
          <Icon className="size-5" />
        </div>
        <div className="flex-1">
          <div className="text-[11px] font-mono text-muted-foreground/50 tracking-widest uppercase mb-0.5">
            {isExpenses ? "Controle de Gastos" : "Fluxo de Receitas"} — {monthLabel}
          </div>
          <div className={cn("text-2xl font-mono font-bold", color)}>{formatCurrency(total)}</div>
        </div>
        <div className="flex gap-4 text-right">
          <div>
            <div className="text-[10px] font-mono text-muted-foreground tracking-wider uppercase">Total acumulado</div>
            <div className={cn("text-sm font-mono font-bold", color)}>{formatCurrency(totalAll)}</div>
          </div>
          <div>
            <div className="text-[10px] font-mono text-muted-foreground tracking-wider uppercase">Lançamentos</div>
            <div className="text-sm font-mono font-bold text-foreground">{filtered.length}</div>
          </div>
        </div>
      </div>

      {/* Gráfico histórico */}
      {monthlyData.filter(m => m.valor > 0).length >= 2 && (
        <div className="rounded-lg border border-border/40 bg-card/60 p-4">
          <div className="text-[11px] font-mono text-muted-foreground/50 tracking-widest uppercase mb-4">
            Histórico — últimos {monthlyData.length} meses
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={monthlyData} barCategoryGap="40%">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.3)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fontFamily: "var(--font-mono)", fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fontFamily: "var(--font-mono)", fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                width={38}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "hsl(var(--muted) / 0.3)" }} />
              <Bar
                dataKey="valor"
                name={isExpenses ? "Gastos" : "Receita"}
                fill={barColor}
                radius={[3, 3, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Por categoria */}
      {Object.keys(grouped).length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Object.entries(grouped)
            .sort(([, a], [, b]) => {
              const totA = a.reduce((s, t) => s + getAmountInBRL(t), 0);
              const totB = b.reduce((s, t) => s + getAmountInBRL(t), 0);
              return totB - totA;
            })
            .map(([cat, txns]) => {
              const catTotal = txns.reduce((s, t) => s + getAmountInBRL(t), 0);
              const pct = total > 0 ? (catTotal / total) * 100 : 0;
              return (
                <div key={cat} className="rounded-lg border border-border/40 bg-card/60 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono font-semibold text-foreground truncate mr-2">{cat}</span>
                    <span className="text-[10px] font-mono text-muted-foreground shrink-0">{txns.length}x</span>
                  </div>
                  <div className={cn("text-lg font-mono font-bold mb-2", color)}>{formatCurrency(catTotal)}</div>
                  <Progress value={pct} className="h-1.5 mb-1" />
                  <div className="text-[10px] font-mono text-muted-foreground mb-3">{pct.toFixed(1)}% do total do mês</div>
                  <div className="flex flex-col gap-1.5 border-t border-border/20 pt-2">
                    {txns
                      .sort((a, b) => getAmountInBRL(b) - getAmountInBRL(a))
                      .map((t) => (
                        <div key={t.id} className="flex items-center justify-between text-[11px] font-mono">
                          <div className="min-w-0 mr-2">
                            <div className="text-muted-foreground truncate">{t.description}</div>
                            <div className="text-[10px] text-muted-foreground/60">{t.date}</div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
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
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Icon className="size-12 mb-4 opacity-20" />
          <div className="font-mono text-sm">
            Nenhum lançamento em {monthLabel}
          </div>
          <div className="text-[11px] mt-1">Adicione lançamentos no Ledger Operacional</div>
        </div>
      )}
    </div>
  );
}
