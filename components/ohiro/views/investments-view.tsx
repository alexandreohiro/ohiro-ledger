"use client";

import { useState } from "react";
import { Investment, InvestmentClass } from "@/lib/types";
import { formatCurrency } from "@/lib/calculations";
import { CurrencyBadge } from "../risk-badge";
import { SummaryCard } from "../summary-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Pencil, Globe, TrendingUp, Wallet, CalendarClock, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface InvestmentsViewProps {
  investments: Investment[];
  usdRate: number;
  onAdd: (inv: Investment) => void;
  onUpdate: (inv: Investment) => void;
  onRemove: (id: string) => void;
  onSetUsdRate: (rate: number) => void;
}

const INVESTMENT_CLASSES: InvestmentClass[] = [
  "Renda Fixa", "Renda Variável", "Conta Global", "Cripto", "Reserva de Emergência", "Outros"
];

const CLASS_COLORS: Record<InvestmentClass, string> = {
  "Renda Fixa": "hsl(60 70% 50%)",
  "Renda Variável": "hsl(142 60% 45%)",
  "Conta Global": "hsl(200 80% 55%)",
  "Cripto": "hsl(35 90% 55%)",
  "Reserva de Emergência": "hsl(260 60% 55%)",
  "Outros": "hsl(0 0% 50%)",
};

