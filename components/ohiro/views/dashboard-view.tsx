"use client";

import { Transaction, Investment, FinancialSummary } from "@/lib/types";
import {
  calcFinancialSummary,
  formatCurrency,
  formatPercent,
  groupByCategory,
  getAmountInBRL,
} from "@/lib/calculations";
import { SummaryCard } from "../summary-card";
import { RiskBadge, StatusBadge } from "../risk-badge";
import {
  TrendingUp,
  TrendingDown,
  CreditCard,
  LineChart,
  Wallet,
  Building2,
  AlertTriangle,
  PieChart,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import {
  PieChart as RechartsPie,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

interface DashboardViewProps {
  transactions: Transaction[];
  investments: Investment[];
}

const CATEGORY_COLORS: Record<string, string> = {
  "Cartão de Crédito": "hsl(0 60% 50%)",
  "Internet": "hsl(200 70% 50%)",
  "Alimentação": "hsl(35 90% 55%)",
  "Transporte": "hsl(160 50% 50%)",
  "Igreja": "hsl(280 50% 60%)",
  "Banco": "hsl(0 70% 40%)",
  "Salário": "hsl(142 60% 45%)",
  "Benefícios": "hsl(142 50% 55%)",
  "Adicionais": "hsl(142 40% 60%)",
  "Renda Fixa": "hsl(60 70% 50%)",
  "Conta Global": "hsl(200 80% 55%)",
  "default": "hsl(var(--muted-foreground))",
};

function getCategoryColor(cat: string): string {
  return CATEGORY_COLORS[cat] ?? CATEGORY_COLORS.default;
}

interface CategoryCardProps {
  category: string;
  transactions: Transaction[];
  totalRevenue: number;
}

function CategoryCard({ category, transactions, totalRevenue }: CategoryCardProps) {
  const total = transactions.reduce((s, t) => s + getAmountInBRL(t), 0);
  const pct = totalRevenue > 0 ? (total / totalRevenue) * 100 : 0;
  const color = getCategoryColor(category);

  return (
    <div className="flex flex-col gap-2 p-3 rounded-md border border-border/40 bg-card/40">
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono font-medium text-foreground truncate">{category}</span>
        <span className="text-xs font-mono text-muted-foreground">{transactions.length}x</span>
      </div>
      <div className="text-base font-mono font-bold text-foreground">
        {formatCurrency(total)}
      </div>
      <div className="flex items-center gap-2">
        <Progress
          value={Math.min(pct, 100)}
          className="h-1 flex-1"
          style={{ "--progress-color": color } as React.CSSProperties}
        />
        <span className="text-[10px] font-mono text-muted-foreground">{formatPercent(pct)}</span>
      </div>
    </div>
  );
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: { color: string } }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="bg-card border border-border/60 rounded-md px-3 py-2 shadow-xl">
      <div className="text-[11px] font-mono text-muted-foreground">{item.name}</div>
      <div className="text-sm font-mono font-bold text-foreground">{formatCurrency(item.value)}</div>
    </div>
  );
}

