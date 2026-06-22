import { describe, it, expect } from "vitest";
import {
  getAmountInUSD,
  calcTotalRevenue,
  calcTotalExpenses,
  calcTotalDebts,
  calcTotalInvestments,
  calcFreeBalance,
  calcIncomeCommitment,
  calcInvestmentRate,
  calcRiskLevel,
  calcTotalPatrimony,
  calcFinancialSummary,
  calcProjectionFV,
  groupByCategory,
  txMonthKey,
  formatMonthLabel,
  getAvailableMonths,
  filterByMonth,
  buildMonthlyChartData,
} from "@/lib/calculations";
import type { Transaction, Investment } from "@/lib/types";

// ── Fixtures ─────────────────────────────────────────────────────────────────

function makeTx(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: crypto.randomUUID(),
    date: "2025-06-15",
    account: "Conta Corrente",
    type: "Receita",
    category: "Salário",
    subcategory: "",
    description: "Salário mensal",
    amount: 1000,
    currency: "USD",
    exchangeRate: 1,
    status: "Pago",
    recurrence: "Mensal",
    ...overrides,
  };
}

function makeInv(overrides: Partial<Investment> = {}): Investment {
  return {
    id: crypto.randomUUID(),
    assetName: "Tesouro Direto",
    class: "Renda Fixa",
    amount: 5000,
    currency: "USD",
    exchangeRate: 1,
    convertedAmountBRL: 5000,
    monthlyContribution: 200,
    ...overrides,
  };
}

// ── getAmountInUSD ────────────────────────────────────────────────────────────

describe("getAmountInUSD", () => {
  it("retorna amount direto quando moeda é USD", () => {
    const tx = makeTx({ amount: 500, currency: "USD" });
    expect(getAmountInUSD(tx)).toBe(500);
  });

  it("converte BRL para USD usando exchangeRate", () => {
    const tx = makeTx({ amount: 500, currency: "BRL", exchangeRate: 0.2 });
    expect(getAmountInUSD(tx)).toBeCloseTo(100);
  });

  it("converte EUR para USD usando exchangeRate", () => {
    const tx = makeTx({ amount: 100, currency: "EUR", exchangeRate: 1.08 });
    expect(getAmountInUSD(tx)).toBeCloseTo(108);
  });

  it("usa exchangeRate=1 quando zero (fallback)", () => {
    const tx = makeTx({ amount: 200, currency: "BRL", exchangeRate: 0 });
    expect(getAmountInUSD(tx)).toBe(200);
  });
});

// ── calcTotalRevenue ──────────────────────────────────────────────────────────

describe("calcTotalRevenue", () => {
  it("soma apenas transações do tipo Receita", () => {
    const txs = [
      makeTx({ type: "Receita", amount: 3000 }),
      makeTx({ type: "Gasto", amount: 500 }),
      makeTx({ type: "Receita", amount: 1000 }),
    ];
    expect(calcTotalRevenue(txs)).toBe(4000);
  });

  it("retorna 0 para lista vazia", () => {
    expect(calcTotalRevenue([])).toBe(0);
  });

  it("retorna 0 se não houver Receita", () => {
    const txs = [makeTx({ type: "Gasto", amount: 500 })];
    expect(calcTotalRevenue(txs)).toBe(0);
  });
});

// ── calcTotalExpenses ─────────────────────────────────────────────────────────

describe("calcTotalExpenses", () => {
  it("soma apenas transações do tipo Gasto", () => {
    const txs = [
      makeTx({ type: "Gasto", amount: 400 }),
      makeTx({ type: "Receita", amount: 3000 }),
      makeTx({ type: "Gasto", amount: 600 }),
    ];
    expect(calcTotalExpenses(txs)).toBe(1000);
  });

  it("inclui conversão de moeda estrangeira", () => {
    const txs = [
      makeTx({ type: "Gasto", amount: 500, currency: "BRL", exchangeRate: 0.2 }),
    ];
    expect(calcTotalExpenses(txs)).toBe(100);
  });
});

// ── calcTotalDebts ────────────────────────────────────────────────────────────

describe("calcTotalDebts", () => {
  it("soma apenas tipo Dívida", () => {
    const txs = [
      makeTx({ type: "Dívida", amount: 200 }),
      makeTx({ type: "Receita", amount: 3000 }),
    ];
    expect(calcTotalDebts(txs)).toBe(200);
  });
});

