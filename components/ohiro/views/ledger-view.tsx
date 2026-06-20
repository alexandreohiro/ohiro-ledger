"use client";

import { useState, useMemo } from "react";
import { Transaction, TransactionType, TransactionStatus } from "@/lib/types";
import { formatCurrency, getAmountInBRL, calcTotalRevenue, calcTotalExpenses, calcTotalDebts, calcTotalInvestments } from "@/lib/calculations";
import { StatusBadge, CurrencyBadge } from "../risk-badge";
import { AddTransactionModal } from "../add-transaction-modal";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Plus, Search, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

interface LedgerViewProps {
  transactions: Transaction[];
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

export function LedgerView({ transactions, onAdd, onUpdate, onRemove }: LedgerViewProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editTx, setEditTx] = useState<Transaction | null>(null);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      const matchSearch = search === "" ||
        t.description.toLowerCase().includes(search.toLowerCase()) ||
        t.category.toLowerCase().includes(search.toLowerCase());
      const matchType = filterType === "all" || t.type === filterType;
      const matchStatus = filterStatus === "all" || t.status === filterStatus;
      return matchSearch && matchType && matchStatus;
    });
  }, [transactions, search, filterType, filterStatus]);

  const totals = useMemo(() => ({
    receita: calcTotalRevenue(filtered),
    gastos: calcTotalExpenses(filtered),
    dividas: calcTotalDebts(filtered),
    investimentos: calcTotalInvestments(filtered),
  }), [filtered]);

  function handleEdit(t: Transaction) {
    setEditTx(t);
    setModalOpen(true);
  }

  function handleSave(t: Transaction) {
    if (editTx) {
      onUpdate(t);
    } else {
      onAdd(t);
    }
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
            Ledger Operacional
          </div>
          <div className="text-sm font-mono font-semibold text-foreground">
            {filtered.length} lançamentos
          </div>
        </div>
        <Button
          size="sm"
          onClick={() => setModalOpen(true)}
          className="font-mono text-xs h-8"
        >
          <Plus className="size-3.5" data-icon="inline-start" />
          Novo lançamento
        </Button>
      </div>

      {/* Totals row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Receitas", value: totals.receita, color: "text-[hsl(var(--risk-low))]", border: "border-[hsl(var(--risk-low))/20]" },
          { label: "Gastos", value: totals.gastos, color: "text-[hsl(var(--risk-medium))]", border: "border-[hsl(var(--risk-medium))/20]" },
          { label: "Dívidas", value: totals.dividas, color: "text-[hsl(var(--risk-critical))]", border: "border-[hsl(var(--risk-critical))/20]" },
          { label: "Investimentos", value: totals.investimentos, color: "text-[hsl(var(--accent))]", border: "border-[hsl(var(--accent))/20]" },
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
            placeholder="Buscar por descrição ou categoria..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Filter className="size-4 text-muted-foreground self-center" />
          <Select value={filterType} onValueChange={(v) => setFilterType(v ?? "all")}>
            <SelectTrigger className="h-8 w-[130px] text-xs font-mono">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs font-mono">Todos tipos</SelectItem>
              {["Receita", "Gasto", "Dívida", "Investimento", "Transferência", "Reserva"].map((t) => (
                <SelectItem key={t} value={t} className="text-xs font-mono">{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v ?? "all")}>
            <SelectTrigger className="h-8 w-[130px] text-xs font-mono">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs font-mono">Todos status</SelectItem>
              {["Previsto", "Pago", "Pendente", "Atrasado", "Recorrente"].map((s) => (
                <SelectItem key={s} value={s} className="text-xs font-mono">{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border/40 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="border-b border-border/40 bg-muted/20">
                {["Data", "Tipo", "Descrição", "Conta", "Categoria", "Valor", "Moeda", "Status", "Venc.", "Recorr.", ""].map((h) => (
                  <th
                    key={h}
                    className="text-left px-3 py-2.5 text-[10px] tracking-widest uppercase text-muted-foreground/70 font-semibold whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center py-12 text-muted-foreground">
                    <div className="font-mono text-sm">Nenhum lançamento encontrado</div>
                    <div className="text-[11px] mt-1">Ajuste os filtros ou adicione um lançamento</div>
                  </td>
                </tr>
              ) : (
                filtered.map((t, idx) => (
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
                        <span className={cn("font-medium", TYPE_COLORS[t.type])}>{t.type}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 max-w-[180px]">
                      <div className="truncate text-foreground font-medium">{t.description}</div>
                      {t.subcategory && (
                        <div className="text-[10px] text-muted-foreground truncate">{t.subcategory}</div>
                      )}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">{t.account}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">{t.category}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span className={cn("font-bold", TYPE_COLORS[t.type])}>
                        {t.type === "Receita" ? "+" : "-"}{formatCurrency(getAmountInBRL(t))}
                      </span>
                      {t.currency !== "BRL" && (
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
                    <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">{t.dueDate}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">{t.recurrence}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleEdit(t)}
                          className="p-1 rounded hover:bg-muted/40 text-muted-foreground hover:text-foreground transition-colors"
                          aria-label="Editar"
                        >
                          <Pencil className="size-3.5" />
                        </button>
                        <button
                          onClick={() => onRemove(t.id)}
                          className="p-1 rounded hover:bg-[hsl(var(--risk-critical))/15] text-muted-foreground hover:text-[hsl(var(--risk-critical))] transition-colors"
                          aria-label="Remover"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
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