function generateId(): string {
  return `i${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function InvestmentModal({
  open,
  onClose,
  onSave,
  editInvestment,
  usdRate,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (inv: Investment) => void;
  editInvestment?: Investment | null;
  usdRate: number;
}) {
  const [form, setForm] = useState<Partial<Investment>>(
    editInvestment ?? {
      assetName: "",
      class: "Renda Fixa",
      amount: 0,
      currency: "BRL",
      exchangeRate: usdRate,
      convertedAmountBRL: 0,
      monthlyContribution: 0,
    }
  );

  const set = (key: keyof Investment, value: unknown) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "amount" || key === "exchangeRate" || key === "currency") {
        const amt = key === "amount" ? Number(value) : Number(prev.amount) || 0;
        const rate = key === "exchangeRate" ? Number(value) : Number(prev.exchangeRate) || 1;
        const cur = key === "currency" ? value : prev.currency;
        next.convertedAmountBRL = cur === "BRL" ? amt : amt * rate;
      }
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const inv: Investment = {
      id: editInvestment?.id ?? generateId(),
      assetName: form.assetName ?? "",
      class: form.class as InvestmentClass ?? "Renda Fixa",
      amount: Number(form.amount) || 0,
      currency: (form.currency ?? "BRL") as "BRL" | "USD" | "EUR",
      exchangeRate: Number(form.exchangeRate) || 1,
      convertedAmountBRL: Number(form.convertedAmountBRL) || 0,
      monthlyContribution: Number(form.monthlyContribution) || 0,
    };
    onSave(inv);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-card border-border/60">
        <DialogHeader>
          <DialogTitle className="font-mono text-sm tracking-wide">
            {editInvestment ? "EDITAR INVESTIMENTO" : "NOVO INVESTIMENTO"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-mono text-muted-foreground tracking-wider uppercase">Nome do Ativo</label>
            <Input className="h-8 text-xs font-mono" value={form.assetName ?? ""} onChange={(e) => set("assetName", e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-mono text-muted-foreground tracking-wider uppercase">Classe</label>
              <Select value={form.class} onValueChange={(v) => set("class", v)}>
                <SelectTrigger className="h-8 text-xs font-mono"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INVESTMENT_CLASSES.map((c) => <SelectItem key={c} value={c} className="text-xs font-mono">{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-mono text-muted-foreground tracking-wider uppercase">Moeda</label>
              <Select value={form.currency} onValueChange={(v) => set("currency", v)}>
                <SelectTrigger className="h-8 text-xs font-mono"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["BRL", "USD", "EUR"].map((c) => <SelectItem key={c} value={c} className="text-xs font-mono">{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-mono text-muted-foreground tracking-wider uppercase">Saldo</label>
              <Input className="h-8 text-xs font-mono" type="number" step="0.01" value={form.amount ?? ""} onChange={(e) => set("amount", e.target.value)} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-mono text-muted-foreground tracking-wider uppercase">Aporte mensal</label>
              <Input className="h-8 text-xs font-mono" type="number" step="0.01" value={form.monthlyContribution ?? ""} onChange={(e) => set("monthlyContribution", e.target.value)} />
            </div>
          </div>
          {form.currency !== "BRL" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-mono text-muted-foreground tracking-wider uppercase">Cotação (BRL)</label>
                <Input className="h-8 text-xs font-mono" type="number" step="0.01" value={form.exchangeRate ?? usdRate} onChange={(e) => set("exchangeRate", e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-mono text-muted-foreground tracking-wider uppercase">Convertido BRL</label>
                <Input className="h-8 text-xs font-mono" readOnly value={formatCurrency(Number(form.convertedAmountBRL) || 0)} />
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2 border-t border-border/40">
            <Button type="button" variant="outline" size="sm" onClick={onClose} className="font-mono text-xs">Cancelar</Button>
            <Button type="submit" size="sm" className="font-mono text-xs">{editInvestment ? "Salvar" : "Adicionar"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CenterLabel({ total }: { total: number }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
      <span className="text-[10px] font-mono text-muted-foreground tracking-widest uppercase">Total</span>
      <span className="text-lg font-mono font-bold text-foreground">{formatCurrency(total)}</span>
    </div>
  );
}

export function InvestmentsView({ investments, usdRate, onAdd, onUpdate, onRemove, onSetUsdRate }: InvestmentsViewProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editInv, setEditInv] = useState<Investment | null>(null);
  const [filterClass, setFilterClass] = useState<InvestmentClass | "Todos">("Todos");

  const totalBRL = investments.reduce((s, i) => s + i.convertedAmountBRL, 0);
  const totalUSD = investments.filter((i) => i.currency === "USD").reduce((s, i) => s + i.amount, 0);
  const monthlyContribution = investments.reduce((s, i) => s + i.monthlyContribution, 0);

  const byClass: Record<string, number> = {};
  investments.forEach((inv) => {
    byClass[inv.class] = (byClass[inv.class] ?? 0) + inv.convertedAmountBRL;
  });
  const pieData = Object.entries(byClass)
    .map(([name, value]) => ({
      name,
      value,
      color: CLASS_COLORS[name as InvestmentClass] ?? "hsl(0 0% 50%)",
      pct: totalBRL > 0 ? (value / totalBRL) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value);

  const topClass = pieData[0]?.name ?? "—";

  const visibleInvestments = filterClass === "Todos"
    ? investments
    : investments.filter((i) => i.class === filterClass);

  function handleEdit(inv: Investment) {
    setEditInv(inv);
    setModalOpen(true);
  }

  function handleSave(inv: Investment) {
    if (editInv) onUpdate(inv);
    else onAdd(inv);
    setEditInv(null);
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-[11px] font-mono text-muted-foreground/50 tracking-widest uppercase">Carteira de Investimentos</div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <Globe className="size-3.5 text-muted-foreground" />
            <span className="text-[11px] font-mono text-muted-foreground">USD/BRL</span>
            <Input
              type="number"
              step="0.01"
              className="h-7 w-20 text-xs font-mono"
              value={usdRate}
              onChange={(e) => onSetUsdRate(parseFloat(e.target.value) || usdRate)}
            />
          </div>
          <Button size="sm" onClick={() => setModalOpen(true)} className="font-mono text-xs h-8">
            <Plus className="size-3.5" data-icon="inline-start" />
            Investimento
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryCard
          title="Total em BRL"
          value={formatCurrency(totalBRL)}
          icon={Wallet}
          variant="accent"
          subtitle="Carteira consolidada"
        />
        <SummaryCard
          title="Exposição USD"
          value={`$ ${totalUSD.toFixed(2)}`}
          icon={Globe}
          subtitle="Ativos em dólar"
        />
        <SummaryCard
          title="Aporte Mensal"
          value={formatCurrency(monthlyContribution)}
          icon={CalendarClock}
          subtitle="Contribuição recorrente"
        />
        <SummaryCard
          title="Classe Dominante"
          value={topClass}
          icon={Layers}
          subtitle={`${investments.length} ativo${investments.length === 1 ? "" : "s"}`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Allocation */}
        {pieData.length > 0 && (
          <div className="rounded-lg border border-border/40 bg-card/60 p-4 flex flex-col">
            <div className="text-[11px] font-mono text-muted-foreground/50 tracking-widest uppercase mb-3">Alocação por Classe</div>
            <div className="relative">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={62} outerRadius={88} paddingAngle={3} dataKey="value" stroke="transparent">
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                </PieChart>
              </ResponsiveContainer>
              <CenterLabel total={totalBRL} />
            </div>
            <div className="flex flex-col gap-2.5 mt-3">
              {pieData.map((item) => (
                <button
                  key={item.name}
                  onClick={() => setFilterClass(filterClass === item.name ? "Todos" : item.name as InvestmentClass)}
                  className={cn(
                    "flex flex-col gap-1 rounded-md px-2 py-1.5 -mx-2 transition-colors text-left",
                    filterClass === item.name ? "bg-muted/40" : "hover:bg-muted/20"
                  )}
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="size-2 rounded-full" style={{ background: item.color }} />
                      <span className="font-mono text-muted-foreground">{item.name}</span>
                    </div>
                    <span className="font-mono text-foreground">{formatCurrency(item.value)}</span>
                  </div>
                  <Progress value={item.pct} className="h-1" style={{ "--progress-color": item.color } as React.CSSProperties} />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Asset list */}
        <div className={cn("rounded-lg border border-border/40 bg-card/60 overflow-hidden flex flex-col", pieData.length > 0 ? "lg:col-span-2" : "lg:col-span-3")}>
          <div className="p-4 border-b border-border/40 flex items-center justify-between">
            <div className="text-[11px] font-mono text-muted-foreground/50 tracking-widest uppercase">
              Ativos na Carteira {filterClass !== "Todos" && `· ${filterClass}`}
            </div>
            {filterClass !== "Todos" && (
              <button onClick={() => setFilterClass("Todos")} className="text-[10px] font-mono text-muted-foreground hover:text-foreground underline">
                limpar filtro
              </button>
            )}
          </div>
          <div className="flex flex-col divide-y divide-border/20 overflow-y-auto max-h-[420px]">
            {visibleInvestments.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <TrendingUp className="size-8 mx-auto mb-2 opacity-20" />
                <div>Nenhum investimento cadastrado</div>
              </div>
            ) : (
              visibleInvestments.map((inv) => {
                const pctOfTotal = totalBRL > 0 ? (inv.convertedAmountBRL / totalBRL) * 100 : 0;
                return (
                  <div key={inv.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/10 transition-colors">
                    <span className="size-2 rounded-full shrink-0" style={{ background: CLASS_COLORS[inv.class] ?? "currentColor" }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-medium text-foreground truncate">{inv.assetName}</span>
                        <CurrencyBadge currency={inv.currency} />
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Progress value={pctOfTotal} className="h-1 flex-1" style={{ "--progress-color": CLASS_COLORS[inv.class] } as React.CSSProperties} />
                        <span className="text-[10px] font-mono text-muted-foreground w-10 text-right">{pctOfTotal.toFixed(1)}%</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-mono text-sm font-bold text-foreground">
                        {inv.currency !== "BRL" ? inv.amount.toFixed(2) : formatCurrency(inv.amount)}
                      </div>
                      <div className="font-mono text-[11px] text-[hsl(var(--accent))]">{formatCurrency(inv.convertedAmountBRL)}</div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => handleEdit(inv)} className="p-1 rounded hover:bg-muted/40 text-muted-foreground hover:text-foreground transition-colors" aria-label="Editar"><Pencil className="size-3.5" /></button>
                      <button onClick={() => onRemove(inv.id)} className="p-1 rounded hover:bg-[hsl(var(--risk-critical))/15] text-muted-foreground hover:text-[hsl(var(--risk-critical))] transition-colors" aria-label="Remover"><Trash2 className="size-3.5" /></button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <InvestmentModal open={modalOpen} onClose={() => { setModalOpen(false); setEditInv(null); }} onSave={handleSave} editInvestment={editInv} usdRate={usdRate} />
    </div>
  );
}
