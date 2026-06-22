"use client";

import { useState, useMemo } from "react";
import { Transaction, TransactionType, TransactionStatus } from "@/lib/types";
import {
  formatCurrency,
  getAmountInUSD,
  calcTotalRevenue,
  calcTotalExpenses,
  calcTotalDebts,
  calcTotalInvestments,
  formatMonthLabel,
  txMonthKey,
} from "@/lib/calculations";
import { StatusBadge, CurrencyBadge } from "../risk-badge";
import { AddTransactionModal } from "../add-transaction-modal";
import { TRANSACTION_TYPE_LABEL, TRANSACTION_STATUS_LABEL, RECURRENCE_LABEL, translateCategory } from "@/lib/i18n-labels";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Plus, Search, Filter, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface LedgerViewProps {
  transactions: Transaction[];
  selectedMonthKey: string;
  availableMonths: string[];
  onSelectMonth: (key: string) => void;
  onAdd: (t: Transaction) => void;
  onUpdate: (t: Transaction) => void;
  onRemove: (id: string) => void;
}

const TYPE_COLORS: Record<TransactionType, string> = {
  Receita: "text-[hsl(var(--risk-low))]",
  Gasto: "text-[hsl(var(--risk-medium))]",
  Dívida: "text-[hsl(var(--risk-critical))]",
  Investimento: "text-[hsl(var(--accent))]",
  Transferência: "text-muted-foreground",
  Reserva: "text-foreground",
};

const TYPE_DOT: Record<TransactionType, string> = {
  Receita: "bg-[hsl(var(--risk-low))]",
  Gasto: "bg-[hsl(var(--risk-medium))]",
  Dívida: "bg-[hsl(var(--risk-critical))]",
  Investimento: "bg-[hsl(var(--accent))]",
  Transferência: "bg-muted-foreground",
  Reserva: "bg-foreground",
};

// ── Month summary row ─────────────────────────────────────────────────────────
function MonthSummaryRow({ monthKey, transactions, isOpen, onToggle, onAdd }: {
  monthKey: string;
  transactions: Transaction[];
  isOpen: boolean;
  onToggle: () => void;
  onAdd: () => void;
}) {
  const receita = calcTotalRevenue(transactions);
  const gastos = calcTotalExpenses(transactions);
  const dividas = calcTotalDebts(transactions);
  const investimentos = calcTotalInvestments(transactions);
  const saldo = receita - gastos - dividas - investimentos;

  return (
    <div
      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 bg-muted/30 border-b border-border/40 cursor-pointer hover:bg-muted/50 transition-colors select-none"
      onClick={onToggle}
    >
      <div className="flex items-center gap-2">
        {isOpen ? (
          <ChevronDown className="size-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="size-4 text-muted-foreground shrink-0" />
        )}
        <span className="text-sm font-mono font-semibold text-foreground">
          {formatMonthLabel(monthKey)}
        </span>
        <span className="text-[11px] font-mono text-muted-foreground">
          {transactions.length} entr{transactions.length !== 1 ? "ies" : "y"}
        </span>
      </div>
      <div className="flex items-center gap-4 ml-6 sm:ml-0 flex-wrap">
        <span className="text-xs font-mono text-[hsl(var(--risk-low))]">+{formatCurrency(receita)}</span>
        <span className="text-xs font-mono text-[hsl(var(--risk-medium))]">-{formatCurrency(gastos)}</span>
        {dividas > 0 && <span className="text-xs font-mono text-[hsl(var(--risk-critical))]">-{formatCurrency(dividas)}</span>}
        {investimentos > 0 && <span className="text-xs font-mono text-[hsl(var(--accent))]">-{formatCurrency(investimentos)}</span>}
        <span className={cn("text-xs font-mono font-bold", saldo >= 0 ? "text-[hsl(var(--risk-low))]" : "text-[hsl(var(--risk-critical))]")}>
          = {saldo >= 0 ? "+" : ""}{formatCurrency(saldo)}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); onAdd(); }}
          className="ml-1 p-1 rounded hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Add entry"
          title="Add entry"
        >
          <Plus className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

