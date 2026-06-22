"use client";

import { useMemo } from "react";
import { Transaction, Investment } from "@/lib/types";
import {
  calcFinancialSummary,
  formatCurrency,
  formatPercent,
  groupByCategory,
  getAmountInUSD,
  buildMonthlyChartData,
  formatMonthLabel,
} from "@/lib/calculations";
import { SummaryCard } from "../summary-card";
import { RiskBadge, StatusBadge } from "../risk-badge";
import {
  TrendingUp,
  TrendingDown,
  CreditCard,
  LineChart as LineChartIcon,
  Wallet,
  Building2,
  AlertTriangle,
  PieChart as PieChartIcon,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  Legend,
} from "recharts";

interface DashboardViewProps {
  transactions: Transaction[];
  monthTransactions: Transaction[];
  investments: Investment[];
  selectedMonthKey: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  // Receitas — tons de verde
  "Salário":               "hsl(142 58% 44%)",
  "13º Salário":           "hsl(142 55% 50%)",
  "Férias":                "hsl(148 50% 52%)",
  "Benefícios":            "hsl(155 46% 50%)",
  "Vale Refeição":         "hsl(160 44% 48%)",
  "Vale Transporte":       "hsl(165 42% 46%)",
  "Adicionais":            "hsl(148 42% 56%)",
  "Hora Extra":            "hsl(148 40% 54%)",
  "Bônus":                 "hsl(145 52% 48%)",
  "Freelance":             "hsl(165 54% 46%)",
  "Dividendos":            "hsl(152 48% 44%)",
  // Gastos essenciais — tons frios
  "Alimentação":           "hsl(197 70% 52%)",
  "Supermercado":          "hsl(200 68% 50%)",
  "Restaurante":           "hsl(204 66% 50%)",
  "Delivery":              "hsl(208 64% 52%)",
  "Moradia":               "hsl(252 52% 58%)",
  "Aluguel":               "hsl(255 50% 56%)",
  "Condomínio":            "hsl(258 48% 54%)",
  "IPTU":                  "hsl(260 46% 52%)",
  "Água":                  "hsl(195 72% 50%)",
  "Luz":                   "hsl(52  80% 52%)",
  "Gás":                   "hsl(28  76% 54%)",
  "Internet":              "hsl(212 68% 52%)",
  "Telefone":              "hsl(215 66% 50%)",
  // Transporte — azul-petróleo
  "Transporte":            "hsl(180 55% 46%)",
  "Combustível":           "hsl(183 52% 44%)",
  "Uber / Táxi":           "hsl(186 50% 46%)",
  "Estacionamento":        "hsl(189 48% 44%)",
  "Manutenção Veículo":    "hsl(192 46% 44%)",
  // Saúde — rosa
  "Saúde":                 "hsl(342 62% 54%)",
  "Farmácia":              "hsl(345 60% 52%)",
  "Plano de Saúde":        "hsl(348 58% 50%)",
  "Dentista":              "hsl(352 56% 50%)",
  // Educação — azul
  "Educação":              "hsl(225 68% 54%)",
  "Cursos":                "hsl(228 66% 52%)",
  "Material Escolar":      "hsl(231 64% 50%)",
  // Lazer e estilo — amarelo-âmbar
  "Lazer":                 "hsl(38  82% 54%)",
  "Streaming":             "hsl(34  80% 52%)",
  "Assinaturas":           "hsl(36  78% 52%)",
  "Roupas":                "hsl(42  76% 52%)",
  "Beleza":                "hsl(328 58% 52%)",
  "Academia":              "hsl(22  72% 52%)",
  // Dívidas — vermelho
  "Cartão de Crédito":     "hsl(0   62% 50%)",
  "Cheque Especial":       "hsl(4   60% 48%)",
  "Empréstimo Pessoal":    "hsl(8   58% 48%)",
  "Empréstimo Consignado": "hsl(12  56% 48%)",
  "Financiamento Veículo": "hsl(16  58% 48%)",
  "Financiamento Imóvel":  "hsl(18  56% 48%)",
  "Banco":                 "hsl(2   68% 42%)",
  // Igreja / Doações — lilás
  "Igreja":                "hsl(278 46% 58%)",
  "Doações":               "hsl(282 44% 56%)",
  // Investimentos — dourado
  "Renda Fixa":            "hsl(48  78% 50%)",
  "CDB":                   "hsl(50  76% 50%)",
  "LCI / LCA":             "hsl(52  74% 48%)",
  "Tesouro Direto":        "hsl(54  72% 48%)",
  "Renda Variável":        "hsl(200 72% 54%)",
  "Ações":                 "hsl(202 70% 52%)",
  "FIIs":                  "hsl(204 68% 52%)",
  "ETF":                   "hsl(206 66% 50%)",
  "Conta Global":          "hsl(210 72% 54%)",
  "Cripto":                "hsl(275 54% 58%)",
  "Previdência Privada":   "hsl(46  76% 50%)",
  "Reserva de Emergência": "hsl(142 50% 50%)",
  "Poupança":              "hsl(144 48% 48%)",
  "Financiamento":         "hsl(16  58% 48%)",
  // "Outros" — laranja bem distinto
  "Outros":                "hsl(28  85% 56%)",
  default:                 "hsl(28  85% 56%)",
};

