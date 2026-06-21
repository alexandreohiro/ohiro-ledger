-- Alertas de vencimento/atraso de dívidas, gerados por syncDebtNotifications()
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('debt_due', 'debt_overdue')),
  title text not null,
  message text not null,
  debt_id uuid references public.debts(id) on delete cascade,
  due_date date,
  read boolean not null default false,
  dismissed boolean not null default false,
  created_at timestamptz not null default now()
);

-- Garante a idempotência por debt_id + tipo + due_date (evita alertas duplicados)
create unique index if not exists notifications_dedup_idx
  on public.notifications (user_id, debt_id, type, due_date);

create index if not exists notifications_user_id_idx on public.notifications (user_id);
create index if not exists notifications_user_id_dismissed_idx on public.notifications (user_id, dismissed, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own" on public.notifications
  for select using (auth.uid() = user_id);

drop policy if exists "notifications_insert_own" on public.notifications;
create policy "notifications_insert_own" on public.notifications
  for insert with check (auth.uid() = user_id);

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own" on public.notifications
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "notifications_delete_own" on public.notifications;
create policy "notifications_delete_own" on public.notifications
  for delete using (auth.uid() = user_id);
