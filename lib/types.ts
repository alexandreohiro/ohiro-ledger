export type TransactionType =
  | "Receita"
  | "Gasto"
  | "Dívida"
  | "Investimento"
  | "Transferência"
  | "Reserva";

export type TransactionStatus =
  | "Previsto"
  | "Pago"
  | "Pendente"
  | "Atrasado"
  | "Recorrente";

export type Currency = "BRL" | "USD" | "EUR";

export type RecurrenceType = "Mensal" | "Semanal" | "Anual" | "Única" | "Nenhuma";

export interface Transaction {
  id: string;
  date: string;
  account: string;
  type: TransactionType;
  category: string;
  subcategory: string;
  description: string;
  amount: number;
  currency: Currency;
  exchangeRate: number;
  status: TransactionStatus;
  dueDate?: string;
  recurrence: RecurrenceType;
}

export type InvestmentClass =
  | "Renda Fixa"
  | "Renda Variável"
  | "Conta Global"
  | "Cripto"
  | "Reserva de Emergência"
  | "Outros";

export interface Investment {
  id: string;
  assetName: string;
  class: InvestmentClass;
  amount: number;
  currency: Currency;
  exchangeRate: number;
  convertedAmountBRL: number;
  monthlyContribution: number;
}

export type DebtStatus = "Ativo" | "Quitado" | "Atrasado" | "Renegociado";
export type DebtPriority = "Baixo" | "Médio" | "Alto" | "Crítico";

export interface Debt {
  id: string;
  creditor: string;
  originalAmount: number;
  currentAmount: number;
  installmentAmount: number;
  dueDate?: string;
  /** Percentual mensal, ex.: 8.5 = 8,5% a.m. (não fração decimal) */
  interestRate: number;
  status: DebtStatus;
  priority: DebtPriority;
}

export type RiskLevel = "Baixo" | "Médio" | "Alto" | "Crítico";

export interface FinancialSummary {
  totalRevenue: number;
  totalExpenses: number;
  totalDebts: number;
  totalInvestments: number;
  freeBalance: number;
  incomeCommitment: number;
  investmentRate: number;
  riskLevel: RiskLevel;
  totalPatrimony: number;
}

export type ActiveView = "dashboard" | "ledger" | "gastos" | "receitas" | "dividas" | "investimentos" | "projecoes" | "ia" | "configuracoes";
