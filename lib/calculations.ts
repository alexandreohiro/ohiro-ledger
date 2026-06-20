import { Transaction, Investment, FinancialSummary, RiskLevel } from "./types";

export function getAmountInBRL(transaction: Transaction): number {
  if (transaction.currency === "BRL") return transaction.amount;
  return transaction.amount * (transaction.exchangeRate || 1);
}

export function calcTotalRevenue(transactions: Transaction[]): number {
  return transactions
    .filter((t) => t.type === "Receita")
    .reduce((sum, t) => sum + getAmountInBRL(t), 0);
}

export function calcTotalExpenses(transactions: Transaction[]): number {
  return transactions
    .filter((t) => t.type === "Gasto")
    .reduce((sum, t) => sum + getAmountInBRL(t), 0);
}

export function calcTotalDebts(transactions: Transaction[]): number {
  return transactions
    .filter((t) => t.type === "Dívida")
    .reduce((sum, t) => sum + getAmountInBRL(t), 0);
}

export function calcTotalInvestments(transactions: Transaction[]): number {
  return transactions
    .filter((t) => t.type === "Investimento")
    .reduce((sum, t) => sum + getAmountInBRL(t), 0);
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

export function formatCurrency(value: number, currency = "BRL"): string {
  return new Intl.NumberFormat("pt-BR", {
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
