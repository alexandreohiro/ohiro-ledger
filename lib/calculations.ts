import { Transaction, Investment, FinancialSummary, RiskLevel } from "./types";

/** Converte para a moeda base do sistema (USD), usando exchangeRate quando a transação não está em USD. */
export function getAmountInUSD(transaction: Transaction): number {
  if (transaction.currency === "USD") return transaction.amount;
  return transaction.amount * (transaction.exchangeRate || 1);
}

export function calcTotalRevenue(transactions: Transaction[]): number {
  return transactions
    .filter((t) => t.type === "Receita")
    .reduce((sum, t) => sum + getAmountInUSD(t), 0);
}

export function calcTotalExpenses(transactions: Transaction[]): number {
  return transactions
    .filter((t) => t.type === "Gasto")
    .reduce((sum, t) => sum + getAmountInUSD(t), 0);
}

export function calcTotalDebts(transactions: Transaction[]): number {
  return transactions
    .filter((t) => t.type === "Dívida")
    .reduce((sum, t) => sum + getAmountInUSD(t), 0);
}

export function calcTotalInvestments(transactions: Transaction[]): number {
  return transactions
    .filter((t) => t.type === "Investimento")
    .reduce((sum, t) => sum + getAmountInUSD(t), 0);
}

export function calcFreeBalance(
  totalRevenue: number,
  totalExpenses: number,
  totalDebts: number,
  totalInvestments: number
): number {
  return totalRevenue - totalExpenses - totalDebts - totalInvestments;
}

export function calcIncomeCommitment(
  totalExpenses: number,
  totalDebts: number,
  totalRevenue: number
): number {
  if (totalRevenue === 0) return 0;
  return ((totalExpenses + totalDebts) / totalRevenue) * 100;
}

export function calcInvestmentRate(
  totalInvestments: number,
  totalRevenue: number
): number {
  if (totalRevenue === 0) return 0;
  return (totalInvestments / totalRevenue) * 100;
}

export function calcRiskLevel(incomeCommitment: number): RiskLevel {
  if (incomeCommitment <= 50) return "Baixo";
  if (incomeCommitment <= 70) return "Médio";
  if (incomeCommitment <= 90) return "Alto";
  return "Crítico";
}

export function calcTotalPatrimony(investments: Investment[]): number {
  return investments.reduce((sum, inv) => sum + inv.convertedAmountBRL, 0);
}

// ── Ohiro Score — pontuação composta de saúde financeira (0-100) ────────────────
// Pesos: comprometimento de renda (50%), taxa de investimento (30%), saldo livre (20%)
export interface OhiroScore {
  value: number;
  label: "Crítico" | "Atenção" | "Saudável" | "Excelente";
  insight: string;
}

export function calcOhiroScore(summary: Pick<FinancialSummary, "incomeCommitment" | "investmentRate" | "freeBalance" | "totalRevenue">): OhiroScore {
  const commitmentScore = Math.max(0, 100 - summary.incomeCommitment);
  const investmentScore = Math.min(100, summary.investmentRate * 5);
  const balanceRatio = summary.totalRevenue > 0 ? (summary.freeBalance / summary.totalRevenue) * 100 : 0;
  const balanceScore = Math.max(0, Math.min(100, balanceRatio * 4));

  const value = Math.round(commitmentScore * 0.5 + investmentScore * 0.3 + balanceScore * 0.2);

  let label: OhiroScore["label"];
  let insight: string;
  if (value < 40) {
    label = "Crítico";
    insight = summary.incomeCommitment > 70
      ? "Your committed income is too high — cut a fixed expense before it cuts your options."
      : "Your free balance is too thin — review essential spending this month.";
  } else if (value < 65) {
    label = "Atenção";
    insight = summary.investmentRate < 10
      ? "You're not investing enough of your income — even a small recurring contribution moves this score."
      : "You're close to balanced — keep commitments below 70% of income.";
  } else if (value < 85) {
    label = "Saudável";
    insight = "Solid month — your spending and saving are in a healthy range.";
  } else {
    label = "Excelente";
    insight = "Excellent control — your income, spending and investing are well balanced.";
  }

  return { value: Math.max(0, Math.min(100, value)), label, insight };
}

