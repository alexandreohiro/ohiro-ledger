'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Transaction, Investment, Debt } from '@/lib/types'
import { checkRateLimit } from '@/lib/security'

// ─── Helpers ───────────────────────────────────────────────────────────────────

/** Retorna o usuário autenticado ou lança erro. */
async function requireUser() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) throw new Error('Não autenticado')
  return { supabase, user }
}

/** Aplica rate limit nas mutations para evitar abuso. */
async function requireRateLimit(userId: string) {
  const { allowed } = checkRateLimit(`action:${userId}`)
  if (!allowed) throw new Error('Muitas requisições. Aguarde um momento e tente novamente.')
}

// ─── TRANSACTIONS ──────────────────────────────────────────────────────────────

export async function getTransactions(): Promise<Transaction[]> {
  const { supabase, user } = await requireUser()

  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', user.id)            // defesa em profundidade — não confiar só em RLS
    .order('date', { ascending: false })
    .limit(2000)                       // evita buscar histórico ilimitado

  if (error) throw new Error(error.message)

  return (data ?? []).map((row) => ({
    id: row.id,
    date: row.date,
    account: row.account,
    type: row.type,
    category: row.category,
    subcategory: row.subcategory,
    description: row.description,
    amount: Number(row.amount),
    currency: row.currency,
    exchangeRate: Number(row.exchange_rate),
    status: row.status,
    dueDate: row.due_date ?? undefined,
    recurrence: row.recurrence,
  }))
}

export async function addTransaction(tx: Omit<Transaction, 'id'>): Promise<void> {
  const { supabase, user } = await requireUser()
  await requireRateLimit(user.id)

  const { error } = await supabase.from('transactions').insert({
    user_id: user.id,
    date: tx.date,
    account: tx.account,
    type: tx.type,
    category: tx.category,
    subcategory: tx.subcategory,
    description: tx.description,
    amount: tx.amount,
    currency: tx.currency,
    exchange_rate: tx.exchangeRate,
    status: tx.status,
    due_date: tx.dueDate ?? null,
    recurrence: tx.recurrence,
  })

  if (error) throw new Error(error.message)
  revalidatePath('/app')
}

export async function updateTransaction(tx: Transaction): Promise<void> {
  const { supabase, user } = await requireUser()
  await requireRateLimit(user.id)

  const { error } = await supabase
    .from('transactions')
    .update({
      date: tx.date,
      account: tx.account,
      type: tx.type,
      category: tx.category,
      subcategory: tx.subcategory,
      description: tx.description,
      amount: tx.amount,
      currency: tx.currency,
      exchange_rate: tx.exchangeRate,
      status: tx.status,
      due_date: tx.dueDate ?? null,
      recurrence: tx.recurrence,
    })
    .eq('id', tx.id)
    .eq('user_id', user.id)

  if (error) throw new Error(error.message)
  revalidatePath('/app')
}

export async function deleteTransaction(id: string): Promise<void> {
  const { supabase, user } = await requireUser()
  await requireRateLimit(user.id)

  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw new Error(error.message)
  revalidatePath('/app')
}

// ─── INVESTMENTS ───────────────────────────────────────────────────────────────

export async function getInvestments(): Promise<Investment[]> {
  const { supabase, user } = await requireUser()

  const { data, error } = await supabase
    .from('investments')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(500)

  if (error) throw new Error(error.message)

  return (data ?? []).map((row) => ({
    id: row.id,
    assetName: row.asset_name,
    class: row.class,
    amount: Number(row.amount),
    currency: row.currency,
    exchangeRate: Number(row.exchange_rate),
    convertedAmountBRL: Number(row.converted_amount_brl),
    monthlyContribution: Number(row.monthly_contribution),
  }))
}

export async function addInvestment(inv: Omit<Investment, 'id'>): Promise<void> {
  const { supabase, user } = await requireUser()
  await requireRateLimit(user.id)

  const { error } = await supabase.from('investments').insert({
    user_id: user.id,
    asset_name: inv.assetName,
    class: inv.class,
    amount: inv.amount,
    currency: inv.currency,
    exchange_rate: inv.exchangeRate,
    converted_amount_brl: inv.convertedAmountBRL,
    monthly_contribution: inv.monthlyContribution,
  })

  if (error) throw new Error(error.message)
  revalidatePath('/app')
}

export async function updateInvestment(inv: Investment): Promise<void> {
  const { supabase, user } = await requireUser()
  await requireRateLimit(user.id)

  const { error } = await supabase
    .from('investments')
    .update({
      asset_name: inv.assetName,
      class: inv.class,
      amount: inv.amount,
      currency: inv.currency,
      exchange_rate: inv.exchangeRate,
      converted_amount_brl: inv.convertedAmountBRL,
      monthly_contribution: inv.monthlyContribution,
    })
    .eq('id', inv.id)
    .eq('user_id', user.id)

  if (error) throw new Error(error.message)
  revalidatePath('/app')
}

