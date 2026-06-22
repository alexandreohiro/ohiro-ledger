"use client";

import { useState, useMemo } from "react";
import { Transaction, Investment } from "@/lib/types";
import { calcProjectionFV, calcFinancialSummary, formatCurrency } from "@/lib/calculations";
import { Input } from "@/components/ui/input";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, Legend } from "recharts";
import { Calculator, TrendingUp, CreditCard, Scissors, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProjectionsViewProps {
  transactions: Transaction[];
  investments: Investment[];
}

const HORIZONS = [3, 6, 12, 24] as const;

export function ProjectionsView({ transactions, investments }: ProjectionsViewProps) {
  const summary = useMemo(() => calcFinancialSummary(transactions, investments), [transactions, investments]);

  // Simulator state
  const [monthlyInvestment, setMonthlyInvestment] = useState(300);
  const [annualRate, setAnnualRate] = useState(8);
  const [debtAmount, setDebtAmount] = useState(500);
  const [expenseCut, setExpenseCut] = useState(100);
  const [horizon, setHorizon] = useState<typeof HORIZONS[number]>(12);

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

  // Combined scenario: base contribution + debt paid off + expense cut redirected to investment
  const combinedMonthly = monthlyInvestment + debtImpact + expenseCut;

  // Net worth evolution: base vs combined scenario, over the selected horizon
  const monthlyData = Array.from({ length: horizon }, (_, i) => ({
    month: `M${i + 1}`,
    base: calcProjectionFV(monthlyInvestment, i + 1, annualRate / 100),
    combinado: calcProjectionFV(combinedMonthly, i + 1, annualRate / 100),
  }));

  const combinedAtHorizon = monthlyData[monthlyData.length - 1]?.combinado ?? 0;
  const baseAtHorizon = monthlyData[monthlyData.length - 1]?.base ?? 0;

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-[1400px] mx-auto">
      <div className="text-[11px] font-mono text-muted-foreground/50 tracking-widest uppercase">
        Scenario Simulator
      </div>

      {/* Simulator panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Investment simulator */}
        <div className="rounded-lg border border-border/40 bg-card/60 p-4 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="size-4 text-[hsl(var(--accent))]" />
            <span className="text-xs font-mono font-semibold text-foreground tracking-wide">Investment Simulator</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-mono text-muted-foreground tracking-wider uppercase">Monthly Contribution ($)</label>
              <Input className="h-8 text-xs font-mono" type="number" value={monthlyInvestment} onChange={(e) => setMonthlyInvestment(Number(e.target.value))} min={0} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-mono text-muted-foreground tracking-wider uppercase">Annual Return %</label>
              <Input className="h-8 text-xs font-mono" type="number" step="0.1" value={annualRate} onChange={(e) => setAnnualRate(Number(e.target.value))} min={0} />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {projData.map((p) => (
              <div key={p.label} className="flex items-center justify-between py-1.5 border-b border-border/20 last:border-0">
                <span className="text-[11px] font-mono text-muted-foreground">{p.label === "3m" ? "3 months" : p.label === "6m" ? "6 months" : p.label === "12m" ? "12 months" : "24 months"}</span>
                <span className="text-sm font-mono font-bold text-[hsl(var(--accent))]">{formatCurrency(p.value)}</span>
              </div>
            ))}
          </div>
          <div className="text-[10px] font-mono text-muted-foreground/60 leading-relaxed">
            Projection using monthly compound interest at {annualRate}% per year.
          </div>
        </div>

        {/* Debt elimination simulator */}
        <div className="rounded-lg border border-border/40 bg-card/60 p-4 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <CreditCard className="size-4 text-[hsl(var(--risk-critical))]" />
            <span className="text-xs font-mono font-semibold text-foreground tracking-wide">Debt Payoff</span>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-mono text-muted-foreground tracking-wider uppercase">Debt to Pay Off ($)</label>
            <Input className="h-8 text-xs font-mono" type="number" value={debtAmount} onChange={(e) => setDebtAmount(Number(e.target.value))} min={0} />
          </div>
          <div className="flex flex-col gap-3 mt-2">
            <div className="p-3 rounded-md bg-muted/20 border border-border/30">
              <div className="text-[10px] font-mono text-muted-foreground tracking-wider uppercase mb-1">Current Free Balance</div>
              <div className={cn("text-base font-mono font-bold", summary.freeBalance >= 0 ? "text-[hsl(var(--risk-low))]" : "text-[hsl(var(--risk-critical))]")}>
                {formatCurrency(summary.freeBalance)}
              </div>
            </div>
            <div className="flex items-center justify-center text-[10px] font-mono text-muted-foreground">
              → after paying off the debt →
            </div>
            <div className="p-3 rounded-md bg-[hsl(var(--risk-low))/10] border border-[hsl(var(--risk-low))/20]">
              <div className="text-[10px] font-mono text-muted-foreground tracking-wider uppercase mb-1">New Free Balance</div>
              <div className="text-base font-mono font-bold text-[hsl(var(--risk-low))]">
                {formatCurrency(newFreeBalance)}
              </div>
            </div>
            <div className="p-3 rounded-md border border-border/30 bg-card/40">
              <div className="text-[10px] font-mono text-muted-foreground tracking-wider uppercase mb-1">Monthly Gain</div>
              <div className="text-base font-mono font-bold text-[hsl(var(--accent))]">
                +{formatCurrency(debtImpact)}/mo
              </div>
              <div className="text-[11px] font-mono text-muted-foreground mt-1">
                = {formatCurrency(debtImpact * 12)} per year
              </div>
            </div>
          </div>
        </div>

        {/* Expense cut simulator */}
        <div className="rounded-lg border border-border/40 bg-card/60 p-4 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Scissors className="size-4 text-[hsl(var(--risk-medium))]" />
            <span className="text-xs font-mono font-semibold text-foreground tracking-wide">Expense Cut</span>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-mono text-muted-foreground tracking-wider uppercase">Monthly Reduction ($)</label>
            <Input className="h-8 text-xs font-mono" type="number" value={expenseCut} onChange={(e) => setExpenseCut(Number(e.target.value))} min={0} />
          </div>
          <div className="flex flex-col gap-3 mt-2">
            <div className="p-3 rounded-md border border-border/30 bg-card/40">
              <div className="text-[10px] font-mono text-muted-foreground tracking-wider uppercase mb-1">Monthly Impact</div>
              <div className="text-base font-mono font-bold text-[hsl(var(--risk-low))]">+{formatCurrency(expenseCut)}</div>
            </div>
            <div className="p-3 rounded-md border border-border/30 bg-card/40">
              <div className="text-[10px] font-mono text-muted-foreground tracking-wider uppercase mb-1">Annual Impact</div>
              <div className="text-base font-mono font-bold text-[hsl(var(--accent))]">+{formatCurrency(annualExpenseCutImpact)}</div>
            </div>
            <div className="p-3 rounded-md bg-[hsl(var(--accent))/10] border border-[hsl(var(--accent))/20]">
              <div className="text-[10px] font-mono text-muted-foreground tracking-wider uppercase mb-1">Investing the Cut (12mo)</div>
              <div className="text-base font-mono font-bold text-[hsl(var(--accent))]">
                {formatCurrency(calcProjectionFV(expenseCut, 12, annualRate / 100))}
              </div>
              <div className="text-[11px] font-mono text-muted-foreground mt-1">
                at {annualRate}% p.a. return
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Projection chart */}
      <div className="rounded-lg border border-border/40 bg-card/60 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Calculator className="size-4 text-[hsl(var(--accent))]" />
            <span className="text-[11px] font-mono text-muted-foreground/60 tracking-widest uppercase">
              Net Worth Growth
            </span>
          </div>
          <div className="flex items-center gap-1">
            {HORIZONS.map((h) => (
              <button
                key={h}
                onClick={() => setHorizon(h)}
                className={cn(
                  "px-2.5 py-1 rounded-md text-[11px] font-mono transition-colors",
                  horizon === h ? "bg-[hsl(var(--accent))/15] text-[hsl(var(--accent))] border border-[hsl(var(--accent))/30]" : "text-muted-foreground hover:text-foreground border border-transparent"
                )}
              >
                {h}m
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={monthlyData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <defs>
              <linearGradient id="gradCombinado" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--risk-low))" stopOpacity={0.35} />
                <stop offset="100%" stopColor="hsl(var(--risk-low))" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradBase" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity={0.35} />
                <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.3} />
            <XAxis dataKey="month" tick={{ fontSize: 10, fontFamily: "monospace", fill: "hsl(var(--muted-foreground))" }} />
            <YAxis tick={{ fontSize: 10, fontFamily: "monospace", fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`} />
            <Tooltip
              formatter={(v, name) => [formatCurrency(Number(v)), name === "combinado" ? "Combined scenario" : "Current contribution"]}
              contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontFamily: "monospace", fontSize: 11 }}
            />
            <Legend
              formatter={(v) => (v === "combinado" ? "Combined scenario" : "Current contribution")}
              wrapperStyle={{ fontFamily: "monospace", fontSize: 11 }}
            />
            <Area type="monotone" dataKey="combinado" stroke="hsl(var(--risk-low))" fill="url(#gradCombinado)" strokeWidth={2} />
            <Area type="monotone" dataKey="base" stroke="hsl(var(--accent))" fill="url(#gradBase)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
        {combinedMonthly > monthlyInvestment && (
          <div className="mt-3 flex items-center gap-2 text-[11px] font-mono text-muted-foreground">
            <Sparkles className="size-3.5 text-[hsl(var(--risk-low))]" />
            Combining debt payoff + expense cut, your net worth in {horizon} months would be
            <span className="font-bold text-[hsl(var(--risk-low))]">{formatCurrency(combinedAtHorizon)}</span>
            instead of <span className="font-bold text-[hsl(var(--accent))]">{formatCurrency(baseAtHorizon)}</span>.
          </div>
        )}
      </div>

      {/* Key questions answered */}
      <div className="rounded-lg border border-border/40 bg-card/60 p-4">
        <div className="text-[11px] font-mono text-muted-foreground/50 tracking-widest uppercase mb-4">Quick Answers</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            {
              q: `If I invest $${monthlyInvestment}/month, how much will I have in 12 months?`,
              a: formatCurrency(proj12),
              color: "text-[hsl(var(--accent))]",
            },
            {
              q: `If I pay off a debt of $${debtAmount}, how much does my free balance improve?`,
              a: `+${formatCurrency(debtImpact)}/mo`,
              color: "text-[hsl(var(--risk-low))]",
            },
            {
              q: `If I cut $${expenseCut} in fixed expenses, what's the annual impact?`,
              a: `+${formatCurrency(annualExpenseCutImpact)}/yr`,
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
