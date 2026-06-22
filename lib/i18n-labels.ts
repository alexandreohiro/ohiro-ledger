/**
 * Camada de tradução visual EN — os dados continuam gravados em português no
 * banco (enums com check constraints), mas a UI/IA exibem tudo em inglês.
 * Não usar para persistir dados: sempre grave o valor original em português.
 */
import type {
  TransactionType,
  TransactionStatus,
  RecurrenceType,
  InvestmentClass,
  DebtStatus,
  DebtPriority,
  RiskLevel,
} from "./types";

export const TRANSACTION_TYPE_LABEL: Record<TransactionType, string> = {
  Receita: "Income",
  Gasto: "Expense",
  Dívida: "Debt",
  Investimento: "Investment",
  Transferência: "Transfer",
  Reserva: "Reserve",
};

export const TRANSACTION_STATUS_LABEL: Record<TransactionStatus, string> = {
  Previsto: "Planned",
  Pago: "Paid",
  Pendente: "Pending",
  Atrasado: "Overdue",
  Recorrente: "Recurring",
};

export const RECURRENCE_LABEL: Record<RecurrenceType, string> = {
  Mensal: "Monthly",
  Semanal: "Weekly",
  Anual: "Yearly",
  Única: "One-time",
  Nenhuma: "None",
};

export const INVESTMENT_CLASS_LABEL: Record<InvestmentClass, string> = {
  "Renda Fixa": "Fixed Income",
  "Renda Variável": "Equities",
  "Conta Global": "Global Account",
  Cripto: "Crypto",
  "Reserva de Emergência": "Emergency Fund",
  Outros: "Other",
};

export const DEBT_STATUS_LABEL: Record<DebtStatus, string> = {
  Ativo: "Active",
  Quitado: "Paid Off",
  Atrasado: "Overdue",
  Renegociado: "Renegotiated",
};

export const DEBT_PRIORITY_LABEL: Record<DebtPriority, string> = {
  Baixo: "Low",
  Médio: "Medium",
  Alto: "High",
  Crítico: "Critical",
};

export const RISK_LEVEL_LABEL: Record<RiskLevel, string> = {
  Baixo: "Low",
  Médio: "Medium",
  Alto: "High",
  Crítico: "Critical",
};

// Categorias e subcategorias de transações (PT interno → EN exibido)
export const CATEGORY_LABEL: Record<string, string> = {
  // Receita / Income
  "Salário": "Salary",
  "13º Salário": "13th Salary",
  "Férias": "Vacation Pay",
  "Benefícios": "Benefits",
  "Vale Refeição": "Meal Voucher",
  "Vale Transporte": "Transit Voucher",
  "Adicionais": "Allowances",
  "Hora Extra": "Overtime",
  "Bônus": "Bonus",
  "Freelance": "Freelance",
  "Aluguel Recebido": "Rental Income",
  "Dividendos": "Dividends",
  "Pensão Recebida": "Alimony Received",
  "Outros": "Other",
  // Gasto / Expense
  "Alimentação": "Food",
  "Supermercado": "Groceries",
  "Restaurante": "Restaurant",
  "Delivery": "Delivery",
  "Moradia": "Housing",
  "Aluguel": "Rent",
  "Condomínio": "HOA Fee",
  "IPTU": "Property Tax",
  "Água": "Water",
  "Luz": "Electricity",
  "Gás": "Gas",
  "Internet": "Internet",
  "Telefone": "Phone",
  "Transporte": "Transportation",
  "Combustível": "Fuel",
  "Uber / Táxi": "Rideshare / Taxi",
  "Estacionamento": "Parking",
  "Manutenção Veículo": "Vehicle Maintenance",
  "Saúde": "Health",
  "Farmácia": "Pharmacy",
  "Plano de Saúde": "Health Insurance",
  "Dentista": "Dentist",
  "Educação": "Education",
  "Cursos": "Courses",
  "Material Escolar": "School Supplies",
  "Lazer": "Entertainment",
  "Streaming": "Streaming",
  "Assinaturas": "Subscriptions",
  "Roupas": "Clothing",
  "Beleza": "Beauty",
  "Academia": "Gym",
  "Cartão de Crédito": "Credit Card",
  "Financiamento": "Loan Payment",
  "Igreja": "Church",
  "Doações": "Donations",
  // Dívida / Debt
  "Cheque Especial": "Overdraft",
  "Empréstimo Pessoal": "Personal Loan",
  "Empréstimo Consignado": "Payroll Loan",
  "Financiamento Veículo": "Auto Loan",
  "Financiamento Imóvel": "Mortgage",
  "Banco": "Bank",
  "Crediário": "Installment Credit",
  "Pensão Alimentícia": "Child Support",
  // Investimento / Investment
  "Renda Fixa": "Fixed Income",
  "CDB": "CD (Certificate of Deposit)",
  "LCI / LCA": "Tax-exempt Bond",
  "Tesouro Direto": "Treasury Bonds",
  "Renda Variável": "Equities",
  "Ações": "Stocks",
  "FIIs": "REITs",
  "ETF": "ETF",
  "Conta Global": "Global Account",
  "Cripto": "Crypto",
  "Previdência Privada": "Private Pension",
  "Reserva de Emergência": "Emergency Fund",
  "Poupança": "Savings Account",
};

export function translateCategory(category: string): string {
  return CATEGORY_LABEL[category] ?? category;
}
