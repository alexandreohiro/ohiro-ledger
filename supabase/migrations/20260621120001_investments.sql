-- Carteira de investimentos do usuário
create table if not exists public.investments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  asset_name text not null,
  class text not null check (class in ('Renda Fixa', 'Renda Variável', 'Conta Global', 'Cripto', 'Reserva de Emergência', 'Outros')),
  amount numeric(14, 2) not null check (amount > 0),
  currency text not null default 'BRL' check (currency in ('BRL', 'USD', 'EUR')),
  exchange_rate numeric(14, 6) not null default 1 check (exchange_rate > 0),
  converted_amount_brl numeric(14, 2) not null check (converted_amount_brl > 0),
  monthly_contribution numeric(14, 2) not null default 0 check (monthly_contribution >= 0),
  created_at timestamptz not null default now()
);

create index if not exists investments_user_id_idx on public.investments (user_id);
create index if not exists investments_user_id_created_at_idx on public.investments (user_id, created_at desc);

alter table public.investments enable row level security;

drop policy if exists "investments_select_own" on public.investments;
create policy "investments_select_own" on public.investments
  for select using (auth.uid() = user_id);

drop policy if exists "investments_insert_own" on public.investments;
create policy "investments_insert_own" on public.investments
  for insert with check (auth.uid() = user_id);

drop policy if exists "investments_update_own" on public.investments;
create policy "investments_update_own" on public.investments
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "investments_delete_own" on public.investments;
create policy "investments_delete_own" on public.investments
  for delete using (auth.uid() = user_id);
