"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Shield, Database, RefreshCw, Cloud, Bell, Minus, Plus, CheckCircle2, Download, Trash2, ExternalLink, BrainCircuit, ToggleLeft, ToggleRight, Palette, Languages, Eraser } from "lucide-react";
import { saveUserSettings } from "@/lib/notification-actions";
import { exportUserData, deleteAccount, saveAiConsent, saveUserPreferences, type UserPreferences } from "@/lib/actions";
import { getUserMemory, clearUserMemory, type MemoryFact } from "@/lib/ai-actions";
import { toast } from "sonner";

interface SettingsViewProps {
  onResetData: () => void;
  initialNotificationDays?: number;
  initialAiConsent?: boolean;
  initialPreferences?: UserPreferences;
  onPreferencesChange?: (prefs: Partial<UserPreferences>) => void;
}

const DEFAULT_PREFS: UserPreferences = { themeMode: "dark", themePalette: "military", aiLanguage: "system" };

export function SettingsView({
  onResetData,
  initialNotificationDays = 3,
  initialAiConsent = false,
  initialPreferences = DEFAULT_PREFS,
  onPreferencesChange,
}: SettingsViewProps) {
  const [days, setDays] = useState(initialNotificationDays);
  const [saved, setSaved] = useState(false);
  const [aiConsent, setAiConsent] = useState(initialAiConsent);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [preferences, setPreferences] = useState<UserPreferences>(initialPreferences);
  const [memory, setMemory] = useState<MemoryFact[]>([]);
  const [memoryLoaded, setMemoryLoaded] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    getUserMemory()
      .then(setMemory)
      .catch(() => {})
      .finally(() => setMemoryLoaded(true));
  }, []);

  function handleClearMemory() {
    startTransition(async () => {
      try {
        await clearUserMemory();
        setMemory([]);
        toast.success("AI memory cleared");
      } catch {
        toast.error("Error clearing memory");
      }
    });
  }

  function handlePreferenceChange(patch: Partial<UserPreferences>) {
    const next = { ...preferences, ...patch };
    setPreferences(next);
    onPreferencesChange?.(patch);
    startTransition(async () => {
      try {
        await saveUserPreferences(patch);
      } catch {
        toast.error("Error saving preferences");
      }
    });
  }

  function handleSave() {
    startTransition(async () => {
      try {
        await saveUserSettings({ notificationDaysBefore: days });
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        toast.success(`Alerts set to ${days} day${days !== 1 ? "s" : ""} before due date`);
      } catch {
        toast.error("Error saving settings");
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
        toast.success("Data exported successfully");
      } catch {
        toast.error("Error exporting data");
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
        toast.error("Error deleting account. Contact privacidade@ohiroledger.com");
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
        toast.success(next ? "AI consent recorded" : "AI consent revoked");
      } catch {
        toast.error("Error updating consent");
      }
    });
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-[800px] mx-auto">
      <div className="text-[11px] font-mono text-muted-foreground/50 tracking-widest uppercase">
        Settings
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
              Version
            </span>
            <span className="text-foreground font-bold">1.0.0</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-muted-foreground tracking-wider uppercase text-[10px]">
              Storage
            </span>
            <span className="text-foreground font-bold">Supabase (PostgreSQL)</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-muted-foreground tracking-wider uppercase text-[10px]">
              Mode
            </span>
            <span className="text-foreground font-bold">Tactical Cloud</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-muted-foreground tracking-wider uppercase text-[10px]">
              Stack
            </span>
            <span className="text-foreground font-bold">Next.js 16 + Supabase</span>
          </div>
        </div>
      </div>

      {/* Appearance — theme & palette */}
      <div className="rounded-lg border border-border/40 bg-card/60 p-5">
        <div className="flex items-center gap-3 mb-4">
          <Palette className="size-5 text-primary" />
          <span className="text-sm font-mono font-semibold text-foreground">
            Appearance
          </span>
        </div>
        <div className="flex flex-col gap-4">
          <div>
            <span className="text-[10px] font-mono text-muted-foreground tracking-wider uppercase block mb-2">
              Theme mode
            </span>
            <div className="flex gap-2">
              {(["dark", "light", "system"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => handlePreferenceChange({ themeMode: mode })}
                  disabled={isPending}
                  className={`flex-1 h-8 rounded-md border text-xs font-mono capitalize transition-colors ${
                    preferences.themeMode === mode
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border/50 bg-muted/30 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
          <div>
            <span className="text-[10px] font-mono text-muted-foreground tracking-wider uppercase block mb-2">
              Color palette
            </span>
            <div className="flex gap-2">
              {([
                { value: "military", label: "Military" },
                { value: "vscode-terminal", label: "VSCode Terminal" },
              ] as const).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handlePreferenceChange({ themePalette: opt.value })}
                  disabled={isPending}
                  className={`flex-1 h-8 rounded-md border text-xs font-mono transition-colors ${
                    preferences.themePalette === opt.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border/50 bg-muted/30 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* AI response language */}
      <div className="rounded-lg border border-border/40 bg-card/60 p-5">
        <div className="flex items-center gap-3 mb-4">
          <Languages className="size-5 text-primary" />
          <span className="text-sm font-mono font-semibold text-foreground">
            AI Response Language
          </span>
        </div>
        <p className="text-xs font-mono text-muted-foreground leading-relaxed mb-4">
          Choose the language the AI assistant uses to reply. &quot;System&quot; follows your device&apos;s language.
        </p>
        <div className="flex gap-2">
          {([
            { value: "system", label: "System" },
            { value: "pt-BR", label: "Português" },
            { value: "en", label: "English" },
          ] as const).map((opt) => (
            <button
              key={opt.value}
              onClick={() => handlePreferenceChange({ aiLanguage: opt.value })}
              disabled={isPending}
              className={`flex-1 h-8 rounded-md border text-xs font-mono transition-colors ${
                preferences.aiLanguage === opt.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border/50 bg-muted/30 text-muted-foreground hover:text-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* AI memory — fatos lembrados pela IA entre conversas */}
      <div className="rounded-lg border border-border/40 bg-card/60 p-5">
        <div className="flex items-center gap-3 mb-4">
          <BrainCircuit className="size-5 text-primary" />
          <span className="text-sm font-mono font-semibold text-foreground">
            AI Memory
          </span>
        </div>
        <p className="text-xs font-mono text-muted-foreground leading-relaxed mb-4">
          Facts the AI assistant remembers across conversations to give more relevant answers.
        </p>
        {memoryLoaded && memory.length === 0 ? (
          <p className="text-xs font-mono text-muted-foreground/60 mb-4">No facts saved yet.</p>
        ) : (
          <div className="flex flex-col gap-1.5 mb-4">
            {memory.map((fact) => (
              <div key={fact.key} className="flex items-baseline gap-2 text-xs font-mono">
                <span className="text-muted-foreground tracking-wider uppercase text-[10px]">{fact.key}</span>
                <span className="text-foreground">{fact.value}</span>
              </div>
            ))}
          </div>
        )}
        <Button
          variant="outline"
          size="sm"
          className="w-fit font-mono text-xs"
          onClick={handleClearMemory}
          disabled={isPending || memory.length === 0}
        >
          <Eraser className="size-3.5" />
          Clear memory
        </Button>
      </div>

      {/* Notification settings */}
      <div className="rounded-lg border border-border/40 bg-card/60 p-5">
        <div className="flex items-center gap-3 mb-4">
          <Bell className="size-5 text-primary" />
          <span className="text-sm font-mono font-semibold text-foreground">
            Due Date Alerts
          </span>
        </div>
        <p className="text-xs font-mono text-muted-foreground leading-relaxed mb-4">
          Set how many business days before the due date you want to receive debt alerts. The default is 3 business days.
        </p>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDays((d) => Math.max(1, d - 1))}
              disabled={isPending || days <= 1}
              aria-label="Decrease days"
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
              aria-label="Increase days"
              className="flex items-center justify-center size-8 rounded-md border border-border/50 bg-muted/30 hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
            >
              <Plus className="size-3.5" />
            </button>
          </div>
          <span className="text-xs font-mono text-muted-foreground">
            day{days !== 1 ? "s" : ""} before due date
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
                Saved
              </>
            ) : isPending ? (
              "Saving…"
            ) : (
              "Save"
            )}
          </Button>
        </div>
      </div>

      {/* Data management */}
      <div className="rounded-lg border border-border/40 bg-card/60 p-5">
        <div className="flex items-center gap-3 mb-4">
          <Database className="size-5 text-muted-foreground" />
          <span className="text-sm font-mono font-semibold text-foreground">
            Data Management
          </span>
        </div>
        <div className="flex flex-col gap-3">
          <p className="text-xs font-mono text-muted-foreground leading-relaxed">
            All data is persisted in Supabase with Row Level Security per user. Each account has its own isolated and protected data.
          </p>
          <div className="flex flex-wrap gap-2">
            <a
              href="/api/export?format=json"
              download
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-border/50 bg-card/60 hover:bg-card text-xs font-mono text-foreground transition-colors"
            >
              <Download className="size-3.5" />
              Export JSON
            </a>
            <a
              href="/api/export?format=csv"
              download
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-border/50 bg-card/60 hover:bg-card text-xs font-mono text-foreground transition-colors"
            >
              <Download className="size-3.5" />
              Export CSV
            </a>
            <Button
              variant="destructive"
              size="sm"
              className="w-fit font-mono text-xs"
              onClick={onResetData}
            >
              <RefreshCw className="size-3.5" data-icon="inline-start" />
              Delete all data
            </Button>
          </div>
        </div>
      </div>

      {/* IA Financeira — consentimento LGPD */}
      <div className="rounded-lg border border-border/40 bg-card/60 p-5">
        <div className="flex items-center gap-3 mb-4">
          <BrainCircuit className="size-5 text-primary" />
          <span className="text-sm font-mono font-semibold text-foreground">
            AI Finance — LGPD Consent
          </span>
        </div>
        <p className="text-xs font-mono text-muted-foreground leading-relaxed mb-4">
          The AI assistant sends your messages and files to third-party providers (Google, OpenAI, Anthropic, Groq) operating outside Brazil.
          You can revoke consent at any time.{" "}
          <a href="/privacidade#4" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline underline-offset-2 inline-flex items-center gap-1">
            Learn more <ExternalLink className="size-3" />
          </a>
        </p>
        <button
          onClick={handleAiConsent}
          disabled={isPending}
          className="flex items-center gap-2 text-xs font-mono text-foreground disabled:opacity-50"
          aria-label={aiConsent ? "Revoke AI consent" : "Activate AI consent"}
        >
          {aiConsent
            ? <ToggleRight className="size-5 text-primary" />
            : <ToggleLeft className="size-5 text-muted-foreground" />}
          <span>{aiConsent ? "Consent active — click to revoke" : "Consent not granted — click to activate"}</span>
        </button>
      </div>

      {/* Exportação de dados — Art. 18 LGPD */}
      <div className="rounded-lg border border-border/40 bg-card/60 p-5">
        <div className="flex items-center gap-3 mb-4">
          <Download className="size-5 text-muted-foreground" />
          <span className="text-sm font-mono font-semibold text-foreground">
            Export My Data
          </span>
        </div>
        <p className="text-xs font-mono text-muted-foreground leading-relaxed mb-4">
          Download a complete copy of all your data (transactions, investments, debts, settings) in JSON format — a right guaranteed by Art. 18 of the LGPD.
        </p>
        <Button
          variant="outline"
          size="sm"
          className="w-fit font-mono text-xs"
          onClick={handleExport}
          disabled={isPending}
        >
          <Download className="size-3.5" />
          Download JSON export
        </Button>
      </div>

      {/* Exclusão de conta — Art. 18 VI LGPD */}
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-5">
        <div className="flex items-center gap-3 mb-4">
          <Trash2 className="size-5 text-destructive" />
          <span className="text-sm font-mono font-semibold text-destructive">
            Delete Account and Data
          </span>
        </div>
        <p className="text-xs font-mono text-muted-foreground leading-relaxed mb-4">
          Permanently removes your account and all associated data (transactions, investments, debts, notifications). This action is irreversible. Export your data before proceeding.
        </p>
        <Button
          variant="destructive"
          size="sm"
          className="w-fit font-mono text-xs"
          onClick={handleDeleteAccount}
          disabled={isPending}
        >
          <Trash2 className="size-3.5" />
          {deleteConfirm ? "Click again to confirm" : "Delete my account"}
        </Button>
        {deleteConfirm && (
          <p className="text-[10px] font-mono text-destructive/70 mt-2">
            Confirm by clicking again. The button will expire in 5 seconds.
          </p>
        )}
      </div>

      {/* Cloud info */}
      <div className="rounded-lg border border-border/30 bg-muted/10 p-5">
        <div className="flex items-center gap-3 mb-3">
          <Cloud className="size-4 text-muted-foreground" />
          <span className="text-xs font-mono font-semibold text-muted-foreground">
            Infrastructure &amp; Privacy
          </span>
        </div>
        <div className="text-xs font-mono text-muted-foreground/70 leading-relaxed">
          Data stored with Row Level Security (RLS) per user on Supabase PostgreSQL. Communication exclusively via HTTPS with security headers (CSP, HSTS).{" "}
          <a href="/privacidade" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline underline-offset-2 inline-flex items-center gap-1">
            Privacy Policy <ExternalLink className="size-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
