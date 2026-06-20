"use client";

import { useState, useEffect, useCallback } from "react";
import { Transaction, Investment, Debt } from "./types";
import { MOCK_TRANSACTIONS, MOCK_INVESTMENTS, MOCK_DEBTS, USD_EXCHANGE_RATE } from "./mock-data";

const LS_TRANSACTIONS = "ohiro_transactions";
const LS_INVESTMENTS = "ohiro_investments";
const LS_DEBTS = "ohiro_debts";
const LS_USD_RATE = "ohiro_usd_rate";

function loadFromLS<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function saveToLS<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

export function useFinancialStore() {
  const [transactions, setTransactions] = useState<Transaction[]>(() =>
    loadFromLS(LS_TRANSACTIONS, MOCK_TRANSACTIONS)
  );
  const [investments, setInvestments] = useState<Investment[]>(() =>
    loadFromLS(LS_INVESTMENTS, MOCK_INVESTMENTS)
  );
  const [debts, setDebts] = useState<Debt[]>(() =>
    loadFromLS(LS_DEBTS, MOCK_DEBTS)
  );
  const [usdRate, setUsdRateState] = useState<number>(() =>
    loadFromLS(LS_USD_RATE, USD_EXCHANGE_RATE)
  );

  useEffect(() => { saveToLS(LS_TRANSACTIONS, transactions); }, [transactions]);
  useEffect(() => { saveToLS(LS_INVESTMENTS, investments); }, [investments]);
  useEffect(() => { saveToLS(LS_DEBTS, debts); }, [debts]);
  useEffect(() => { saveToLS(LS_USD_RATE, usdRate); }, [usdRate]);

  const addTransaction = useCallback((t: Transaction) => {
    setTransactions((prev) => [t, ...prev]);
  }, []);

  const updateTransaction = useCallback((updated: Transaction) => {
    setTransactions((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  }, []);

  const removeTransaction = useCallback((id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addInvestment = useCallback((inv: Investment) => {
    setInvestments((prev) => [inv, ...prev]);
  }, []);

  const updateInvestment = useCallback((updated: Investment) => {
    setInvestments((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
  }, []);

  const removeInvestment = useCallback((id: string) => {
    setInvestments((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const addDebt = useCallback((debt: Debt) => {
    setDebts((prev) => [debt, ...prev]);
  }, []);

  const updateDebt = useCallback((updated: Debt) => {
    setDebts((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
  }, []);

  const removeDebt = useCallback((id: string) => {
    setDebts((prev) => prev.filter((d) => d.id !== id));
  }, []);

  const setUsdRate = useCallback((rate: number) => {
    setUsdRateState(rate);
    setInvestments((prev) =>
      prev.map((inv) =>
        inv.currency !== "BRL"
          ? { ...inv, exchangeRate: rate, convertedAmountBRL: inv.amount * rate }
          : inv
      )
    );
  }, []);

  return {
    transactions,
    investments,
    debts,
    usdRate,
    addTransaction,
    updateTransaction,
    removeTransaction,
    addInvestment,
    updateInvestment,
    removeInvestment,
    addDebt,
    updateDebt,
    removeDebt,
    setUsdRate,
  };
}
