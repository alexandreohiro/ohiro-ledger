"use client";

import { useState, useMemo } from "react";
import { Transaction, Investment } from "@/lib/types";
import { calcProjectionFV, calcFinancialSummary, formatCurrency } from "@/lib/calculations";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import { Calculator, TrendingUp, CreditCard, Scissors } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProjectionsViewProps {
  transactions: Transaction[];
  investments: Investment[];
}

interface ScenarioResult {
  label: string;
  value: number;
  description: string;
  color: string;
}

function ScenarioCard({ label, value, description, color, children }: ScenarioResult & { children?: React.ReactNode }) {
  return (
    <div className={cn("rounded-lg border p-4 bg-card/60", `border-[${color}/20]`)}>
      <div className="text-[11px] font-mono text-muted-foreground/60 tracking-widest uppercase mb-2">{label}</div>
      <div className={`text-2xl font-mono font-bold mb-1`} style={{ color }}>{formatCurrency(value)}</div>
      <div className="text-[11px] font-mono text-muted-foreground">{description}</div>
      {children}
    </div>
  );
}

export function ProjectionsView({ transactions, investments }: ProjectionsViewProps) {
  const summary = useMemo(() => calcFinancialSummary(transactions, investments), [transactions, investments]);

  // Simulator state
  const [monthlyInvestment, setMonthlyInvestment] = useState(300);
  const [annualRate, setAnnualRate] = useState(8);
  const [debtAmount, setDebtAmount] = useState(500);
  const [expenseCut, setExpenseCut] = useState(100);

  // Projection results
  const proj3 = calcProjectionFV(monthlyInvestment, 3, annualRate / 100);
  const proj6 = calcProjectionFV(monthlyInvestment, 6, annualRate / 100);
  const proj12 = calcProjectionFV(monthlyInvestment, 12, annualRate / 100);
  const proj24 = calcProjectionFV(monthlyInvestment, 24, annualRate / 100);

  const projData = [
    { label: "3m", value: proj3 },
    { label: "6m", value: proj6 },
    { label: "12m", value: proj12 },
    { label: "24m", value: proj24 },
  ];

  const debtImpact = debtAmount;
  const annualExpenseCutImpact = expenseCut * 12;
  const newFreeBalance = summary.freeBalance + debtImpact;

  // Monthly breakdown projection
  const monthlyData = Array.from({ length: 12 }, (_, i) => ({
    month: `Mês ${i + 1}`,
    patrimony: calcProjectionFV(monthlyInvestment, i + 1, annualRate / 100),
  }));

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-[1400px] mx-auto">
      <div className="text-[11px] font-mono text-muted-foreground/50 tracking-widest uppercase">
        Simulador de Cenários
      </div>

      {/* Simulator panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Investment simulator */}
        <div className="rounded-lg border border-border/40 bg-card/60 p-4 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="size-4 text-[hsl(var(--accent))]" />
            <span className="text-xs font-mono font-semibold text-foreground tracking-wide">Simulador de Aporte</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-mono text-muted-foreground tracking-wider uppercase">Aporte mensal (R$)</label>
              <Input className="h-8 text-xs font-mono" type="number" value={monthlyInvestment} onChange={(e) => setMonthlyInvestment(Number(e.target.value))} min={0} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-mono text-muted-foreground tracking-wider uppercase">Rentab. anual %</label>
              <Input className="h-8 text-xs font-mono" type="number" step="0.1" value={annualRate} onChange={(e) => setAnnualRate(Number(e.target.value))} min={0} />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {projData.map((p) => (
              <div key={p.label} className="flex items-center justify-between py-1.5 border-b border-border/20 last:border-0">
                <span className="text-[11px] font-mono text-muted-foreground">{p.label === "3m" ? "3 meses" : p.label === "6m" ? "6 meses" : p.label === "12m" ? "12 meses" : "24 meses"}</span>
                <span className="text-sm font-mono font-bold text-[hsl(var(--accent))]">{formatCurrency(p.value)}</span>
              </div>
            ))}
          </div>
          <div className="text-[10px] font-mono text-muted-foreground/60 leading-relaxed">
            Projeção usando capitalização composta mensal com {annualRate}% ao ano.
          </div>
        </div>

        {/* Debt elimination simulator */}
        <div className="rounded-lg border border-border/40 bg-card/60 p-4 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <CreditCard className="size-4 text-[hsl(var(--risk-critical))]" />
            <span className="text-xs font-mono font-semibold text-foreground tracking-wide">Quitação de Dívida</span>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-mono text-muted-foreground tracking-wider uppercase">Dívida a quitar (R$)</label>
            <Input className="h-8 text-xs font-mono" type="number" value={debtAmount} onChange={(e) => setDebtAmount(Number(e.target.value))} min={0} />
          </div>
          <div className="flex flex-col gap-3 mt-2">
            <div className="p-3 rounded-md bg-muted/20 border border-border/30">
              <div className="text-[10px] font-mono text-muted-foreground tracking-wider uppercase mb-1">Saldo livre atual</div>
              <div className={cn("text-base font-mono font-bold", summary.freeBalance >= 0 ? "text-[hsl(var(--risk-low))]" : "text-[hsl(var(--risk-critical))]")}>
                {formatCurrency(summary.freeBalance)}
              </div>
            </div>
            <div className="flex items-center justify-center text-[10px] font-mono text-muted-foreground">
              → após quitação da dívida →
            </div>
            <div className="p-3 rounded-md bg-[hsl(var(--risk-low))/10] border border-[hsl(var(--risk-low))/20]">
              <div className="text-[10px] font-mono text-muted-foreground tracking-wider uppercase mb-1">Novo saldo livre</div>
              <div className="text-base font-mono font-bold text-[hsl(var(--risk-low))]">
                {formatCurrency(newFreeBalance)}
              </div>
            </div>
            <div className="p-3 rounded-md border border-border/30 bg-card/40">
              <div className="text-[10px] font-mono text-muted-foreground tracking-wider uppercase mb-1">Ganho mensal</div>
              <div className="text-base font-mono font-bold text-[hsl(var(--accent))]">
                +{formatCurrency(debtImpact)}/mês
              </div>
              <div className="text-[11px] font-mono text-muted-foreground mt-1">
                = {formatCurrency(debtImpact * 12)} no ano
              </div>
            </div>
          </div>
        </div>

        {/* Expense cut simulator */}
        <div className="rounded-lg border border-border/40 bg-card/60 p-4 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Scissors className="size-4 text-[hsl(var(--risk-medium))]" />
            <span className="text-xs font-mono font-semibold text-foreground tracking-wide">Corte de Gastos</span>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-mono text-muted-foreground tracking-wider uppercase">Redução mensal (R$)</label>
            <Input className="h-8 text-xs font-mono" type="number" value={expenseCut} onChange={(e) => setExpenseCut(Number(e.target.value))} min={0} />
          </div>
          <div className="flex flex-col gap-3 mt-2">
            <div className="p-3 rounded-md border border-border/30 bg-card/40">
              <div className="text-[10px] font-mono text-muted-foreground tracking-wider uppercase mb-1">Impacto mensal</div>
              <div className="text-base font-mono font-bold text-[hsl(var(--risk-low))]">+{formatCurrency(expenseCut)}</div>
            </div>
            <div className="p-3 rounded-md border border-border/30 bg-card/40">
              <div className="text-[10px] font-mono text-muted-foreground tracking-wider uppercase mb-1">Impacto anual</div>
              <div className="text-base font-mono font-bold text-[hsl(var(--accent))]">+{formatCurrency(annualExpenseCutImpact)}</div>
            </div>
            <div className="p-3 rounded-md bg-[hsl(var(--accent))/10] border border-[hsl(var(--accent))/20]">
              <div className="text-[10px] font-mono text-muted-foreground tracking-wider uppercase mb-1">Investindo o corte (12m)</div>
              <div className="text-base font-mono font-bold text-[hsl(var(--accent))]">
                {formatCurrency(calcProjectionFV(expenseCut, 12, annualRate / 100))}
              </div>
              <div className="text-[11px] font-mono text-muted-foreground mt-1">
                com {annualRate}% a.a. de rentabilidade
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Projection chart */}
      <div className="rounded-lg border border-border/40 bg-card/60 p-4">
        <div className="flex items-center gap-2 mb-4">
          <Calculator className="size-4 text-[hsl(var(--accent))]" />
          <span className="text-[11px] font-mono text-muted-foreground/60 tracking-widest uppercase">
            Evolução Patrimonial — {monthlyInvestment > 0 ? `R$ ${monthlyInvestment}/mês × 12 meses` : "configure o aporte"}
          </span>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={monthlyData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.3} />
            <XAxis dataKey="month" tick={{ fontSize: 10, fontFamily: "monospace", fill: "hsl(var(--muted-foreground))" }} />
            <YAxis tick={{ fontSize: 10, fontFamily: "monospace", fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `R$${(v / 1000).toFixed(1)}k`} />
            <Tooltip
              formatter={(v) => [formatCurrency(Number(v)), "Patrimônio"]}
              contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontFamily: "monospace", fontSize: 11 }}
            />
            <Bar dataKey="patrimony" fill="hsl(var(--accent))" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Key questions answered */}
      <div className="rounded-lg border border-border/40 bg-card/60 p-4">
        <div className="text-[11px] font-mono text-muted-foreground/50 tracking-widest uppercase mb-4">Respostas Rápidas</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            {
              q: `Se eu investir R$ ${monthlyInvestment}/mês, quanto terei em 12 meses?`,
              a: formatCurrency(proj12),
              color: "text-[hsl(var(--accent))]",
            },
            {
              q: `Se eu quitar uma dívida de R$ ${debtAmount}, quanto meu saldo livre melhora?`,
              a: `+${formatCurrency(debtImpact)}/mês`,
              color: "text-[hsl(var(--risk-low))]",
            },
            {
              q: `Se eu cortar R$ ${expenseCut} de gastos fixos, qual o impacto anual?`,
              a: `+${formatCurrency(annualExpenseCutImpact)}/ano`,
              color: "text-[hsl(var(--risk-medium))]",
            },
          ].map((item, idx) => (
            <div key={idx} className="p-3 rounded-md border border-border/30 bg-muted/10">
              <div className="text-[11px] font-mono text-muted-foreground leading-relaxed mb-2">{item.q}</div>
              <div className={cn("text-lg font-mono font-bold", item.color)}>{item.a}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
