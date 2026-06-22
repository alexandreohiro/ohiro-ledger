"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { DEBT_PRIORITY_LABEL } from "@/lib/i18n-labels";

export interface Notification {
  id: string;
  type: "debt_due" | "debt_overdue";
  title: string;
  message: string;
  debtId: string | null;
  dueDate: string | null;
  read: boolean;
  dismissed: boolean;
  createdAt: string;
}

export interface UserSettings {
  notificationDaysBefore: number;
}

// ── Configurações do usuário ────────────────────────────────────────────────────
export async function getUserSettings(): Promise<UserSettings> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { notificationDaysBefore: 3 };

  const { data } = await supabase
    .from("user_settings")
    .select("notification_days_before")
    .eq("id", user.id)
    .single();

  return { notificationDaysBefore: data?.notification_days_before ?? 3 };
}

export async function saveUserSettings(settings: UserSettings): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("user_settings")
    .upsert({ id: user.id, notification_days_before: settings.notificationDaysBefore });

  if (error) throw new Error(error.message);
  revalidatePath("/app");
}

// ── Buscar notificações não descartadas ─────────────────────────────────────────
export async function getNotifications(): Promise<Notification[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .eq("dismissed", false)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return [];

  return (data ?? []).map((row) => ({
    id: row.id,
    type: row.type as "debt_due" | "debt_overdue",
    title: row.title,
    message: row.message,
    debtId: row.debt_id ?? null,
    dueDate: row.due_date ?? null,
    read: row.read,
    dismissed: row.dismissed,
    createdAt: row.created_at,
  }));
}

export async function markNotificationRead(id: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", id)
    .eq("user_id", user.id);
}

export async function markAllNotificationsRead(): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", user.id)
    .eq("dismissed", false);
  revalidatePath("/app");
}

export async function dismissNotification(id: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from("notifications")
    .update({ dismissed: true })
    .eq("id", id)
    .eq("user_id", user.id);
}

// ── Motor de geração de notificações de dívidas ────────────────────────────────
// Chamado no carregamento de /app — idempotente via upsert por debt_id+due_date
export async function syncDebtNotifications(): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // Busca configuração
  const settings = await getUserSettings();
  const daysBefore = Math.max(1, Math.min(30, settings.notificationDaysBefore));

  // Busca dívidas ativas com vencimento
  const { data: debts } = await supabase
    .from("debts")
    .select("id, creditor, current_amount, installment_amount, due_date, status, priority")
    .eq("user_id", user.id)
    .in("status", ["Ativo", "Atrasado"])
    .not("due_date", "is", null);

  if (!debts?.length) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const toInsert: Array<{
    user_id: string;
    type: string;
    title: string;
    message: string;
    debt_id: string;
    due_date: string;
  }> = [];

  for (const debt of debts) {
    const due = new Date(debt.due_date);
    due.setHours(0, 0, 0, 0);
    const diffDays = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      // Vencida — notifica se não tiver alerta de overdue já
      const { data: existing } = await supabase
        .from("notifications")
        .select("id")
        .eq("user_id", user.id)
        .eq("debt_id", debt.id)
        .eq("type", "debt_overdue")
        .eq("due_date", debt.due_date)
        .maybeSingle();

      if (!existing) {
        toInsert.push({
          user_id: user.id,
          type: "debt_overdue",
          title: `Debt overdue — ${debt.creditor}`,
          message: `Your debt with ${debt.creditor} was due on ${due.toLocaleDateString("en-US")}. Current amount: $${Number(debt.current_amount).toFixed(2)}. Settle it to avoid additional interest.`,
          debt_id: debt.id,
          due_date: debt.due_date,
        });
      }
    } else if (diffDays <= daysBefore) {
      // Vencendo em breve
      const { data: existing } = await supabase
        .from("notifications")
        .select("id")
        .eq("user_id", user.id)
        .eq("debt_id", debt.id)
        .eq("type", "debt_due")
        .eq("due_date", debt.due_date)
        .maybeSingle();

      if (!existing) {
        const label = diffDays === 0 ? "today" : diffDays === 1 ? "tomorrow" : `in ${diffDays} days`;
        toInsert.push({
          user_id: user.id,
          type: "debt_due",
          title: `Debt due ${label} — ${debt.creditor}`,
          message: `Installment of $${Number(debt.installment_amount).toFixed(2)} with ${debt.creditor} is due ${label} (${due.toLocaleDateString("en-US")}). Priority: ${DEBT_PRIORITY_LABEL[debt.priority as keyof typeof DEBT_PRIORITY_LABEL] ?? debt.priority}.`,
          debt_id: debt.id,
          due_date: debt.due_date,
        });
      }
    }
  }

  if (toInsert.length > 0) {
    await supabase.from("notifications").insert(toInsert);
  }
}
