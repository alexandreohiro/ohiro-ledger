"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ActiveView, Transaction, Investment, Debt } from "@/lib/types";
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
import { AIView } from "./views/ai-view";
import {
  addTransaction,
  updateTransaction,
  deleteTransaction,
  addInvestment,
  updateInvestment,
  deleteInvestment,
  addDebt,
  updateDebt,
  deleteDebt,
  signOut,
} from "@/lib/actions";
import type { Notification } from "@/lib/notification-actions";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface AppShellProps {
  userEmail: string;
  initialTransactions: Transaction[];
  initialInvestments: Investment[];
  initialDebts: Debt[];
  initialNotifications: Notification[];
  initialNotificationDays: number;
}

export function AppShell({
  userEmail,
  initialTransactions,
  initialInvestments,
  initialDebts,
  initialNotifications,
  initialNotificationDays,
}: AppShellProps) {
  const [activeView, setActiveView] = useState<ActiveView>("dashboard");
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [usdRate, setUsdRate] = useState(5.05);

  // Otimistic local state — revalidado pelo servidor via revalidatePath
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
  const [investments, setInvestments] = useState<Investment[]>(initialInvestments);
  const [debts, setDebts] = useState<Debt[]>(initialDebts);

  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const summary = calcFinancialSummary(transactions, investments);

  function handlePrevMonth() {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear((y) => y - 1); }
    else setCurrentMonth((m) => m - 1);
  }
  function handleNextMonth() {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear((y) => y + 1); }
    else setCurrentMonth((m) => m + 1);
  }

  // ── Transactions ──────────────────────────────────────────────────────────
  async function handleAddTransaction(tx: Omit<Transaction, "id">) {
    const tempId = crypto.randomUUID();
    const optimistic = { ...tx, id: tempId };
    setTransactions((prev) => [optimistic, ...prev]);
    try {
      await addTransaction(tx);
      startTransition(() => router.refresh());
    } catch {
      setTransactions((prev) => prev.filter((t) => t.id !== tempId));
      toast.error("Erro ao adicionar lançamento");
    }
  }

  async function handleUpdateTransaction(tx: Transaction) {
    setTransactions((prev) => prev.map((t) => (t.id === tx.id ? tx : t)));
    try {
      await updateTransaction(tx);
      startTransition(() => router.refresh());
    } catch {
      toast.error("Erro ao atualizar lançamento");
    }
  }

  async function handleDeleteTransaction(id: string) {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    try {
      await deleteTransaction(id);
      startTransition(() => router.refresh());
    } catch {
      toast.error("Erro ao excluir lançamento");
    }
  }

  // ── Investments ───────────────────────────────────────────────────────────
  async function handleAddInvestment(inv: Omit<Investment, "id">) {
    const tempId = crypto.randomUUID();
    setInvestments((prev) => [{ ...inv, id: tempId }, ...prev]);
    try {
      await addInvestment(inv);
      startTransition(() => router.refresh());
    } catch {
      setInvestments((prev) => prev.filter((i) => i.id !== tempId));
      toast.error("Erro ao adicionar investimento");
    }
  }

  async function handleUpdateInvestment(inv: Investment) {
    setInvestments((prev) => prev.map((i) => (i.id === inv.id ? inv : i)));
    try {
      await updateInvestment(inv);
      startTransition(() => router.refresh());
    } catch {
      toast.error("Erro ao atualizar investimento");
    }
  }

  async function handleDeleteInvestment(id: string) {
    setInvestments((prev) => prev.filter((i) => i.id !== id));
    try {
      await deleteInvestment(id);
      startTransition(() => router.refresh());
    } catch {
      toast.error("Erro ao excluir investimento");
    }
  }

  // ── Debts ─────────────────────────────────────────────────────────────────
  async function handleAddDebt(debt: Omit<Debt, "id">) {
    const tempId = crypto.randomUUID();
    setDebts((prev) => [{ ...debt, id: tempId }, ...prev]);
    try {
      await addDebt(debt);
      startTransition(() => router.refresh());
    } catch {
      setDebts((prev) => prev.filter((d) => d.id !== tempId));
      toast.error("Erro ao adicionar dívida");
    }
  }

  async function handleUpdateDebt(debt: Debt) {
    setDebts((prev) => prev.map((d) => (d.id === debt.id ? debt : d)));
    try {
      await updateDebt(debt);
      startTransition(() => router.refresh());
    } catch {
      toast.error("Erro ao atualizar dívida");
    }
  }

  async function handleDeleteDebt(id: string) {
    setDebts((prev) => prev.filter((d) => d.id !== id));
    try {
      await deleteDebt(id);
      startTransition(() => router.refresh());
    } catch {
      toast.error("Erro ao excluir dívida");
    }
  }

  // ── Sign Out ──────────────────────────────────────────────────────────────
  async function handleSignOut() {
    await signOut();
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
  }

  // ── Reset (limpar todos os dados do usuário) ───────────────────────────────
  async function handleResetData() {
    if (!confirm("Tem certeza? Todos os dados serão excluídos permanentemente.")) return;
    // Limpar cada registro via actions
    await Promise.all([
      ...transactions.map((t) => deleteTransaction(t.id)),
      ...investments.map((i) => deleteInvestment(i.id)),
      ...debts.map((d) => deleteDebt(d.id)),
    ]);
    setTransactions([]);
    setInvestments([]);
    setDebts([]);
    toast.success("Dados resetados");
    startTransition(() => router.refresh());
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar activeView={activeView} onNavigate={setActiveView} />

      <div className="flex-1 flex flex-col min-h-screen transition-all duration-300 md:ml-56">
        <Topbar
          activeView={activeView}
          currentMonth={currentMonth}
          currentYear={currentYear}
          riskLevel={summary.riskLevel}
          onPrevMonth={handlePrevMonth}
          onNextMonth={handleNextMonth}
          onAddTransaction={() => setAddModalOpen(true)}
          userEmail={userEmail}
          onSignOut={handleSignOut}
          isPending={isPending}
          notifications={initialNotifications}
        />

        <main className="flex-1 overflow-auto">
          {activeView === "dashboard" && (
            <DashboardView transactions={transactions} investments={investments} />
          )}
          {activeView === "ledger" && (
            <LedgerView
              transactions={transactions}
              onAdd={handleAddTransaction}
              onUpdate={handleUpdateTransaction}
              onRemove={handleDeleteTransaction}
            />
          )}
          {activeView === "gastos" && (
            <ExpensesRevenuesView transactions={transactions} mode="gastos" />
          )}
          {activeView === "receitas" && (
            <ExpensesRevenuesView transactions={transactions} mode="receitas" />
          )}
          {activeView === "dividas" && (
            <DebtsView
              debts={debts}
              onAdd={handleAddDebt}
              onUpdate={handleUpdateDebt}
              onRemove={handleDeleteDebt}
            />
          )}
          {activeView === "investimentos" && (
            <InvestmentsView
              investments={investments}
              usdRate={usdRate}
              onAdd={handleAddInvestment}
              onUpdate={handleUpdateInvestment}
              onRemove={handleDeleteInvestment}
              onSetUsdRate={setUsdRate}
            />
          )}
          {activeView === "projecoes" && (
            <ProjectionsView transactions={transactions} investments={investments} />
          )}
          {activeView === "ia" && (
            <AIView
              transactions={transactions}
              investments={investments}
              debts={debts}
            />
          )}
          {activeView === "configuracoes" && (
            <SettingsView
              onResetData={handleResetData}
              initialNotificationDays={initialNotificationDays}
            />
          )}
        </main>
      </div>

      <AddTransactionModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onAdd={handleAddTransaction}
      />
    </div>
  );
}
