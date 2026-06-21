"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Shield, Database, RefreshCw, Cloud, Bell, Minus, Plus, CheckCircle2, Download, Trash2, ExternalLink, BrainCircuit, ToggleLeft, ToggleRight } from "lucide-react";
import { saveUserSettings } from "@/lib/notification-actions";
import { exportUserData, deleteAccount, saveAiConsent } from "@/lib/actions";
import { toast } from "sonner";

interface SettingsViewProps {
  onResetData: () => void;
  initialNotificationDays?: number;
  initialAiConsent?: boolean;
}

export function SettingsView({ onResetData, initialNotificationDays = 3, initialAiConsent = false }: SettingsViewProps) {
  const [days, setDays] = useState(initialNotificationDays);
  const [saved, setSaved] = useState(false);
  const [aiConsent, setAiConsent] = useState(initialAiConsent);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
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

  function handleExport() {
    startTransition(async () => {
      try {
        const data = await exportUserData();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `ohiro-ledger-export-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Dados exportados com sucesso");
      } catch {
        toast.error("Erro ao exportar dados");
      }
    });
  }

  function handleDeleteAccount() {
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      setTimeout(() => setDeleteConfirm(false), 5000);
      return;
    }
    startTransition(async () => {
      try {
        await deleteAccount();
        window.location.href = "/";
      } catch {
        toast.error("Erro ao excluir conta. Entre em contato com privacidade@ohiroledger.com");
        setDeleteConfirm(false);
      }
    });
  }

  function handleAiConsent() {
    const next = !aiConsent;
    startTransition(async () => {
      try {
        await saveAiConsent(next);
        setAiConsent(next);
        toast.success(next ? "Consentimento para IA registrado" : "Consentimento para IA revogado");
      } catch {
        toast.error("Erro ao atualizar consentimento");
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

      {/* IA Financeira — consentimento LGPD */}
      <div className="rounded-lg border border-border/40 bg-card/60 p-5">
        <div className="flex items-center gap-3 mb-4">
          <BrainCircuit className="size-5 text-primary" />
          <span className="text-sm font-mono font-semibold text-foreground">
            IA Financeira — Consentimento LGPD
          </span>
        </div>
        <p className="text-xs font-mono text-muted-foreground leading-relaxed mb-4">
          O assistente de IA envia suas mensagens e arquivos a provedores terceirizados (Google, OpenAI, Anthropic, Groq) que operam fora do Brasil.
          Você pode revogar o consentimento a qualquer momento.{" "}
          <a href="/privacidade#4" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline underline-offset-2 inline-flex items-center gap-1">
            Saiba mais <ExternalLink className="size-3" />
          </a>
        </p>
        <button
          onClick={handleAiConsent}
          disabled={isPending}
          className="flex items-center gap-2 text-xs font-mono text-foreground disabled:opacity-50"
          aria-label={aiConsent ? "Revogar consentimento para IA" : "Ativar consentimento para IA"}
        >
          {aiConsent
            ? <ToggleRight className="size-5 text-primary" />
            : <ToggleLeft className="size-5 text-muted-foreground" />}
          <span>{aiConsent ? "Consentimento ativo — clique para revogar" : "Consentimento não concedido — clique para ativar"}</span>
        </button>
      </div>

      {/* Exportação de dados — Art. 18 LGPD */}
      <div className="rounded-lg border border-border/40 bg-card/60 p-5">
        <div className="flex items-center gap-3 mb-4">
          <Download className="size-5 text-muted-foreground" />
          <span className="text-sm font-mono font-semibold text-foreground">
            Exportar Meus Dados
          </span>
        </div>
        <p className="text-xs font-mono text-muted-foreground leading-relaxed mb-4">
          Baixe uma cópia completa de todos os seus dados (transações, investimentos, dívidas, configurações) em formato JSON — direito garantido pelo Art. 18 da LGPD.
        </p>
        <Button
          variant="outline"
          size="sm"
          className="w-fit font-mono text-xs"
          onClick={handleExport}
          disabled={isPending}
        >
          <Download className="size-3.5" />
          Baixar exportação JSON
        </Button>
      </div>

      {/* Exclusão de conta — Art. 18 VI LGPD */}
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-5">
        <div className="flex items-center gap-3 mb-4">
          <Trash2 className="size-5 text-destructive" />
          <span className="text-sm font-mono font-semibold text-destructive">
            Excluir Conta e Dados
          </span>
        </div>
        <p className="text-xs font-mono text-muted-foreground leading-relaxed mb-4">
          Remove permanentemente sua conta e todos os dados associados (transações, investimentos, dívidas, notificações). Esta ação é irreversível. Exporte seus dados antes de prosseguir.
        </p>
        <Button
          variant="destructive"
          size="sm"
          className="w-fit font-mono text-xs"
          onClick={handleDeleteAccount}
          disabled={isPending}
        >
          <Trash2 className="size-3.5" />
          {deleteConfirm ? "Clique novamente para confirmar" : "Excluir minha conta"}
        </Button>
        {deleteConfirm && (
          <p className="text-[10px] font-mono text-destructive/70 mt-2">
            Confirme clicando novamente. O botão expirará em 5 segundos.
          </p>
        )}
      </div>

      {/* Cloud info */}
      <div className="rounded-lg border border-border/30 bg-muted/10 p-5">
        <div className="flex items-center gap-3 mb-3">
          <Cloud className="size-4 text-muted-foreground" />
          <span className="text-xs font-mono font-semibold text-muted-foreground">
            Infraestrutura &amp; Privacidade
          </span>
        </div>
        <div className="text-xs font-mono text-muted-foreground/70 leading-relaxed">
          Dados armazenados com Row Level Security (RLS) por usuário no Supabase PostgreSQL. Comunicação exclusivamente via HTTPS com headers de segurança (CSP, HSTS).{" "}
          <a href="/privacidade" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline underline-offset-2 inline-flex items-center gap-1">
            Política de Privacidade <ExternalLink className="size-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
