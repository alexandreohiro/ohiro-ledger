"use client";

import { Button } from "@/components/ui/button";
import { Shield, Database, RefreshCw, Cloud } from "lucide-react";

interface SettingsViewProps {
  onResetData: () => void;
}

export function SettingsView({ onResetData }: SettingsViewProps) {
  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-[800px] mx-auto">
      <div className="text-[11px] font-mono text-muted-foreground/50 tracking-widest uppercase">
        Configurações
      </div>

      {/* App info */}
      <div className="rounded-lg border border-border/40 bg-card/60 p-5">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="size-5 text-[hsl(var(--accent))]" />
          <span className="text-sm font-mono font-semibold text-foreground">
            Ohiro Ledger
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 text-xs font-mono">
          <div className="flex flex-col gap-1">
            <span className="text-muted-foreground tracking-wider uppercase text-[10px]">
              Versão
            </span>
            <span className="text-foreground font-bold">1.0.0</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-muted-foreground tracking-wider uppercase text-[10px]">
              Armazenamento
            </span>
            <span className="text-foreground font-bold">Supabase (PostgreSQL)</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-muted-foreground tracking-wider uppercase text-[10px]">
              Modo
            </span>
            <span className="text-foreground font-bold">Tático Cloud</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-muted-foreground tracking-wider uppercase text-[10px]">
              Stack
            </span>
            <span className="text-foreground font-bold">Next.js 16 + Supabase</span>
          </div>
        </div>
      </div>

      {/* Data management */}
      <div className="rounded-lg border border-border/40 bg-card/60 p-5">
        <div className="flex items-center gap-3 mb-4">
          <Database className="size-5 text-muted-foreground" />
          <span className="text-sm font-mono font-semibold text-foreground">
            Gestão de Dados
          </span>
        </div>
        <div className="flex flex-col gap-3">
          <p className="text-xs font-mono text-muted-foreground leading-relaxed">
            Todos os dados são persistidos no Supabase com Row Level Security por usuário. Cada conta possui seus próprios dados isolados e protegidos.
          </p>
          <Button
            variant="destructive"
            size="sm"
            className="w-fit font-mono text-xs"
            onClick={onResetData}
          >
            <RefreshCw className="size-3.5" data-icon="inline-start" />
            Apagar todos os dados
          </Button>
        </div>
      </div>

      {/* Cloud info */}
      <div className="rounded-lg border border-border/30 bg-muted/10 p-5">
        <div className="flex items-center gap-3 mb-3">
          <Cloud className="size-4 text-muted-foreground" />
          <span className="text-xs font-mono font-semibold text-muted-foreground">
            Infraestrutura
          </span>
        </div>
        <div className="text-xs font-mono text-muted-foreground/70 leading-relaxed">
          Os dados são armazenados em um banco PostgreSQL gerenciado pelo Supabase com autenticação nativa, Row Level Security (RLS) por usuário, e Server Actions do Next.js para todas as operações CRUD — sem exposição de credenciais no cliente.
        </div>
      </div>
    </div>
  );
}
