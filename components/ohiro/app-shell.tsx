"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ActiveView, Transaction, Investment, Debt, Account } from "@/lib/types";
import {
  calcFinancialSummary,
  filterByMonth,
  getAvailableMonths,
  formatMonthYear,
} from "@/lib/calculations";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { AddTransactionModal } from "./add-transaction-modal";
import { DashboardView } from "./views/dashboard-view";
import { LedgerView } from "./views/ledger-view";
import { ExpensesRevenuesView } from "./views/expenses-revenues-view";
import { DebtsView } from "./views/debts-view";
import { InvestmentsView } from "./views/investments-view";
import { AccountsView } from "./views/accounts-view";
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
  addBankAccount,
  updateBankAccount,
  deleteBankAccount,
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
  initialAccounts: Account[];
  initialNotifications: Notification[];
  initialNotificationDays: number;
  initialAiConsent: boolean;
}

export function AppShell({
  userEmail,
  initialTransactions,
  initialInvestments,
  initialDebts,
  initialAccounts,
  initialNotifications,
  initialNotificationDays,
  initialAiConsent,
}: AppShellProps) {
  const [activeView, setActiveView] = useState<ActiveView>("dashboard");
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [usdRate, setUsdRate] = useState(5.05);

  // Otimistic local state — revalidado pelo servidor via revalidatePath
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
  const [investments, setInvestments] = useState<Investment[]>(initialInvestments);
  const [debts, setDebts] = useState<Debt[]>(initialDebts);
  const [accounts, setAccounts] = useState<Account[]>(initialAccounts);

  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // ── Meses disponíveis (baseados nos lançamentos reais) ────────────────────
  const availableMonths = useMemo(() => {
    const keys = getAvailableMonths(transactions);
    // Garante que o mês atual sempre aparece mesmo sem lançamentos
    const now = new Date();
    const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    if (!keys.includes(currentKey)) keys.push(currentKey);
    return keys.sort();
  }, [transactions]);

  const [selectedMonthKey, setSelectedMonthKey] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  const currentMonthIndex = availableMonths.indexOf(selectedMonthKey);
  const [currentYear, currentMonth] = selectedMonthKey.split("-").map(Number);
  // currentMonth here is 1-indexed; views expect 0-indexed
  const currentMonthZero = currentMonth - 1;

  const monthTransactions = useMemo(
    () => filterByMonth(transactions, currentMonthZero, currentYear),
    [transactions, currentMonthZero, currentYear]
  );

  const summary = calcFinancialSummary(monthTransactions, investments);

  function handlePrevMonth() {
    if (currentMonthIndex > 0) {
      setSelectedMonthKey(availableMonths[currentMonthIndex - 1]);
    }
  }
  function handleNextMonth() {
    if (currentMonthIndex < availableMonths.length - 1) {
      setSelectedMonthKey(availableMonths[currentMonthIndex + 1]);
    }
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
      toast.error("Error adding entry");
    }
  }

  async function handleUpdateTransaction(tx: Transaction) {
    setTransactions((prev) => prev.map((t) => (t.id === tx.id ? tx : t)));
    try {
      await updateTransaction(tx);
      startTransition(() => router.refresh());
    } catch {
      toast.error("Error updating entry");
    }
  }

  async function handleDeleteTransaction(id: string) {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    try {
      await deleteTransaction(id);
      startTransition(() => router.refresh());
    } catch {
      toast.error("Error deleting entry");
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
      toast.error("Error adding investment");
    }
  }

  async function handleUpdateInvestment(inv: Investment) {
    setInvestments((prev) => prev.map((i) => (i.id === inv.id ? inv : i)));
    try {
      await updateInvestment(inv);
      startTransition(() => router.refresh());
    } catch {
      toast.error("Error updating investment");
    }
  }

  async function handleDeleteInvestment(id: string) {
    setInvestments((prev) => prev.filter((i) => i.id !== id));
    try {
      await deleteInvestment(id);
      startTransition(() => router.refresh());
    } catch {
      toast.error("Error deleting investment");
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
      toast.error("Error adding debt");
    }
  }

  async function handleUpdateDebt(debt: Debt) {
    setDebts((prev) => prev.map((d) => (d.id === debt.id ? debt : d)));
    try {
      await updateDebt(debt);
      startTransition(() => router.refresh());
    } catch {
      toast.error("Error updating debt");
    }
  }

  async function handleDeleteDebt(id: string) {
    setDebts((prev) => prev.filter((d) => d.id !== id));
    try {
      await deleteDebt(id);
      startTransition(() => router.refresh());
    } catch {
      toast.error("Error deleting debt");
    }
  }

  // ── Accounts ──────────────────────────────────────────────────────────────
  async function handleAddAccount(account: Omit<Account, "id">) {
    const tempId = crypto.randomUUID();
    setAccounts((prev) => [{ ...account, id: tempId }, ...prev]);
    try {
      await addBankAccount(account);
      startTransition(() => router.refresh());
    } catch {
      setAccounts((prev) => prev.filter((a) => a.id !== tempId));
      toast.error("Erro ao adicionar conta");
    }
  }

  async function handleUpdateAccount(account: Account) {
    setAccounts((prev) => prev.map((a) => (a.id === account.id ? account : a)));
    try {
      await updateBankAccount(account);
      startTransition(() => router.refresh());
    } catch {
      toast.error("Erro ao atualizar conta");
    }
  }

  async function handleDeleteAccount(id: string) {
    setAccounts((prev) => prev.filter((a) => a.id !== id));
    try {
      await deleteBankAccount(id);
      startTransition(() => router.refresh());
    } catch {
      toast.error("Erro ao excluir conta");
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
    if (!confirm("Are you sure? All data will be permanently deleted.")) return;
    // Limpar cada registro via actions
    await Promise.all([
      ...transactions.map((t) => deleteTransaction(t.id)),
      ...investments.map((i) => deleteInvestment(i.id)),
      ...debts.map((d) => deleteDebt(d.id)),
      ...accounts.map((a) => deleteBankAccount(a.id)),
    ]);
    setTransactions([]);
    setInvestments([]);
    setDebts([]);
    setAccounts([]);
    toast.success("Data reset");
    startTransition(() => router.refresh());
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar activeView={activeView} onNavigate={setActiveView} />

      <div className="flex-1 flex flex-col min-h-screen transition-all duration-300 md:ml-56">
        <Topbar
          activeView={activeView}
          currentMonth={currentMonthZero}
          currentYear={currentYear}
          riskLevel={summary.riskLevel}
          onPrevMonth={handlePrevMonth}
          onNextMonth={handleNextMonth}
          onAddTransaction={() => setAddModalOpen(true)}
          userEmail={userEmail}
          onSignOut={handleSignOut}
          isPending={isPending}
          notifications={initialNotifications}
          hasPrev={currentMonthIndex > 0}
          hasNext={currentMonthIndex < availableMonths.length - 1}
          availableMonthsCount={availableMonths.length}
        />

        <main className="flex-1 overflow-auto">
          {activeView === "dashboard" && (
            <DashboardView
              transactions={transactions}
              monthTransactions={monthTransactions}
              investments={investments}
              selectedMonthKey={selectedMonthKey}
            />
          )}
          {activeView === "ledger" && (
            <LedgerView
              transactions={transactions}
              selectedMonthKey={selectedMonthKey}
              availableMonths={availableMonths}
              onSelectMonth={setSelectedMonthKey}
              onAdd={handleAddTransaction}
              onUpdate={handleUpdateTransaction}
              onRemove={handleDeleteTransaction}
            />
          )}
          {activeView === "gastos" && (
            <ExpensesRevenuesView
              transactions={transactions}
              monthTransactions={monthTransactions}
              selectedMonthKey={selectedMonthKey}
              mode="gastos"
            />
          )}
          {activeView === "receitas" && (
            <ExpensesRevenuesView
              transactions={transactions}
              monthTransactions={monthTransactions}
              selectedMonthKey={selectedMonthKey}
              mode="receitas"
            />
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
          {activeView === "contas" && (
            <AccountsView
              accounts={accounts}
              onAdd={handleAddAccount}
              onUpdate={handleUpdateAccount}
              onRemove={handleDeleteAccount}
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
              initialAiConsent={initialAiConsent}
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
