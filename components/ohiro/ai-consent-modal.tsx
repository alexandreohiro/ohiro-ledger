"use client";

import { useState, useTransition } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Shield, ExternalLink, AlertTriangle } from "lucide-react";
import { saveAiConsent } from "@/lib/actions";
import { toast } from "sonner";

interface AiConsentModalProps {
  open: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export function AiConsentModal({ open, onAccept, onDecline }: AiConsentModalProps) {
  const [isPending, startTransition] = useTransition();

  function handleAccept() {
    startTransition(async () => {
      try {
        await saveAiConsent(true);
        onAccept();
      } catch {
        toast.error("Erro ao registrar consentimento. Tente novamente.");
      }
    });
  }

  function handleDecline() {
    onDecline();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleDecline(); }}>
      <DialogContent className="max-w-md font-mono">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="flex items-center justify-center size-8 rounded-md bg-amber-500/10 border border-amber-500/20">
              <Shield className="size-4 text-amber-500" />
            </div>
            <DialogTitle className="text-sm font-bold">Consentimento para IA Financeira</DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed pt-1">
            Antes de usar o assistente de IA, você precisa consentir com o tratamento de dados conforme a LGPD.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 text-xs text-foreground/80 leading-relaxed">

          <div className="rounded-md border border-amber-500/20 bg-amber-500/5 p-3 flex gap-2.5">
            <AlertTriangle className="size-3.5 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-amber-600 dark:text-amber-400">
              Suas mensagens e arquivos enviados ao chat serão processados por provedores de IA terceirizados (Google, OpenAI, Anthropic ou Groq) que operam <strong>fora do Brasil</strong>, constituindo transferência internacional de dados.
            </p>
          </div>

          <ul className="space-y-1.5 text-muted-foreground">
            <li className="flex gap-2">
              <span className="text-primary shrink-0">•</span>
              Os provedores <strong className="text-foreground">não armazenam</strong> seus dados de forma permanente para treinar modelos (mediante configuração de API).
            </li>
            <li className="flex gap-2">
              <span className="text-primary shrink-0">•</span>
              <strong className="text-foreground">Não inclua</strong> CPF, número de cartão, senhas ou dados de terceiros nas mensagens.
            </li>
            <li className="flex gap-2">
              <span className="text-primary shrink-0">•</span>
              Você pode revogar este consentimento a qualquer momento em{" "}
              <strong className="text-foreground">Configurações → IA Financeira</strong>.
            </li>
          </ul>

          <a
            href="/privacidade"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline underline-offset-2"
          >
            <ExternalLink className="size-3" />
            Ler a Política de Privacidade completa
          </a>
        </div>

        <div className="flex gap-2 mt-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs"
            onClick={handleDecline}
            disabled={isPending}
          >
            Recusar
          </Button>
          <Button
            size="sm"
            className="flex-1 text-xs"
            onClick={handleAccept}
            disabled={isPending}
          >
            {isPending ? "Registrando…" : "Aceitar e continuar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
