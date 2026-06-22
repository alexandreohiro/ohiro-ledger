-- Sessões de chat com a IA: até agora as mensagens só viviam no estado do
-- React (useChat), então qualquer F5/refresh apagava a conversa inteira.
-- Estas tabelas permitem várias conversas salvas por usuário, navegáveis
-- por uma sidebar, com histórico persistente.

create table if not exists public.ai_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Nova conversa',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ai_sessions enable row level security;

drop policy if exists "ai_sessions_select_own" on public.ai_sessions;
create policy "ai_sessions_select_own" on public.ai_sessions
  for select using (auth.uid() = user_id);

drop policy if exists "ai_sessions_insert_own" on public.ai_sessions;
create policy "ai_sessions_insert_own" on public.ai_sessions
  for insert with check (auth.uid() = user_id);

drop policy if exists "ai_sessions_update_own" on public.ai_sessions;
create policy "ai_sessions_update_own" on public.ai_sessions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "ai_sessions_delete_own" on public.ai_sessions;
create policy "ai_sessions_delete_own" on public.ai_sessions
  for delete using (auth.uid() = user_id);

create index if not exists ai_sessions_user_id_updated_at_idx
  on public.ai_sessions (user_id, updated_at desc);

create table if not exists public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.ai_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  parts jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.ai_messages enable row level security;

drop policy if exists "ai_messages_select_own" on public.ai_messages;
create policy "ai_messages_select_own" on public.ai_messages
  for select using (auth.uid() = user_id);

drop policy if exists "ai_messages_insert_own" on public.ai_messages;
create policy "ai_messages_insert_own" on public.ai_messages
  for insert with check (auth.uid() = user_id);

drop policy if exists "ai_messages_delete_own" on public.ai_messages;
create policy "ai_messages_delete_own" on public.ai_messages
  for delete using (auth.uid() = user_id);

create index if not exists ai_messages_session_id_created_at_idx
  on public.ai_messages (session_id, created_at);

-- Memória de longo prazo: fatos que a IA aprende sobre o usuário e que
-- devem ser lembrados entre sessões diferentes (ex: nome, meta financeira).
create table if not exists public.ai_memory (
  user_id uuid primary key references auth.users(id) on delete cascade,
  facts jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.ai_memory enable row level security;

drop policy if exists "ai_memory_select_own" on public.ai_memory;
create policy "ai_memory_select_own" on public.ai_memory
  for select using (auth.uid() = user_id);

drop policy if exists "ai_memory_insert_own" on public.ai_memory;
create policy "ai_memory_insert_own" on public.ai_memory
  for insert with check (auth.uid() = user_id);

drop policy if exists "ai_memory_update_own" on public.ai_memory;
create policy "ai_memory_update_own" on public.ai_memory
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "ai_memory_delete_own" on public.ai_memory;
create policy "ai_memory_delete_own" on public.ai_memory
  for delete using (auth.uid() = user_id);
