"use client";

import { useState } from "react";
import { Account, Currency } from "@/lib/types";
import { formatCurrency } from "@/lib/calculations";
import { CurrencyBadge } from "../risk-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Pencil, Landmark, Wallet } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface AccountsViewProps {
  accounts: Account[];
  onAdd: (account: Account) => void;
  onUpdate: (account: Account) => void;
  onRemove: (id: string) => void;
}

function generateId(): string {
  return `acc${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function AccountModal({
  open,
  onClose,
  onSave,
  editAccount,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (account: Account) => void;
  editAccount?: Account | null;
}) {
  const [form, setForm] = useState<Partial<Account>>(
    editAccount ?? {
      name: "",
      balance: 0,
      currency: "USD",
      yieldIndex: "",
      yieldRatePct: 0,
    }
  );

  const set = (key: keyof Account, value: unknown) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const account: Account = {
      id: editAccount?.id ?? generateId(),
      name: form.name ?? "",
      balance: Number(form.balance) || 0,
      currency: (form.currency ?? "USD") as Currency,
      yieldIndex: form.yieldIndex ?? "",
      yieldRatePct: Number(form.yieldRatePct) || 0,
    };
    onSave(account);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-card border-border/60">
        <DialogHeader>
          <DialogTitle className="font-mono text-sm tracking-wide">
            {editAccount ? "EDIT ACCOUNT" : "NEW ACCOUNT"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-mono text-muted-foreground tracking-wider uppercase">Bank / Account Name</label>
            <Input className="h-8 text-xs font-mono" value={form.name ?? ""} onChange={(e) => set("name", e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-mono text-muted-foreground tracking-wider uppercase">Balance</label>
              <Input className="h-8 text-xs font-mono" type="number" step="0.01" value={form.balance ?? ""} onChange={(e) => set("balance", e.target.value)} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-mono text-muted-foreground tracking-wider uppercase">Currency</label>
              <Select value={form.currency} onValueChange={(v) => set("currency", v)}>
                <SelectTrigger className="h-8 text-xs font-mono"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["USD", "BRL", "EUR"].map((c) => <SelectItem key={c} value={c} className="text-xs font-mono">{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-mono text-muted-foreground tracking-wider uppercase">Yield Index</label>
              <Input className="h-8 text-xs font-mono" placeholder="CDI, Savings..." value={form.yieldIndex ?? ""} onChange={(e) => set("yieldIndex", e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-mono text-muted-foreground tracking-wider uppercase">% of Index</label>
              <Input className="h-8 text-xs font-mono" type="number" step="0.01" placeholder="100" value={form.yieldRatePct ?? ""} onChange={(e) => set("yieldRatePct", e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-border/40">
            <Button type="button" variant="outline" size="sm" onClick={onClose} className="font-mono text-xs">Cancel</Button>
            <Button type="submit" size="sm" className="font-mono text-xs">{editAccount ? "Save" : "Add"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function AccountsView({ accounts, onAdd, onUpdate, onRemove }: AccountsViewProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editAccount, setEditAccount] = useState<Account | null>(null);

  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);

  function handleEdit(account: Account) {
    setEditAccount(account);
    setModalOpen(true);
  }

  function handleSave(account: Account) {
    if (editAccount) onUpdate(account);
    else onAdd(account);
    setEditAccount(null);
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-mono text-muted-foreground/50 tracking-widest uppercase">Bank Accounts</div>
        <Button size="sm" onClick={() => setModalOpen(true)} className="font-mono text-xs h-8">
          <Plus className="size-3.5" data-icon="inline-start" />
          Account
        </Button>
      </div>

      {/* General balance */}
      <div className="p-5 rounded-lg border border-[hsl(var(--accent))/20] bg-[hsl(var(--accent))/5]">
        <div className="flex items-center gap-2 mb-1">
          <Wallet className="size-3.5 text-[hsl(var(--accent))]" />
          <div className="text-[10px] font-mono text-muted-foreground tracking-wider uppercase">Total Balance</div>
        </div>
        <div className="text-3xl font-mono font-bold text-[hsl(var(--accent))]">{formatCurrency(totalBalance)}</div>
        <div className="text-[11px] font-mono text-muted-foreground mt-1">{accounts.length} account{accounts.length === 1 ? "" : "s"}</div>
      </div>

      {/* Per-bank cards */}
      {accounts.length === 0 ? (
        <div className="rounded-lg border border-border/40 bg-card/60 p-10 text-center text-muted-foreground">
          <Landmark className="size-8 mx-auto mb-2 opacity-20" />
          <div>No accounts yet</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {accounts.map((account) => (
            <div key={account.id} className="rounded-lg border border-border/40 bg-card/60 p-4 flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Landmark className="size-4 text-muted-foreground" />
                  <span className="font-mono text-sm font-medium text-foreground">{account.name}</span>
                </div>
                <CurrencyBadge currency={account.currency} />
              </div>
              <div className="text-xl font-mono font-bold text-foreground">{formatCurrency(account.balance)}</div>
              {account.yieldIndex && (
                <div className="text-[11px] font-mono text-muted-foreground">
                  {account.yieldRatePct}% of {account.yieldIndex}
                </div>
              )}
              <div className="flex items-center gap-1 justify-end pt-2 border-t border-border/30">
                <button onClick={() => handleEdit(account)} className="p-1 rounded hover:bg-muted/40 text-muted-foreground hover:text-foreground transition-colors" aria-label="Edit"><Pencil className="size-3.5" /></button>
                <button onClick={() => onRemove(account.id)} className="p-1 rounded hover:bg-[hsl(var(--risk-critical))/15] text-muted-foreground hover:text-[hsl(var(--risk-critical))] transition-colors" aria-label="Remove"><Trash2 className="size-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <AccountModal open={modalOpen} onClose={() => { setModalOpen(false); setEditAccount(null); }} onSave={handleSave} editAccount={editAccount} />
    </div>
  );
}
