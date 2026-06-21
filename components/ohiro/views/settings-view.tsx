"use client";

import { useState, useTransition } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Shield, Database, RefreshCw, Cloud, Bell, Minus, Plus, CheckCircle2, Download } from "lucide-react";
import { saveUserSettings } from "@/lib/notification-actions";
import { toast } from "sonner";

interface SettingsViewProps {
  onResetData: () => void;
  initialNotificationDays?: number;
}

export function SettingsView({ onResetData, initialNotificationDays = 3 }: SettingsViewProps) {
  const [days, setDays] = useState(initialNotificationDays);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      try {
        await saveUserSettings({ notificationDaysBefore: days });
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        toast.success(`Alertas configurados para ${days} dia${days !== 1 ? "s" : ""} antes do vencimento`);
      } catch {
        toast.error("Erro ao salvar configurações");
      }
    });
  }

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
            Ohiro
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

      {/* Notification settings */}
      <div className="rounded-lg border border-border/40 bg-card/60 p-5">
        <div className="flex items-center gap-3 mb-4">
          <Bell className="size-5 text-primary" />
          <span className="text-sm font-mono font-semibold text-foreground">
            Alertas de Vencimento
          </span>
        </div>
        <p className="text-xs font-mono text-muted-foreground leading-relaxed mb-4">
          Defina quantos dias úteis antes do vencimento você deseja receber alertas de dívidas. O padrão são 3 dias úteis.
        </p>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDays((d) => Math.max(1, d - 1))}
              disabled={isPending || days <= 1}
              aria-label="Diminuir dias"
              className="flex items-center justify-center size-8 rounded-md border border-border/50 bg-muted/30 hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
            >
              <Minus className="size-3.5" />
            </button>
            <div className="flex items-center justify-center w-14 h-8 rounded-md border border-border/50 bg-background text-sm font-mono font-bold text-foreground tabular-nums">
              {days}
            </div>
            <button
              onClick={() => setDays((d) => Math.min(30, d + 1))}
              disabled={isPending || days >= 30}
              aria-label="Aumentar dias"
              className="flex items-center justify-center size-8 rounded-md border border-border/50 bg-muted/30 hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
            >
              <Plus className="size-3.5" />
            </button>
          </div>
          <span className="text-xs font-mono text-muted-foreground">
            dia{days !== 1 ? "s" : ""} antes do vencimento
          </span>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isPending}
            className="ml-auto font-mono text-xs h-8 min-w-[80px]"
          >
            {saved ? (
              <>
                <CheckCircle2 className="size-3.5" />
                Salvo
              </>
            ) : isPending ? (
              "Salvando…"
            ) : (
              "Salvar"
            )}
          </Button>
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
          <div className="flex flex-wrap gap-2">
            <a
              href="/api/export?format=json"
              download
              className={buttonVariants({ variant: "outline", size: "sm", className: "w-fit font-mono text-xs" })}
            >
              <Download className="size-3.5" data-icon="inline-start" />
              Exportar JSON
            </a>
            <a
              href="/api/export?format=csv"
              download
              className={buttonVariants({ variant: "outline", size: "sm", className: "w-fit font-mono text-xs" })}
            >
              <Download className="size-3.5" data-icon="inline-start" />
              Exportar CSV
            </a>
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
