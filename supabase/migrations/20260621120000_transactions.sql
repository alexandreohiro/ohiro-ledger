-- Lançamentos financeiros (receitas, gastos, dívidas, investimentos, transferências, reservas)
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  account text not null default '',
  type text not null check (type in ('Receita', 'Gasto', 'Dívida', 'Investimento', 'Transferência', 'Reserva')),
  category text not null,
  subcategory text not null default '',
  description text not null default '',
  amount numeric(14, 2) not null check (amount > 0),
  currency text not null default 'BRL' check (currency in ('BRL', 'USD', 'EUR')),
  exchange_rate numeric(14, 6) not null default 1 check (exchange_rate > 0),
  status text not null check (status in ('Previsto', 'Pago', 'Pendente', 'Atrasado', 'Recorrente')),
  due_date date,
  recurrence text not null default 'Nenhuma' check (recurrence in ('Mensal', 'Semanal', 'Anual', 'Única', 'Nenhuma')),
  created_at timestamptz not null default now()
);

create index if not exists transactions_user_id_idx on public.transactions (user_id);
create index if not exists transactions_user_id_date_idx on public.transactions (user_id, date desc);
create index if not exists transactions_user_id_due_date_idx on public.transactions (user_id, due_date) where due_date is not null;

alter table public.transactions enable row level security;

drop policy if exists "transactions_select_own" on public.transactions;
create policy "transactions_select_own" on public.transactions
  for select using (auth.uid() = user_id);

drop policy if exists "transactions_insert_own" on public.transactions;
create policy "transactions_insert_own" on public.transactions
  for insert with check (auth.uid() = user_id);

drop policy if exists "transactions_update_own" on public.transactions;
create policy "transactions_update_own" on public.transactions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "transactions_delete_own" on public.transactions;
create policy "transactions_delete_own" on public.transactions
  for delete using (auth.uid() = user_id);
