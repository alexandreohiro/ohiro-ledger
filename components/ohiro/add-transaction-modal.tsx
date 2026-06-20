"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Transaction, TransactionType, TransactionStatus, Currency, RecurrenceType } from "@/lib/types";

interface AddTransactionModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (transaction: Transaction) => void;
  editTransaction?: Transaction | null;
}

const TYPES: TransactionType[] = ["Receita", "Gasto", "Dívida", "Investimento", "Transferência", "Reserva"];
const STATUSES: TransactionStatus[] = ["Previsto", "Pago", "Pendente", "Atrasado", "Recorrente"];
const CURRENCIES: Currency[] = ["BRL", "USD", "EUR"];
const RECURRENCES: RecurrenceType[] = ["Mensal", "Semanal", "Anual", "Única", "Nenhuma"];

const CATEGORIES: Record<TransactionType, string[]> = {
  Receita: ["Salário", "Benefícios", "Adicionais", "Freelance", "Outros"],
  Gasto: ["Alimentação", "Transporte", "Internet", "Igreja", "Assinaturas", "Saúde", "Educação", "Lazer", "Cartão de Crédito", "Outros"],
  Dívida: ["Banco", "Cartão", "Empréstimo", "Financiamento", "Outros"],
  Investimento: ["Renda Fixa", "Renda Variável", "Conta Global", "Cripto", "Reserva de Emergência", "Outros"],
  Transferência: ["Interna", "Externa", "Outros"],
  Reserva: ["Emergência", "Objetivo", "Outros"],
};

function generateId(): string {
  return `t${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function AddTransactionModal({ open, onClose, onAdd, editTransaction }: AddTransactionModalProps) {
  const today = new Date().toISOString().split("T")[0];

  const [form, setForm] = useState<Partial<Transaction>>(
    editTransaction ?? {
      date: today,
      account: "",
      type: "Gasto",
      category: "",
      subcategory: "",
      description: "",
      amount: 0,
      currency: "BRL",
      exchangeRate: 1,
      status: "Previsto",
      dueDate: today,
      recurrence: "Nenhuma",
    }
  );

  const set = (key: keyof Transaction, value: unknown) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const transaction: Transaction = {
      id: editTransaction?.id ?? generateId(),
      date: form.date ?? today,
      account: form.account ?? "",
      type: form.type as TransactionType ?? "Gasto",
      category: form.category ?? "",
      subcategory: form.subcategory ?? "",
      description: form.description ?? "",
      amount: Number(form.amount) || 0,
      currency: form.currency as Currency ?? "BRL",
      exchangeRate: Number(form.exchangeRate) || 1,
      status: form.status as TransactionStatus ?? "Previsto",
      dueDate: form.dueDate ?? today,
      recurrence: form.recurrence as RecurrenceType ?? "Nenhuma",
    };
    onAdd(transaction);
    onClose();
  };

  const categories = CATEGORIES[form.type as TransactionType] ?? [];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg bg-card border-border/60">
        <DialogHeader>
          <DialogTitle className="font-mono text-sm tracking-wide">
            {editTransaction ? "EDITAR LANÇAMENTO" : "NOVO LANÇAMENTO"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-mono text-muted-foreground tracking-wider uppercase">Tipo</label>
              <Select value={form.type} onValueChange={(v) => { set("type", v); set("category", ""); }}>
                <SelectTrigger className="h-8 text-xs font-mono">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => <SelectItem key={t} value={t} className="text-xs font-mono">{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-mono text-muted-foreground tracking-wider uppercase">Status</label>
              <Select value={form.status} onValueChange={(v) => set("status", v)}>
                <SelectTrigger className="h-8 text-xs font-mono">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => <SelectItem key={s} value={s} className="text-xs font-mono">{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-mono text-muted-foreground tracking-wider uppercase">Descrição</label>
            <Input
              className="h-8 text-xs font-mono"
              value={form.description ?? ""}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Descrição do lançamento"
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-mono text-muted-foreground tracking-wider uppercase">Valor</label>
              <Input
                className="h-8 text-xs font-mono"
                type="number"
                step="0.01"
                min="0"
                value={form.amount ?? ""}
                onChange={(e) => set("amount", parseFloat(e.target.value) || 0)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-mono text-muted-foreground tracking-wider uppercase">Moeda</label>
              <Select value={form.currency} onValueChange={(v) => set("currency", v)}>
                <SelectTrigger className="h-8 text-xs font-mono">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => <SelectItem key={c} value={c} className="text-xs font-mono">{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {form.currency !== "BRL" && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-mono text-muted-foreground tracking-wider uppercase">Cotação</label>
                <Input
                  className="h-8 text-xs font-mono"
                  type="number"
                  step="0.01"
                  value={form.exchangeRate ?? 1}
                  onChange={(e) => set("exchangeRate", parseFloat(e.target.value) || 1)}
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-mono text-muted-foreground tracking-wider uppercase">Categoria</label>
              <Select value={form.category} onValueChange={(v) => set("category", v)}>
                <SelectTrigger className="h-8 text-xs font-mono">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => <SelectItem key={c} value={c} className="text-xs font-mono">{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-mono text-muted-foreground tracking-wider uppercase">Conta</label>
              <Input
                className="h-8 text-xs font-mono"
                value={form.account ?? ""}
                onChange={(e) => set("account", e.target.value)}
                placeholder="Ex: Nubank"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-mono text-muted-foreground tracking-wider uppercase">Data</label>
              <Input
                className="h-8 text-xs font-mono"
                type="date"
                value={form.date ?? today}
                onChange={(e) => set("date", e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-mono text-muted-foreground tracking-wider uppercase">Vencimento</label>
              <Input
                className="h-8 text-xs font-mono"
                type="date"
                value={form.dueDate ?? today}
                onChange={(e) => set("dueDate", e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-mono text-muted-foreground tracking-wider uppercase">Recorrência</label>
              <Select value={form.recurrence} onValueChange={(v) => set("recurrence", v)}>
                <SelectTrigger className="h-8 text-xs font-mono">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RECURRENCES.map((r) => <SelectItem key={r} value={r} className="text-xs font-mono">{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border/40">
            <Button type="button" variant="outline" size="sm" onClick={onClose} className="font-mono text-xs">
              Cancelar
            </Button>
            <Button type="submit" size="sm" className="font-mono text-xs">
              {editTransaction ? "Salvar alterações" : "Adicionar lançamento"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
