"use client";

import { useState } from "react";
import { ActiveView, Transaction, Investment, Debt } from "@/lib/types";
import { useFinancialStore } from "@/lib/store";
import { calcFinancialSummary } from "@/lib/calculations";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { AddTransactionModal } from "./add-transaction-modal";
import { DashboardView } from "./views/dashboard-view";
import { LedgerView } from "./views/ledger-view";
import { ExpensesRevenuesView } from "./views/expenses-revenues-view";
import { DebtsView } from "./views/debts-view";
import { InvestmentsView } from "./views/investments-view";
import { ProjectionsView } from "./views/projections-view";
import { SettingsView } from "./views/settings-view";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

export function AppShell() {
  const [activeView, setActiveView] = useState<ActiveView>("dashboard");
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  const store = useFinancialStore();

  const summary = calcFinancialSummary(store.transactions, store.investments);

  function handlePrevMonth() {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  }

  function handleNextMonth() {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  }

  function handleResetData(t: Transaction[], i: Investment[], d: Debt[]) {
    // Reset by re-writing each array
    t.forEach((tx) => store.addTransaction(tx));
    i.forEach((inv) => store.addInvestment(inv));
    d.forEach((debt) => store.addDebt(debt));
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar activeView={activeView} onNavigate={setActiveView} />

      {/* Main content */}
      <div className={cn("flex-1 flex flex-col min-h-screen transition-all duration-300 md:ml-56")}>
        <Topbar
          activeView={activeView}
          currentMonth={currentMonth}
          currentYear={currentYear}
          riskLevel={summary.riskLevel}
          onPrevMonth={handlePrevMonth}
          onNextMonth={handleNextMonth}
          onAddTransaction={() => setAddModalOpen(true)}
        />

        <main className="flex-1 overflow-auto">
          {activeView === "dashboard" && (
            <DashboardView transactions={store.transactions} investments={store.investments} />
          )}
          {activeView === "ledger" && (
            <LedgerView
              transactions={store.transactions}
              onAdd={store.addTransaction}
              onUpdate={store.updateTransaction}
              onRemove={store.removeTransaction}
            />
          )}
          {activeView === "gastos" && (
            <ExpensesRevenuesView transactions={store.transactions} mode="gastos" />
          )}
          {activeView === "receitas" && (
            <ExpensesRevenuesView transactions={store.transactions} mode="receitas" />
          )}
          {activeView === "dividas" && (
            <DebtsView
              debts={store.debts}
              onAdd={store.addDebt}
              onUpdate={store.updateDebt}
              onRemove={store.removeDebt}
            />
          )}
          {activeView === "investimentos" && (
            <InvestmentsView
              investments={store.investments}
              usdRate={store.usdRate}
              onAdd={store.addInvestment}
              onUpdate={store.updateInvestment}
              onRemove={store.removeInvestment}
              onSetUsdRate={store.setUsdRate}
            />
          )}
          {activeView === "projecoes" && (
            <ProjectionsView transactions={store.transactions} investments={store.investments} />
          )}
          {activeView === "configuracoes" && (
            <SettingsView
              onResetData={handleResetData}
            />
          )}
        </main>
      </div>

      <AddTransactionModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onAdd={store.addTransaction}
      />
    </div>
  );
}