export function calcFinancialSummary(
  transactions: Transaction[],
  investments: Investment[]
): FinancialSummary {
  const totalRevenue = calcTotalRevenue(transactions);
  const totalExpenses = calcTotalExpenses(transactions);
  const totalDebts = calcTotalDebts(transactions);
  const totalInvestments = calcTotalInvestments(transactions);
  const freeBalance = calcFreeBalance(totalRevenue, totalExpenses, totalDebts, totalInvestments);
  const incomeCommitment = calcIncomeCommitment(totalExpenses, totalDebts, totalRevenue);
  const investmentRate = calcInvestmentRate(totalInvestments, totalRevenue);
  const riskLevel = calcRiskLevel(incomeCommitment);
  const totalPatrimony = calcTotalPatrimony(investments);

  return {
    totalRevenue,
    totalExpenses,
    totalDebts,
    totalInvestments,
    freeBalance,
    incomeCommitment,
    investmentRate,
    riskLevel,
    totalPatrimony,
  };
}

const CURRENCY_LOCALE: Record<string, string> = {
  USD: "en-US",
  BRL: "pt-BR",
  EUR: "de-DE",
};

export function formatCurrency(value: number, currency = "USD"): string {
  return new Intl.NumberFormat(CURRENCY_LOCALE[currency] ?? "en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(value);
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function calcProjectionFV(
  monthlyContribution: number,
  months: number,
  annualRate = 0.08
): number {
  const monthlyRate = annualRate / 12;
  if (monthlyRate === 0) return monthlyContribution * months;
  return (
    monthlyContribution *
    ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate) *
    (1 + monthlyRate)
  );
}

export function groupByCategory(transactions: Transaction[]): Record<string, Transaction[]> {
  return transactions.reduce((acc, t) => {
    const key = t.category;
    if (!acc[key]) acc[key] = [];
    acc[key].push(t);
    return acc;
  }, {} as Record<string, Transaction[]>);
}

// ── Month helpers ──────────────────────────────────────────────────────────────

/** Returns "YYYY-MM" key for a transaction date string */
export function txMonthKey(dateStr: string): string {
  return dateStr.slice(0, 7);
}

/** Formats "YYYY-MM" to "Jan/2025" */
export function formatMonthLabel(key: string): string {
  const [year, month] = key.split("-");
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${MONTHS[parseInt(month, 10) - 1]}/${year}`;
}

/** Formats a month index (0-11) + year to "January 2025" */
export function formatMonthYear(month: number, year: number): string {
  const MONTHS = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];
  return `${MONTHS[month]} ${year}`;
}

/** Formats a month index to short label */
export function formatMonthShort(month: number, year: number): string {
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${MONTHS[month]}/${String(year).slice(2)}`;
}

/** Returns sorted list of unique "YYYY-MM" keys that have transactions */
export function getAvailableMonths(transactions: Transaction[]): string[] {
  const keys = new Set(transactions.map((t) => txMonthKey(t.date)));
  return Array.from(keys).sort();
}

/** Filters transactions to a specific month+year */
export function filterByMonth(transactions: Transaction[], month: number, year: number): Transaction[] {
  const key = `${year}-${String(month + 1).padStart(2, "0")}`;
  return transactions.filter((t) => txMonthKey(t.date) === key);
}

/** Builds monthly chart data (last N months or all available) */
export interface MonthlyChartPoint {
  label: string;
  key: string;
  receita: number;
  gastos: number;
  dividas: number;
  investimentos: number;
  saldo: number;
}

export function buildMonthlyChartData(transactions: Transaction[], limitMonths = 12): MonthlyChartPoint[] {
  const months = getAvailableMonths(transactions).slice(-limitMonths);
  return months.map((key) => {
    const [year, month] = key.split("-").map(Number);
    const monthTx = transactions.filter((t) => txMonthKey(t.date) === key);
    const receita = calcTotalRevenue(monthTx);
    const gastos = calcTotalExpenses(monthTx);
    const dividas = calcTotalDebts(monthTx);
    const investimentos = calcTotalInvestments(monthTx);
    return {
      label: formatMonthShort(month - 1, year),
      key,
      receita,
      gastos,
      dividas,
      investimentos,
      saldo: receita - gastos - dividas - investimentos,
    };
  });
}