// ── calcTotalInvestments ──────────────────────────────────────────────────────

describe("calcTotalInvestments", () => {
  it("soma apenas tipo Investimento", () => {
    const txs = [
      makeTx({ type: "Investimento", amount: 300 }),
      makeTx({ type: "Gasto", amount: 100 }),
    ];
    expect(calcTotalInvestments(txs)).toBe(300);
  });
});

// ── calcFreeBalance ───────────────────────────────────────────────────────────

describe("calcFreeBalance", () => {
  it("calcula saldo livre corretamente", () => {
    expect(calcFreeBalance(5000, 2000, 500, 800)).toBe(1700);
  });

  it("pode ser negativo (endividamento)", () => {
    expect(calcFreeBalance(1000, 2000, 0, 0)).toBe(-1000);
  });

  it("zero quando receita iguala despesas totais", () => {
    expect(calcFreeBalance(1000, 600, 200, 200)).toBe(0);
  });
});

// ── calcIncomeCommitment ──────────────────────────────────────────────────────

describe("calcIncomeCommitment", () => {
  it("calcula comprometimento de renda em %", () => {
    expect(calcIncomeCommitment(700, 300, 2000)).toBeCloseTo(50);
  });

  it("retorna 0 quando receita é zero (evita divisão por zero)", () => {
    expect(calcIncomeCommitment(500, 0, 0)).toBe(0);
  });

  it("pode ultrapassar 100% (over-committed)", () => {
    expect(calcIncomeCommitment(800, 400, 500)).toBeCloseTo(240);
  });
});

// ── calcInvestmentRate ────────────────────────────────────────────────────────

describe("calcInvestmentRate", () => {
  it("calcula taxa de investimento em %", () => {
    expect(calcInvestmentRate(500, 2000)).toBeCloseTo(25);
  });

  it("retorna 0 quando receita é zero", () => {
    expect(calcInvestmentRate(500, 0)).toBe(0);
  });
});

// ── calcRiskLevel ─────────────────────────────────────────────────────────────

describe("calcRiskLevel", () => {
  it.each([
    [0, "Baixo"],
    [50, "Baixo"],
    [51, "Médio"],
    [70, "Médio"],
    [71, "Alto"],
    [90, "Alto"],
    [91, "Crítico"],
    [200, "Crítico"],
  ])("incomeCommitment %i → %s", (input, expected) => {
    expect(calcRiskLevel(input)).toBe(expected);
  });
});

// ── calcTotalPatrimony ────────────────────────────────────────────────────────

describe("calcTotalPatrimony", () => {
  it("soma convertedAmountBRL de todos os investimentos", () => {
    const invs = [
      makeInv({ convertedAmountBRL: 10000 }),
      makeInv({ convertedAmountBRL: 5000 }),
    ];
    expect(calcTotalPatrimony(invs)).toBe(15000);
  });

  it("retorna 0 para lista vazia", () => {
    expect(calcTotalPatrimony([])).toBe(0);
  });
});

// ── calcFinancialSummary ──────────────────────────────────────────────────────

describe("calcFinancialSummary", () => {
  it("produz resumo financeiro completo e coerente", () => {
    const txs = [
      makeTx({ type: "Receita", amount: 5000 }),
      makeTx({ type: "Gasto", amount: 1500 }),
      makeTx({ type: "Dívida", amount: 500 }),
      makeTx({ type: "Investimento", amount: 500 }),
    ];
    const invs = [makeInv({ convertedAmountBRL: 10000 })];
    const summary = calcFinancialSummary(txs, invs);

    expect(summary.totalRevenue).toBe(5000);
    expect(summary.totalExpenses).toBe(1500);
    expect(summary.totalDebts).toBe(500);
    expect(summary.totalInvestments).toBe(500);
    expect(summary.freeBalance).toBe(2500);
    expect(summary.incomeCommitment).toBe(40);   // (1500+500)/5000*100
    expect(summary.investmentRate).toBe(10);      // 500/5000*100
    expect(summary.riskLevel).toBe("Baixo");
    expect(summary.totalPatrimony).toBe(10000);
  });
});

// ── calcProjectionFV ──────────────────────────────────────────────────────────