export function LedgerView({ transactions, selectedMonthKey, availableMonths, onSelectMonth, onAdd, onUpdate, onRemove }: LedgerViewProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editTx, setEditTx] = useState<Transaction | null>(null);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [openMonths, setOpenMonths] = useState<Set<string>>(() => new Set([selectedMonthKey]));

  // Automatically opens the selected month when it changes
  useMemo(() => {
    setOpenMonths((prev) => new Set([...prev, selectedMonthKey]));
  }, [selectedMonthKey]);

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      const matchSearch =
        search === "" ||
        t.description.toLowerCase().includes(search.toLowerCase()) ||
        t.category.toLowerCase().includes(search.toLowerCase());
      const matchType = filterType === "all" || t.type === filterType;
      const matchStatus = filterStatus === "all" || t.status === filterStatus;
      return matchSearch && matchType && matchStatus;
    });
  }, [transactions, search, filterType, filterStatus]);

  // Groups by month in reverse order (most recent first)
  const groupedByMonth = useMemo(() => {
    const map: Record<string, Transaction[]> = {};
    for (const t of filtered) {
      const key = txMonthKey(t.date);
      if (!map[key]) map[key] = [];
      map[key].push(t);
    }
    // Sort transactions within each month by date desc
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
    return map;
  }, [filtered]);

  // Months available in the view (those with filtered entries, plus the selected month)
  const displayMonths = useMemo(() => {
    const fromFiltered = Object.keys(groupedByMonth).sort().reverse();
    if (!fromFiltered.includes(selectedMonthKey)) {
      return [selectedMonthKey, ...fromFiltered];
    }
    return fromFiltered;
  }, [groupedByMonth, selectedMonthKey]);

  const allTotal = useMemo(() => ({
    receita: calcTotalRevenue(filtered),
    gastos: calcTotalExpenses(filtered),
    dividas: calcTotalDebts(filtered),
    investimentos: calcTotalInvestments(filtered),
  }), [filtered]);

  function toggleMonth(key: string) {
    setOpenMonths((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function handleEdit(t: Transaction) {
    setEditTx(t);
    setModalOpen(true);
  }

  function handleSave(t: Transaction) {
    if (editTx) onUpdate(t);
    else onAdd(t);
    setEditTx(null);
  }

  function handleClose() {
    setModalOpen(false);
    setEditTx(null);
  }

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6 max-w-[1400px] mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[11px] font-mono text-muted-foreground/50 tracking-widest uppercase">
            Operating Ledger
          </div>
          <div className="text-sm font-mono font-semibold text-foreground">
            {filtered.length} entries across {displayMonths.length} months
          </div>
        </div>
        <Button size="sm" onClick={() => setModalOpen(true)} className="font-mono text-xs h-8">
          <Plus className="size-3.5" data-icon="inline-start" />
          New Entry
        </Button>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Income", value: allTotal.receita, color: "text-[hsl(var(--risk-low))]", border: "border-[hsl(var(--risk-low))/20]" },
          { label: "Expenses", value: allTotal.gastos, color: "text-[hsl(var(--risk-medium))]", border: "border-[hsl(var(--risk-medium))/20]" },
          { label: "Debts", value: allTotal.dividas, color: "text-[hsl(var(--risk-critical))]", border: "border-[hsl(var(--risk-critical))/20]" },
          { label: "Investments", value: allTotal.investimentos, color: "text-[hsl(var(--accent))]", border: "border-[hsl(var(--accent))/20]" },
        ].map((item) => (
          <div key={item.label} className={cn("p-3 rounded-md border bg-card/40", item.border)}>
            <div className="text-[10px] font-mono text-muted-foreground tracking-wider uppercase">{item.label}</div>
            <div className={cn("text-sm font-mono font-bold mt-0.5", item.color)}>{formatCurrency(item.value)}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            className="h-8 pl-8 text-xs font-mono"
            placeholder="Search by description or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Filter className="size-4 text-muted-foreground self-center shrink-0" />
          <Select value={filterType} onValueChange={(v) => setFilterType(v ?? "all")}>
            <SelectTrigger className="h-8 w-[130px] text-xs font-mono">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs font-mono">All Types</SelectItem>
              {(["Receita", "Gasto", "Dívida", "Investimento", "Transferência", "Reserva"] as TransactionType[]).map((t) => (
                <SelectItem key={t} value={t} className="text-xs font-mono">{TRANSACTION_TYPE_LABEL[t]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v ?? "all")}>
            <SelectTrigger className="h-8 w-[130px] text-xs font-mono">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs font-mono">All Statuses</SelectItem>
              {(["Previsto", "Pago", "Pendente", "Atrasado", "Recorrente"] as TransactionStatus[]).map((s) => (
                <SelectItem key={s} value={s} className="text-xs font-mono">{TRANSACTION_STATUS_LABEL[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Grouped months */}
      <div className="rounded-lg border border-border/40 overflow-hidden">
        {displayMonths.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground font-mono text-sm">
            No entries found
          </div>
        ) : (
          displayMonths.map((monthKey) => {
            const monthTxns = groupedByMonth[monthKey] ?? [];
            const isOpen = openMonths.has(monthKey);

            return (
              <div key={monthKey} className="border-b border-border/30 last:border-0">
                <MonthSummaryRow
                  monthKey={monthKey}
                  transactions={monthTxns}
                  isOpen={isOpen}
                  onToggle={() => toggleMonth(monthKey)}
                  onAdd={() => setModalOpen(true)}
                />

                {isOpen && (
                  <div className="overflow-x-auto">
                    {monthTxns.length === 0 ? (
                      <div className="py-6 text-center text-muted-foreground text-xs font-mono">
                        No entries{search || filterType !== "all" || filterStatus !== "all" ? " matching current filters" : ""} in {formatMonthLabel(monthKey)}
                      </div>
                    ) : (
                      <table className="w-full text-xs font-mono">
                        <thead>
                          <tr className="border-b border-border/30 bg-muted/10">
                            {["Date", "Type", "Description", "Account", "Category", "Amount", "Currency", "Status", "Due", "Recur.", ""].map((h) => (
                              <th
                                key={h}
                                className="text-left px-3 py-2 text-[10px] tracking-widest uppercase text-muted-foreground/60 font-semibold whitespace-nowrap"
                              >
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {monthTxns.map((t, idx) => (
                            <tr
                              key={t.id}
                              className={cn(
                                "border-b border-border/20 transition-colors hover:bg-muted/20",
                                idx % 2 === 0 ? "bg-transparent" : "bg-card/20"
                              )}
                            >
                              <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">{t.date}</td>
                              <td className="px-3 py-2.5 whitespace-nowrap">
                                <div className="flex items-center gap-1.5">
                                  <span className={cn("size-1.5 rounded-full shrink-0", TYPE_DOT[t.type])} />
                                  <span className={cn("font-medium", TYPE_COLORS[t.type])}>{TRANSACTION_TYPE_LABEL[t.type]}</span>
                                </div>
                              </td>
                              <td className="px-3 py-2.5 max-w-[180px]">
                                <div className="truncate text-foreground font-medium">{t.description}</div>
                                {t.subcategory && (
                                  <div className="text-[10px] text-muted-foreground truncate">{translateCategory(t.subcategory)}</div>
                                )}
                              </td>
                              <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">{t.account}</td>
                              <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">{translateCategory(t.category)}</td>
                              <td className="px-3 py-2.5 whitespace-nowrap">
                                <span className={cn("font-bold", TYPE_COLORS[t.type])}>
                                  {t.type === "Receita" ? "+" : "-"}{formatCurrency(getAmountInUSD(t))}
                                </span>
                                {t.currency !== "USD" && (
                                  <div className="text-[10px] text-muted-foreground">
                                    {t.currency} {t.amount.toFixed(2)}
                                  </div>
                                )}
                              </td>
                              <td className="px-3 py-2.5 whitespace-nowrap">
                                <CurrencyBadge currency={t.currency} />
                              </td>
                              <td className="px-3 py-2.5 whitespace-nowrap">
                                <StatusBadge status={t.status} />
                              </td>
                              <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">{t.dueDate ?? "—"}</td>
                              <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">{RECURRENCE_LABEL[t.recurrence]}</td>
                              <td className="px-3 py-2.5 whitespace-nowrap">
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => handleEdit(t)}
                                    className="p-1 rounded hover:bg-muted/40 text-muted-foreground hover:text-foreground transition-colors"
                                    aria-label="Edit"
                                  >
                                    <Pencil className="size-3.5" />
                                  </button>
                                  <button
                                    onClick={() => onRemove(t.id)}
                                    className="p-1 rounded hover:bg-[hsl(var(--risk-critical))/15] text-muted-foreground hover:text-[hsl(var(--risk-critical))] transition-colors"
                                    aria-label="Remove"
                                  >
                                    <Trash2 className="size-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <AddTransactionModal
        open={modalOpen}
        onClose={handleClose}
        onAdd={handleSave}
        editTransaction={editTx}
      />
    </div>
  );
}