export async function deleteInvestment(id: string): Promise<void> {
  const { supabase, user } = await requireUser()
  await requireRateLimit(user.id)

  const { error } = await supabase
    .from('investments')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw new Error(error.message)
  revalidatePath('/app')
}

// ─── DEBTS ─────────────────────────────────────────────────────────────────────

export async function getDebts(): Promise<Debt[]> {
  const { supabase, user } = await requireUser()

  const { data, error } = await supabase
    .from('debts')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(500)

  if (error) throw new Error(error.message)

  return (data ?? []).map((row) => ({
    id: row.id,
    creditor: row.creditor,
    originalAmount: Number(row.original_amount),
    currentAmount: Number(row.current_amount),
    installmentAmount: Number(row.installment_amount),
    dueDate: row.due_date ?? undefined,
    interestRate: Number(row.interest_rate),
    status: row.status,
    priority: row.priority,
  }))
}

export async function addDebt(debt: Omit<Debt, 'id'>): Promise<void> {
  const { supabase, user } = await requireUser()
  await requireRateLimit(user.id)

  const { error } = await supabase.from('debts').insert({
    user_id: user.id,
    creditor: debt.creditor,
    original_amount: debt.originalAmount,
    current_amount: debt.currentAmount,
    installment_amount: debt.installmentAmount,
    due_date: debt.dueDate ?? null,
    interest_rate: debt.interestRate,
    status: debt.status,
    priority: debt.priority,
  })

  if (error) throw new Error(error.message)
  revalidatePath('/app')
}

export async function updateDebt(debt: Debt): Promise<void> {
  const { supabase, user } = await requireUser()
  await requireRateLimit(user.id)

  const { error } = await supabase
    .from('debts')
    .update({
      creditor: debt.creditor,
      original_amount: debt.originalAmount,
      current_amount: debt.currentAmount,
      installment_amount: debt.installmentAmount,
      due_date: debt.dueDate ?? null,
      interest_rate: debt.interestRate,
      status: debt.status,
      priority: debt.priority,
    })
    .eq('id', debt.id)
    .eq('user_id', user.id)

  if (error) throw new Error(error.message)
  revalidatePath('/app')
}

export async function deleteDebt(id: string): Promise<void> {
  const { supabase, user } = await requireUser()
  await requireRateLimit(user.id)

  const { error } = await supabase
    .from('debts')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw new Error(error.message)
  revalidatePath('/app')
}

// ─── AUTH ──────────────────────────────────────────────────────────────────────

export async function signOut(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/')
}

// ─── LGPD — Exportação de dados do titular (Art. 18 LGPD) ─────────────────────

export async function exportUserData(): Promise<object> {
  const { supabase, user } = await requireUser()

  const { data, error } = await supabase.rpc('export_user_data', {
    p_user_id: user.id,
  })

  if (error) throw new Error(`Falha na exportação: ${error.message}`)
  return data as object
}

// ─── LGPD — Exclusão de conta (Art. 18 VI LGPD — direito ao esquecimento) ──────

export async function deleteAccount(): Promise<void> {
  const { supabase, user } = await requireUser()

  // Usa service_role implícito via SECURITY DEFINER na função SQL
  const { error } = await supabase.rpc('delete_user_account', {
    p_user_id: user.id,
  })

  if (error) throw new Error(`Falha na exclusão: ${error.message}`)

  // Invalida a sessão localmente
  await supabase.auth.signOut()
  revalidatePath('/')
}

// ─── LGPD — Consentimento para uso de IA ──────────────────────────────────────

export async function saveAiConsent(consented: boolean): Promise<void> {
  const { supabase, user } = await requireUser()

  const { error } = await supabase
    .from('user_settings')
    .upsert(
      {
        user_id: user.id,
        ai_consent: consented,
        ai_consent_at: consented ? new Date().toISOString() : null,
      },
      { onConflict: 'user_id' },
    )

  if (error) throw new Error(error.message)
  revalidatePath('/app')
}

export async function getAiConsent(): Promise<boolean> {
  const { supabase, user } = await requireUser()

  const { data, error } = await supabase
    .from('user_settings')
    .select('ai_consent')
    .eq('user_id', user.id)
    .maybeSingle()

  // Falha aberta: schema desatualizado (coluna ausente) não deve derrubar a página /app.
  if (error) return false
  return data?.ai_consent ?? false
}
