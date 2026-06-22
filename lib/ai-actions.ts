'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { checkRateLimit } from '@/lib/security'
import type { UIMessage } from 'ai'

async function requireUser() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) throw new Error('Não autenticado')
  return { supabase, user }
}

async function requireRateLimit(userId: string) {
  const { allowed } = checkRateLimit(`action:${userId}`)
  if (!allowed) throw new Error('Muitas requisições. Aguarde um momento e tente novamente.')
}

// ─── Sessões de chat ───────────────────────────────────────────────────────────

export interface AiSessionSummary {
  id: string
  title: string
  createdAt: string
  updatedAt: string
}

export async function listAiSessions(): Promise<AiSessionSummary[]> {
  const { supabase, user } = await requireUser()

  const { data, error } = await supabase
    .from('ai_sessions')
    .select('id, title, created_at, updated_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(100)

  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }))
}

export async function createAiSession(title?: string): Promise<AiSessionSummary> {
  const { supabase, user } = await requireUser()
  await requireRateLimit(user.id)

  const { data, error } = await supabase
    .from('ai_sessions')
    .insert({ user_id: user.id, title: title?.slice(0, 80) || 'Nova conversa' })
    .select('id, title, created_at, updated_at')
    .single()

  if (error) throw new Error(error.message)
  revalidatePath('/app')
  return { id: data.id, title: data.title, createdAt: data.created_at, updatedAt: data.updated_at }
}

export async function renameAiSession(sessionId: string, title: string): Promise<void> {
  const { supabase, user } = await requireUser()
  await requireRateLimit(user.id)

  const { error } = await supabase
    .from('ai_sessions')
    .update({ title: title.slice(0, 80), updated_at: new Date().toISOString() })
    .eq('id', sessionId)
    .eq('user_id', user.id)

  if (error) throw new Error(error.message)
  revalidatePath('/app')
}

export async function deleteAiSession(sessionId: string): Promise<void> {
  const { supabase, user } = await requireUser()
  await requireRateLimit(user.id)

  const { error } = await supabase
    .from('ai_sessions')
    .delete()
    .eq('id', sessionId)
    .eq('user_id', user.id)

  if (error) throw new Error(error.message)
  revalidatePath('/app')
}

export async function loadAiSessionMessages(sessionId: string): Promise<UIMessage[]> {
  const { supabase, user } = await requireUser()

  const { data, error } = await supabase
    .from('ai_messages')
    .select('id, role, parts')
    .eq('session_id', sessionId)
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(500)

  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => ({
    id: row.id,
    role: row.role,
    parts: row.parts,
  })) as UIMessage[]
}

// ─── Memória de longo prazo ────────────────────────────────────────────────────

export interface MemoryFact {
  key: string
  value: string
}

export async function getUserMemory(): Promise<MemoryFact[]> {
  const { supabase, user } = await requireUser()

  const { data, error } = await supabase
    .from('ai_memory')
    .select('facts')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error || !data) return []
  return Array.isArray(data.facts) ? data.facts : []
}

export async function clearUserMemory(): Promise<void> {
  const { supabase, user } = await requireUser()
  await requireRateLimit(user.id)

  const { error } = await supabase
    .from('ai_memory')
    .upsert({ user_id: user.id, facts: [], updated_at: new Date().toISOString() }, { onConflict: 'user_id' })

  if (error) throw new Error(error.message)
  revalidatePath('/app')
}
