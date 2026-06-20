"use client";

import { useState } from "react";
import { Debt, DebtStatus, DebtPriority } from "@/lib/types";
import { formatCurrency } from "@/lib/calculations";
import { RiskBadge, StatusBadge } from "../risk-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Pencil, CreditCard, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

interface DebtsViewProps {
  debts: Debt[];
  onAdd: (d: Debt) => void;
  onUpdate: (d: Debt) => void;
  onRemove: (id: string) => void;
}

const DEBT_STATUSES: DebtStatus[] = ["Ativo", "Atrasado", "Quitado", "Renegociado"];
const DEBT_PRIORITIES: DebtPriority[] = ["Baixo", "Médio", "Alto", "Crítico"];

const PRIORITY_COLOR: Record<DebtPriority, string> = {
  Baixo: "text-[hsl(var(--risk-low))]",
  Médio: "text-[hsl(var(--risk-medium))]",
  Alto: "text-[hsl(var(--risk-high))]",
  Crítico: "text-[hsl(var(--risk-critical))]",
};

function generateId(): string {
  return `d${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function DebtModal({ open, onClose, onSave, editDebt }: {
  open: boolean;
  onClose: () => void;
  onSave: (d: Debt) => void;
  editDebt?: Debt | null;
}) {
  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState<Partial<Debt>>(
    editDebt ?? {
      creditor: "",
      originalAmount: 0,
      currentAmount: 0,
      installmentAmount: 0,
      dueDate: today,
      interestRate: 0,
      status: "Ativo",
      priority: "Médio",
    }
  );

  const set = (key: keyof Debt, value: unknown) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const debt: Debt = {
      id: editDebt?.id ?? generateId(),
      creditor: form.creditor ?? "",
      originalAmount: Number(form.originalAmount) || 0,
      currentAmount: Number(form.currentAmount) || 0,
      installmentAmount: Number(form.installmentAmount) || 0,
      dueDate: form.dueDate ?? today,
      interestRate: Number(form.interestRate) || 0,
      status: form.status as DebtStatus ?? "Ativo",
      priority: form.priority as DebtPriority ?? "Médio",
    };
    onSave(debt);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-card border-border/60">
        <DialogHeader>
          <DialogTitle className="font-mono text-sm tracking-wide">
            {editDebt ? "EDITAR DÍVIDA" : "NOVA DÍVIDA"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-mono text-muted-foreground tracking-wider uppercase">Credor / Banco</label>
            <Input className="h-8 text-xs font-mono" value={form.creditor ?? ""} onChange={(e) => set("creditor", e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-mono text-muted-foreground tracking-wider uppercase">Valor original</label>
              <Input className="h-8 text-xs font-mono" type="number" step="0.01" value={form.originalAmount ?? ""} onChange={(e) => set("originalAmount", e.target.value)} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-mono text-muted-foreground tracking-wider uppercase">Saldo atual</label>
              <Input className="h-8 text-xs font-mono" type="number" step="0.01" value={form.currentAmount ?? ""} onChange={(e) => set("currentAmount", e.target.value)} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-mono text-muted-foreground tracking-wider uppercase">Parcela</label>
              <Input className="h-8 text-xs font-mono" type="number" step="0.01" value={form.installmentAmount ?? ""} onChange={(e) => set("installmentAmount", e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-mono text-muted-foreground tracking-wider uppercase">Juros % a.m.</label>
              <Input className="h-8 text-xs font-mono" type="number" step="0.01" value={form.interestRate ?? ""} onChange={(e) => set("interestRate", e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-mono text-muted-foreground tracking-wider uppercase">Vencimento</label>
              <Input className="h-8 text-xs font-mono" type="date" value={form.dueDate ?? today} onChange={(e) => set("dueDate", e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-mono text-muted-foreground tracking-wider uppercase">Status</label>
              <Select value={form.status} onValueChange={(v) => set("status", v)}>
                <SelectTrigger className="h-8 text-xs font-mono"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DEBT_STATUSES.map((s) => <SelectItem key={s} value={s} className="text-xs font-mono">{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-mono text-muted-foreground tracking-wider uppercase">Prioridade</label>
              <Select value={form.priority} onValueChange={(v) => set("priority", v)}>
                <SelectTrigger className="h-8 text-xs font-mono"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DEBT_PRIORITIES.map((p) => <SelectItem key={p} value={p} className="text-xs font-mono">{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-border/40">
            <Button type="button" variant="outline" size="sm" onClick={onClose} className="font-mono text-xs">Cancelar</Button>
            <Button type="submit" size="sm" className="font-mono text-xs">{editDebt ? "Salvar" : "Adicionar"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DebtsView({ debts, onAdd, onUpdate, onRemove }: DebtsViewProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editDebt, setEditDebt] = useState<Debt | null>(null);

  const totalCurrent = debts.filter(d => d.status !== "Quitado").reduce((s, d) => s + d.currentAmount, 0);
  const totalInstallments = debts.filter(d => d.status !== "Quitado").reduce((s, d) => s + d.installmentAmount, 0);
  const activeDebts = debts.filter(d => d.status !== "Quitado");
  const criticalDebts = debts.filter(d => d.priority === "Crítico" || d.priority === "Alto");

  function handleEdit(d: Debt) { setEditDebt(d); setModalOpen(true); }

  function handleSave(d: Debt) {
    if (editDebt) onUpdate(d);
    else onAdd(d);
    setEditDebt(null);
  }

  const sorted = [...debts].sort((a, b) => {
    const order: Record<DebtPriority, number> = { Crítico: 0, Alto: 1, Médio: 2, Baixo: 3 };
    return order[a.priority] - order[b.priority];
  });

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-mono text-muted-foreground/50 tracking-widest uppercase">Gestão de Dívidas</div>
        <Button size="sm" onClick={() => setModalOpen(true)} className="font-mono text-xs h-8">
          <Plus className="size-3.5" data-icon="inline-start" />
          Nova dívida
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-lg border border-[hsl(var(--risk-critical))/20] bg-[hsl(var(--risk-critical))/5]">
          <div className="text-[10px] font-mono text-muted-foreground tracking-wider uppercase mb-1">Dívida Total</div>
          <div className="text-xl font-mono font-bold text-[hsl(var(--risk-critical))]">{formatCurrency(totalCurrent)}</div>
        </div>
        <div className="p-4 rounded-lg border border-border/40 bg-card/40">
          <div className="text-[10px] font-mono text-muted-foreground tracking-wider uppercase mb-1">Parcelas/mês</div>
          <div className="text-xl font-mono font-bold text-foreground">{formatCurrency(totalInstallments)}</div>
        </div>
        <div className="p-4 rounded-lg border border-border/40 bg-card/40">
          <div className="text-[10px] font-mono text-muted-foreground tracking-wider uppercase mb-1">Dívidas ativas</div>
          <div className="text-xl font-mono font-bold text-foreground">{activeDebts.length}</div>
        </div>
        <div className="p-4 rounded-lg border border-[hsl(var(--risk-high))/20] bg-[hsl(var(--risk-high))/5]">
          <div className="text-[10px] font-mono text-muted-foreground tracking-wider uppercase mb-1">Críticas / Altas</div>
          <div className="text-xl font-mono font-bold text-[hsl(var(--risk-high))]">{criticalDebts.length}</div>
        </div>
      </div>

      {/* Debts table */}
      <div className="rounded-lg border border-border/40 overflow-hidden bg-card/60">
        <div className="p-4 border-b border-border/40 flex items-center gap-2">
          <AlertTriangle className="size-4 text-[hsl(var(--risk-medium))]" />
          <span className="text-[11px] font-mono text-muted-foreground/60 tracking-widest uppercase">Plano de Quitação — ordem de prioridade</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="border-b border-border/30 bg-muted/10">
                {["Credor", "Valor original", "Saldo atual", "Parcela", "Vencimento", "Juros %a.m.", "Prioridade", "Status", "Progresso", ""].map((h) => (
                  <th key={h} className="text-left px-3 py-2 text-[10px] tracking-widest uppercase text-muted-foreground/60 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-muted-foreground">
                    <CreditCard className="size-8 mx-auto mb-2 opacity-20" />
                    <div>Nenhuma dívida cadastrada</div>
                  </td>
                </tr>
              ) : (
                sorted.map((d) => {
                  const progress = d.originalAmount > 0 ? Math.max(0, Math.min(100, ((d.originalAmount - d.currentAmount) / d.originalAmount) * 100)) : 0;
                  return (
                    <tr key={d.id} className="border-b border-border/20 hover:bg-muted/20 transition-colors">
                      <td className="px-3 py-2.5 font-medium text-foreground">{d.creditor}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">{formatCurrency(d.originalAmount)}</td>
                      <td className="px-3 py-2.5 font-bold text-[hsl(var(--risk-critical))]">{formatCurrency(d.currentAmount)}</td>
                      <td className="px-3 py-2.5 text-foreground">{formatCurrency(d.installmentAmount)}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">{d.dueDate}</td>
                      <td className={cn("px-3 py-2.5 font-bold", d.interestRate > 5 ? "text-[hsl(var(--risk-critical))]" : "text-foreground")}>
                        {d.interestRate.toFixed(1)}%
                      </td>
                      <td className="px-3 py-2.5">
                        <RiskBadge level={d.priority} size="sm" showDot={false} />
                      </td>
                      <td className="px-3 py-2.5">
                        <StatusBadge status={d.status} />
                      </td>
                      <td className="px-3 py-2.5 min-w-[100px]">
                        <div className="flex flex-col gap-1">
                          <Progress value={progress} className="h-1.5" />
                          <span className="text-[10px] text-muted-foreground">{progress.toFixed(0)}% pago</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleEdit(d)} className="p-1 rounded hover:bg-muted/40 text-muted-foreground hover:text-foreground transition-colors" aria-label="Editar"><Pencil className="size-3.5" /></button>
                          <button onClick={() => onRemove(d.id)} className="p-1 rounded hover:bg-[hsl(var(--risk-critical))/15] text-muted-foreground hover:text-[hsl(var(--risk-critical))] transition-colors" aria-label="Remover"><Trash2 className="size-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <DebtModal open={modalOpen} onClose={() => { setModalOpen(false); setEditDebt(null); }} onSave={handleSave} editDebt={editDebt} />
    </div>
  );
}