function getCategoryColor(cat: string): string {
  return CATEGORY_COLORS[cat] ?? CATEGORY_COLORS.default;
}

// ── Custom Tooltip ─────────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border/60 rounded-md px-3 py-2 shadow-xl text-xs font-mono min-w-[160px]">
      {label && <div className="text-muted-foreground mb-1.5 font-semibold">{label}</div>}
      {payload.map((p) => (
        <div key={p.name} className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full" style={{ background: p.color }} />
            <span className="text-muted-foreground capitalize">{p.name}</span>
          </div>
          <span className="font-bold text-foreground">{formatCurrency(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

function PieTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; payload: { color: string } }> }) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="bg-card border border-border/60 rounded-md px-3 py-2 shadow-xl text-xs font-mono">
      <div className="text-muted-foreground">{item.name}</div>
      <div className="font-bold text-foreground">{formatCurrency(item.value)}</div>
    </div>
  );
}

export function DashboardView({ transactions, monthTransactions, investments, selectedMonthKey }: DashboardViewProps) {
  const summary = calcFinancialSummary(monthTransactions, investments);

  // Gastos + dívidas do mês selecionado
  const monthExpenses = useMemo(
    () => monthTransactions.filter((t) => t.type === "Gasto" || t.type === "Dívida"),
    [monthTransactions]
  );
  const grouped = useMemo(() => groupByCategory(monthExpenses), [monthExpenses]);

  // Dados para gráficos históricos (todos os meses)
  const monthlyData = useMemo(() => buildMonthlyChartData(transactions, 12), [transactions]);

  // Pie data (gastos do mês)
  const pieData = useMemo(
    () =>
      Object.entries(grouped)
        .map(([cat, txns]) => ({
          name: cat,
          value: txns.reduce((s, t) => s + getAmountInUSD(t), 0),
          color: getCategoryColor(cat),
        }))
        .sort((a, b) => b.value - a.value),
    [grouped]
  );

  const recentTransactions = useMemo(
    () => [...monthTransactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 8),
    [monthTransactions]
  );

  const balanceVariant = summary.freeBalance > 0 ? "positive" : summary.freeBalance < 0 ? "critical" : "warning";
  const riskVariant = summary.riskLevel === "Baixo" ? "positive" : summary.riskLevel === "Médio" ? "warning" : "critical";
  const monthLabel = formatMonthLabel(selectedMonthKey);

  return (
    <div className="flex flex-col gap-5 p-4 md:p-6 max-w-[1600px] mx-auto">

      {/* Header label */}
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-mono text-muted-foreground/50 tracking-widest uppercase">
          Resumo Operacional — {monthLabel}
        </div>
        {monthTransactions.length === 0 && (
          <div className="text-[11px] font-mono text-muted-foreground/60 bg-muted/30 px-3 py-1 rounded-md border border-border/30">
            Nenhum lançamento neste mês
          </div>
        )}
      </div>

      {/* Row 1 — KPI cards */}
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
          trendLabel={summary.totalRevenue > 0 ? `${formatPercent((summary.totalExpenses / summary.totalRevenue) * 100)} da renda` : "—"}
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
          icon={LineChartIcon}
          variant="accent"
          subtitle="Aportes do mês"
          trendLabel={summary.totalRevenue > 0 ? `${formatPercent(summary.investmentRate)} da renda` : "—"}
          trend="up"
        />
      </div>

      {/* Row 2 — balance KPIs */}
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
          subtitle="% gastos + dívidas"
          badge={<RiskBadge level={summary.riskLevel} size="sm" />}
        />
        <SummaryCard
          title="Taxa de Investimento"
          value={formatPercent(summary.investmentRate)}
          icon={PieChartIcon}
          variant="accent"
          subtitle="% da renda investida"
          description="Proporção de poupança"
        />
      </div>

      {/* Row 3 — Bar chart + Pie chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Bar chart histórico */}
        <div className="lg:col-span-2 rounded-lg border border-border/40 bg-card/60 p-4">
          <div className="text-[11px] font-mono text-muted-foreground/50 tracking-widest uppercase mb-4">
            Histórico Receita vs Gastos (últimos {monthlyData.length} meses)
          </div>
          {monthlyData.length === 0 ? (
            <div className="flex items-center justify-center h-[200px] text-muted-foreground text-xs font-mono">
              Sem dados históricos
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyData} barCategoryGap="30%" barGap={2}>
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
                  width={40}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "hsl(var(--muted) / 0.3)" }} />
                <Legend
                  wrapperStyle={{ fontSize: 10, fontFamily: "var(--font-mono)", paddingTop: 8 }}
                  iconType="circle"
                  iconSize={8}
                />
                <Bar dataKey="receita" name="Receita" fill="hsl(var(--risk-low))" radius={[3, 3, 0, 0]} />
                <Bar dataKey="gastos" name="Gastos" fill="hsl(var(--risk-medium))" radius={[3, 3, 0, 0]} />
                <Bar dataKey="dividas" name="Dívidas" fill="hsl(var(--risk-critical))" radius={[3, 3, 0, 0]} />
                <Bar dataKey="investimentos" name="Investimentos" fill="hsl(var(--accent))" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Pie chart gastos do mês */}
        <div className="rounded-lg border border-border/40 bg-card/60 p-4">
          <div className="text-[11px] font-mono text-muted-foreground/50 tracking-widest uppercase mb-4">
            Distribuição de Gastos — {monthLabel}
          </div>
          {pieData.length === 0 ? (
            <div className="flex items-center justify-center h-[180px] text-muted-foreground text-xs font-mono">
              Sem gastos neste mês
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={78}
                    paddingAngle={2}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-col gap-1.5 mt-1">
                {pieData.slice(0, 5).map((item) => (
                  <div key={item.name} className="flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="size-2 rounded-full shrink-0" style={{ background: item.color }} />
                      <span className="text-muted-foreground truncate">{item.name}</span>
                    </div>
                    <span className="text-foreground font-medium shrink-0 ml-2">{formatCurrency(item.value)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Row 4 — Area chart evolução de saldo */}
      {monthlyData.length >= 2 && (
        <div className="rounded-lg border border-border/40 bg-card/60 p-4">
          <div className="text-[11px] font-mono text-muted-foreground/50 tracking-widest uppercase mb-4">
            Evolução do Saldo Livre
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={monthlyData}>
              <defs>
                <linearGradient id="gradSaldo" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
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
                width={40}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: "hsl(var(--primary))", strokeWidth: 1, strokeDasharray: "4 4" }} />
              <Area
                type="monotone"
                dataKey="saldo"
                name="Saldo"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#gradSaldo)"
                dot={{ fill: "hsl(var(--primary))", strokeWidth: 0, r: 3 }}
                activeDot={{ r: 5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Row 5 — Lançamentos recentes + Saúde financeira */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Lançamentos recentes */}
        <div className="lg:col-span-2 rounded-lg border border-border/40 bg-card/60 p-4">
          <div className="text-[11px] font-mono text-muted-foreground/50 tracking-widest uppercase mb-3">
            Lançamentos Recentes — {monthLabel}
          </div>
          {recentTransactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-xs font-mono">
              Nenhum lançamento neste mês
            </div>
          ) : (
            <div className="flex flex-col">
              {recentTransactions.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between py-2 border-b border-border/20 last:border-0"
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
                      {t.type === "Receita" ? "+" : "-"}{formatCurrency(getAmountInUSD(t))}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Saúde financeira */}
        <div className="rounded-lg border border-border/40 bg-card/60 p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="text-[11px] font-mono text-muted-foreground/50 tracking-widest uppercase">
              Saúde Financeira
            </div>
            <RiskBadge level={summary.riskLevel} size="md" />
          </div>
          <div className="flex flex-col gap-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="text-[10px] font-mono text-muted-foreground tracking-wider">COMPROMETIMENTO</div>
                <div className="text-xs font-mono font-bold text-foreground">{formatPercent(summary.incomeCommitment)}</div>
              </div>
              <Progress value={Math.min(summary.incomeCommitment, 100)} className="h-2" />
              <div className="text-[10px] font-mono text-muted-foreground mt-1">Meta: abaixo de 70%</div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="text-[10px] font-mono text-muted-foreground tracking-wider">TAXA DE INVESTIMENTO</div>
                <div className="text-xs font-mono font-bold text-foreground">{formatPercent(summary.investmentRate)}</div>
              </div>
              <Progress value={Math.min(summary.investmentRate, 100)} className="h-2" />
              <div className="text-[10px] font-mono text-muted-foreground mt-1">Meta: acima de 20%</div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="text-[10px] font-mono text-muted-foreground tracking-wider">SALDO LIVRE / RECEITA</div>
                <div className="text-xs font-mono font-bold text-foreground">
                  {formatPercent(Math.max(0, summary.totalRevenue > 0 ? (summary.freeBalance / summary.totalRevenue) * 100 : 0))}
                </div>
              </div>
              <Progress
                value={Math.max(0, Math.min(summary.totalRevenue > 0 ? (summary.freeBalance / summary.totalRevenue) * 100 : 0, 100))}
                className="h-2"
              />
              <div className="text-[10px] font-mono text-muted-foreground mt-1">Meta: acima de 10%</div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