export function DashboardView({ transactions, investments }: DashboardViewProps) {
  const summary = calcFinancialSummary(transactions, investments);
  const expenses = transactions.filter((t) => t.type === "Gasto" || t.type === "Dívida");
  const grouped = groupByCategory(expenses);

  const pieData = Object.entries(grouped).map(([cat, txns]) => ({
    name: cat,
    value: txns.reduce((s, t) => s + getAmountInBRL(t), 0),
    color: getCategoryColor(cat),
  })).sort((a, b) => b.value - a.value);

  const recentTransactions = [...transactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  const balanceVariant =
    summary.freeBalance > 0 ? "positive" : summary.freeBalance < 0 ? "critical" : "warning";
  const riskVariant =
    summary.riskLevel === "Baixo" ? "positive" :
    summary.riskLevel === "Médio" ? "warning" :
    "critical";

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-[1400px] mx-auto">

      {/* Summary cards */}
      <section>
        <div className="text-[11px] font-mono text-muted-foreground/50 tracking-widest uppercase mb-3">
          Resumo Operacional
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <SummaryCard
            title="Receita Total"
            value={formatCurrency(summary.totalRevenue)}
            icon={TrendingUp}
            variant="positive"
            subtitle="Fluxo de entrada"
            trendLabel="Renda bruta do mês"
            trend="up"
          />
          <SummaryCard
            title="Gastos Totais"
            value={formatCurrency(summary.totalExpenses)}
            icon={TrendingDown}
            variant="warning"
            subtitle="Saídas confirmadas"
            trendLabel={`${formatPercent((summary.totalExpenses / summary.totalRevenue) * 100)} da renda`}
            trend="down"
          />
          <SummaryCard
            title="Dívidas do Mês"
            value={formatCurrency(summary.totalDebts)}
            icon={CreditCard}
            variant="critical"
            subtitle="Compromissos ativos"
            trendLabel="Obrigações pendentes"
            trend="down"
          />
          <SummaryCard
            title="Investimentos"
            value={formatCurrency(summary.totalInvestments)}
            icon={LineChart}
            variant="accent"
            subtitle="Aportes do mês"
            trendLabel={`${formatPercent(summary.investmentRate)} da renda`}
            trend="up"
          />
        </div>
      </section>

      {/* Second row */}
      <section>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <SummaryCard
            title="Saldo Livre"
            value={formatCurrency(summary.freeBalance)}
            icon={Wallet}
            variant={balanceVariant}
            subtitle="Saldo operacional"
            description={summary.freeBalance >= 0 ? "Situação controlada" : "Deficit no mês"}
          />
          <SummaryCard
            title="Patrimônio Total"
            value={formatCurrency(summary.totalPatrimony)}
            icon={Building2}
            variant="accent"
            subtitle="Carteira consolidada"
            description="Investimentos em BRL"
          />
          <SummaryCard
            title="Renda Comprometida"
            value={formatPercent(summary.incomeCommitment)}
            icon={AlertTriangle}
            variant={riskVariant}
            subtitle="% dos gastos + dívidas"
            badge={<RiskBadge level={summary.riskLevel} size="sm" />}
          />
          <SummaryCard
            title="Taxa de Investimento"
            value={formatPercent(summary.investmentRate)}
            icon={PieChart}
            variant="accent"
            subtitle="% da renda investida"
            description="Proporção de poupança"
          />
        </div>
      </section>

      {/* Chart + Recent */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Pie chart */}
        <div className="lg:col-span-1 rounded-lg border border-border/40 bg-card/60 p-4">
          <div className="text-[11px] font-mono text-muted-foreground/50 tracking-widest uppercase mb-3">
            Distribuição de Gastos
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <RechartsPie>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={2}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} stroke="transparent" />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </RechartsPie>
          </ResponsiveContainer>
          <div className="flex flex-col gap-1.5 mt-2">
            {pieData.slice(0, 4).map((item) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full" style={{ background: item.color }} />
                  <span className="font-mono text-muted-foreground truncate max-w-[100px]">{item.name}</span>
                </div>
                <span className="font-mono text-foreground">{formatCurrency(item.value)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent transactions */}
        <div className="lg:col-span-2 rounded-lg border border-border/40 bg-card/60 p-4">
          <div className="text-[11px] font-mono text-muted-foreground/50 tracking-widest uppercase mb-3">
            Lançamentos Recentes
          </div>
          <div className="flex flex-col gap-2">
            {recentTransactions.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between py-2 border-b border-border/30 last:border-0"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`size-1.5 rounded-full shrink-0 ${
                    t.type === "Receita" ? "bg-[hsl(var(--risk-low))]" :
                    t.type === "Investimento" ? "bg-[hsl(var(--accent))]" :
                    t.type === "Dívida" ? "bg-[hsl(var(--risk-critical))]" :
                    "bg-[hsl(var(--risk-medium))]"
                  }`} />
                  <div className="min-w-0">
                    <div className="text-xs font-mono text-foreground truncate">{t.description}</div>
                    <div className="text-[10px] font-mono text-muted-foreground">{t.date} · {t.category}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <StatusBadge status={t.status} />
                  <span className={`text-xs font-mono font-bold ${
                    t.type === "Receita" ? "text-[hsl(var(--risk-low))]" : "text-foreground"
                  }`}>
                    {t.type === "Receita" ? "+" : "-"}{formatCurrency(getAmountInBRL(t))}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Category breakdown */}
      <section>
        <div className="text-[11px] font-mono text-muted-foreground/50 tracking-widest uppercase mb-3">
          Gastos por Categoria
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {Object.entries(grouped).map(([cat, txns]) => (
            <CategoryCard
              key={cat}
              category={cat}
              transactions={txns}
              totalRevenue={summary.totalRevenue}
            />
          ))}
        </div>
      </section>

      {/* Risk indicator */}
      <section className="rounded-lg border border-border/40 bg-card/60 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[11px] font-mono text-muted-foreground/50 tracking-widest uppercase">
            Indicador de Saúde Financeira
          </div>
          <RiskBadge level={summary.riskLevel} size="md" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-[10px] font-mono text-muted-foreground mb-1 tracking-wider">COMPROMETIMENTO</div>
            <Progress
              value={Math.min(summary.incomeCommitment, 100)}
              className="h-2 mb-1"
            />
            <div className="text-sm font-mono font-bold text-foreground">{formatPercent(summary.incomeCommitment)}</div>
          </div>
          <div>
            <div className="text-[10px] font-mono text-muted-foreground mb-1 tracking-wider">TAXA DE INVESTIMENTO</div>
            <Progress
              value={Math.min(summary.investmentRate, 100)}
              className="h-2 mb-1"
            />
            <div className="text-sm font-mono font-bold text-foreground">{formatPercent(summary.investmentRate)}</div>
          </div>
          <div>
            <div className="text-[10px] font-mono text-muted-foreground mb-1 tracking-wider">SALDO LIVRE / RECEITA</div>
            <Progress
              value={Math.max(0, Math.min((summary.freeBalance / summary.totalRevenue) * 100, 100))}
              className="h-2 mb-1"
            />
            <div className="text-sm font-mono font-bold text-foreground">
              {formatPercent(Math.max(0, (summary.freeBalance / summary.totalRevenue) * 100))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
