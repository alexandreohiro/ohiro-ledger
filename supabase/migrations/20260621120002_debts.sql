-- Dívidas (financiamentos, cartões, empréstimos)
create table if not exists public.debts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  creditor text not null,
  original_amount numeric(14, 2) not null check (original_amount > 0),
  current_amount numeric(14, 2) not null check (current_amount > 0),
  installment_amount numeric(14, 2) not null default 0 check (installment_amount >= 0),
  due_date date,
  interest_rate numeric(6, 4) not null default 0 check (interest_rate >= 0 and interest_rate <= 1),
  status text not null default 'Ativo' check (status in ('Ativo', 'Quitado', 'Atrasado', 'Renegociado')),
  priority text not null default 'Médio' check (priority in ('Baixo', 'Médio', 'Alto', 'Crítico')),
  created_at timestamptz not null default now()
);

create index if not exists debts_user_id_idx on public.debts (user_id);
create index if not exists debts_user_id_created_at_idx on public.debts (user_id, created_at desc);
create index if not exists debts_user_id_due_date_idx on public.debts (user_id, due_date) where due_date is not null;
create index if not exists debts_user_id_status_idx on public.debts (user_id, status);

alter table public.debts enable row level security;

drop policy if exists "debts_select_own" on public.debts;
create policy "debts_select_own" on public.debts
  for select using (auth.uid() = user_id);

drop policy if exists "debts_insert_own" on public.debts;
create policy "debts_insert_own" on public.debts
  for insert with check (auth.uid() = user_id);

drop policy if exists "debts_update_own" on public.debts;
create policy "debts_update_own" on public.debts
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "debts_delete_own" on public.debts;
create policy "debts_delete_own" on public.debts
  for delete using (auth.uid() = user_id);