describe("calcProjectionFV", () => {
  it("retorna contribuição * meses quando taxa é 0", () => {
    // monthlyRate = 0/12 = 0 → FV = contribution * months
    expect(calcProjectionFV(1000, 12, 0)).toBe(12000);
  });

  it("FV positivo com taxa positiva", () => {
    const fv = calcProjectionFV(500, 24, 0.08);
    expect(fv).toBeGreaterThan(500 * 24); // capitalização aumenta o montante
  });

  it("FV cresce com o tempo (24 meses > 12 meses)", () => {
    const fv12 = calcProjectionFV(500, 12, 0.08);
    const fv24 = calcProjectionFV(500, 24, 0.08);
    expect(fv24).toBeGreaterThan(fv12);
  });
});

// ── groupByCategory ───────────────────────────────────────────────────────────

describe("groupByCategory", () => {
  it("agrupa transações por categoria", () => {
    const txs = [
      makeTx({ category: "Alimentação" }),
      makeTx({ category: "Transporte" }),
      makeTx({ category: "Alimentação" }),
    ];
    const grouped = groupByCategory(txs);
    expect(Object.keys(grouped)).toHaveLength(2);
    expect(grouped["Alimentação"]).toHaveLength(2);
    expect(grouped["Transporte"]).toHaveLength(1);
  });

  it("retorna objeto vazio para lista vazia", () => {
    expect(groupByCategory([])).toEqual({});
  });
});

// ── txMonthKey ────────────────────────────────────────────────────────────────

describe("txMonthKey", () => {
  it("extrai YYYY-MM de uma data ISO", () => {
    expect(txMonthKey("2025-06-15")).toBe("2025-06");
    expect(txMonthKey("2024-01-01")).toBe("2024-01");
  });
});

// ── formatMonthLabel ──────────────────────────────────────────────────────────

describe("formatMonthLabel", () => {
  it("formata chave YYYY-MM para label abreviado", () => {
    expect(formatMonthLabel("2025-01")).toBe("Jan/2025");
    expect(formatMonthLabel("2025-12")).toBe("Dec/2025");
    expect(formatMonthLabel("2025-06")).toBe("Jun/2025");
  });
});

// ── getAvailableMonths ────────────────────────────────────────────────────────

describe("getAvailableMonths", () => {
  it("retorna meses únicos ordenados", () => {
    const txs = [
      makeTx({ date: "2025-06-10" }),
      makeTx({ date: "2025-04-05" }),
      makeTx({ date: "2025-06-20" }),
    ];
    const months = getAvailableMonths(txs);
    expect(months).toEqual(["2025-04", "2025-06"]);
  });

  it("retorna lista vazia para transações vazias", () => {
    expect(getAvailableMonths([])).toEqual([]);
  });
});

// ── filterByMonth ─────────────────────────────────────────────────────────────

describe("filterByMonth", () => {
  it("filtra transações pelo mês e ano corretos", () => {
    const txs = [
      makeTx({ date: "2025-06-10" }),
      makeTx({ date: "2025-07-01" }),
      makeTx({ date: "2025-06-28" }),
    ];
    // month é 0-indexed (5 = Junho)
    const result = filterByMonth(txs, 5, 2025);
    expect(result).toHaveLength(2);
  });

  it("retorna vazio quando não há transações no mês", () => {
    const txs = [makeTx({ date: "2025-06-10" })];
    expect(filterByMonth(txs, 0, 2025)).toHaveLength(0);
  });
});

// ── buildMonthlyChartData ─────────────────────────────────────────────────────

describe("buildMonthlyChartData", () => {
  it("produz pontos de gráfico com todas as propriedades necessárias", () => {
    const txs = [
      makeTx({ type: "Receita", amount: 3000, date: "2025-06-01" }),
      makeTx({ type: "Gasto", amount: 1000, date: "2025-06-15" }),
    ];
    const data = buildMonthlyChartData(txs);
    expect(data).toHaveLength(1);
    expect(data[0]).toMatchObject({
      key: "2025-06",
      receita: 3000,
      gastos: 1000,
      saldo: 2000,
    });
  });

  it("limita ao número de meses solicitado", () => {
    const txs = Array.from({ length: 15 }, (_, i) =>
      makeTx({ date: `2024-${String(i + 1).padStart(2, "0")}-01` })
    );
    const data = buildMonthlyChartData(txs, 6);
    expect(data).toHaveLength(6);
  });
});
