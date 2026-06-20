"use client";

import { Button } from "@/components/ui/button";
import { Shield, Database, RefreshCw, Info } from "lucide-react";
import { MOCK_TRANSACTIONS, MOCK_INVESTMENTS, MOCK_DEBTS } from "@/lib/mock-data";
import { Transaction, Investment, Debt } from "@/lib/types";

interface SettingsViewProps {
  onResetData: (t: Transaction[], i: Investment[], d: Debt[]) => void;
}

export function SettingsView({ onResetData }: SettingsViewProps) {
  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-[800px] mx-auto">
      <div className="text-[11px] font-mono text-muted-foreground/50 tracking-widest uppercase">Configurações</div>

      {/* App info */}
      <div className="rounded-lg border border-border/40 bg-card/60 p-5">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="size-5 text-[hsl(var(--accent))]" />
          <span className="text-sm font-mono font-semibold text-foreground">Ohiro Ledger</span>
        </div>
        <div className="grid grid-cols-2 gap-3 text-xs font-mono">
          <div className="flex flex-col gap-1">
            <span className="text-muted-foreground tracking-wider uppercase text-[10px]">Versão</span>
            <span className="text-foreground font-bold">1.0.0</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-muted-foreground tracking-wider uppercase text-[10px]">Armazenamento</span>
            <span className="text-foreground font-bold">Local (localStorage)</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-muted-foreground tracking-wider uppercase text-[10px]">Modo</span>
            <span className="text-foreground font-bold">Tático Offline</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-muted-foreground tracking-wider uppercase text-[10px]">Stack</span>
            <span className="text-foreground font-bold">Next.js + TypeScript</span>
          </div>
        </div>
      </div>

      {/* Data management */}
      <div className="rounded-lg border border-border/40 bg-card/60 p-5">
        <div className="flex items-center gap-3 mb-4">
          <Database className="size-5 text-muted-foreground" />
          <span className="text-sm font-mono font-semibold text-foreground">Gestão de Dados</span>
        </div>
        <div className="flex flex-col gap-3">
          <p className="text-xs font-mono text-muted-foreground leading-relaxed">
            Todos os dados são armazenados localmente no seu navegador via localStorage. Limpar os dados do navegador removerá todos os lançamentos.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="w-fit font-mono text-xs"
            onClick={() => onResetData(MOCK_TRANSACTIONS, MOCK_INVESTMENTS, MOCK_DEBTS)}
          >
            <RefreshCw className="size-3.5" data-icon="inline-start" />
            Restaurar dados de demonstração
          </Button>
        </div>
      </div>

      {/* Architecture note */}
      <div className="rounded-lg border border-border/30 bg-muted/10 p-5">
        <div className="flex items-center gap-3 mb-3">
          <Info className="size-4 text-muted-foreground" />
          <span className="text-xs font-mono font-semibold text-muted-foreground">Arquitetura futura</span>
        </div>
        <div className="text-xs font-mono text-muted-foreground/70 leading-relaxed">
          O Ohiro Ledger foi projetado para evoluir para um backend real. A camada de dados ({'"'}lib/store.ts{'"'}) pode ser substituída por chamadas a uma API REST ou integração com Supabase / PostgreSQL sem alterações nos componentes de UI.
        </div>
      </div>
    </div>
  );
}
