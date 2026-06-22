'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Transaction, Investment, Debt, Account } from '@/lib/types'

// ─── TRANSACTIONS ──────────────────────────────────────────────────────────────

export async function getTransactions(): Promise<Transaction[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', user.id)
    .order('date', { ascending: false })

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

export async function addTransaction(
  tx: Omit<Transaction, 'id'>,
): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

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
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

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
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

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
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const { data, error } = await supabase
    .from('investments')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

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

export async function addInvestment(
  inv: Omit<Investment, 'id'>,
): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

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
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

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
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

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
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const { data, error } = await supabase
    .from('debts')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

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
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

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
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

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
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const { error } = await supabase
    .from('debts')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw new Error(error.message)
  revalidatePath('/app')
}

// ─── ACCOUNTS ──────────────────────────────────────────────────────────────────

export async function getAccounts(): Promise<Account[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    balance: Number(row.balance),
    currency: row.currency,
    yieldIndex: row.yield_index,
    yieldRatePct: Number(row.yield_rate_pct),
  }))
}

export async function addAccount(account: Omit<Account, 'id'>): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const { error } = await supabase.from('accounts').insert({
    user_id: user.id,
    name: account.name,
    balance: account.balance,
    currency: account.currency,
    yield_index: account.yieldIndex,
    yield_rate_pct: account.yieldRatePct,
  })

  if (error) throw new Error(error.message)
  revalidatePath('/app')
}

export async function updateAccount(account: Account): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const { error } = await supabase
    .from('accounts')
    .update({
      name: account.name,
      balance: account.balance,
      currency: account.currency,
      yield_index: account.yieldIndex,
      yield_rate_pct: account.yieldRatePct,
    })
    .eq('id', account.id)
    .eq('user_id', user.id)

  if (error) throw new Error(error.message)
  revalidatePath('/app')
}

export async function deleteAccount(id: string): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const { error } = await supabase
    .from('accounts')
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
