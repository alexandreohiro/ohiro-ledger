-- Créditos de IA por provider pago (Anthropic/OpenAI). Providers free (Gemini/Groq)
-- continuam usando apenas o limite diário de requisições já existente (client-side).
create table if not exists public.ai_credits (
  user_id uuid not null references auth.users(id) on delete cascade,
  provider_id text not null check (provider_id in ('openai', 'anthropic')),
  balance_usd numeric(10, 4) not null default 0,
  spent_usd numeric(10, 4) not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, provider_id)
);

alter table public.ai_credits enable row level security;

drop policy if exists "ai_credits_select_own" on public.ai_credits;
create policy "ai_credits_select_own" on public.ai_credits
  for select using (auth.uid() = user_id);

-- Sem policy de insert/update/delete para o client: saldo só é alterado via RPC
-- security definer (debit_ai_credit) ou diretamente pelo dashboard do Supabase.

-- Histórico de cada chamada paga, para auditoria e cálculo de custo.
create table if not exists public.ai_usage_log (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  provider_id text not null,
  model text not null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  cost_usd numeric(10, 6) not null default 0,
  created_at timestamptz not null default now()
);

alter table public.ai_usage_log enable row level security;

drop policy if exists "ai_usage_log_select_own" on public.ai_usage_log;
create policy "ai_usage_log_select_own" on public.ai_usage_log
  for select using (auth.uid() = user_id);

-- Debita o custo real (tokens × preço) do saldo do usuário de forma atômica e
-- registra a chamada no histórico. Falha (insufficient_balance) se o saldo for
-- menor que o custo, para a rota bloquear a chamada antes de gastar mais que o disponível.
create or replace function public.debit_ai_credit(
  p_user_id uuid,
  p_provider_id text,
  p_model text,
  p_input_tokens integer,
  p_output_tokens integer,
  p_cost_usd numeric
)
returns table (allowed boolean, balance_usd numeric)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance numeric;
begin
  insert into public.ai_credits (user_id, provider_id, balance_usd, spent_usd)
  values (p_user_id, p_provider_id, 0, 0)
  on conflict (user_id, provider_id) do nothing;

  select balance_usd into v_balance
  from public.ai_credits
  where user_id = p_user_id and provider_id = p_provider_id
  for update;

  if v_balance < p_cost_usd then
    return query select false, v_balance;
    return;
  end if;

  update public.ai_credits
  set balance_usd = balance_usd - p_cost_usd,
      spent_usd = spent_usd + p_cost_usd,
      updated_at = now()
  where user_id = p_user_id and provider_id = p_provider_id
  returning public.ai_credits.balance_usd into v_balance;

  insert into public.ai_usage_log (user_id, provider_id, model, input_tokens, output_tokens, cost_usd)
  values (p_user_id, p_provider_id, p_model, p_input_tokens, p_output_tokens, p_cost_usd);

  return query select true, v_balance;
end;
$$;

-- Verifica se há saldo suficiente antes de iniciar a chamada (custo estimado do prompt).
create or replace function public.check_ai_credit_balance(
  p_user_id uuid,
  p_provider_id text
)
returns numeric
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (select balance_usd from public.ai_credits where user_id = p_user_id and provider_id = p_provider_id),
    0
  );
$$;

-- Saldo inicial: $5 para Anthropic (Claude) e $5 para OpenAI, para o usuário de testes.
insert into public.ai_credits (user_id, provider_id, balance_usd)
select id, 'anthropic', 5.00
from auth.users
where email = 'vieiraalexandre515@gmail.com'
on conflict (user_id, provider_id) do update set balance_usd = 5.00;

insert into public.ai_credits (user_id, provider_id, balance_usd)
select id, 'openai', 5.00
from auth.users
where email = 'vieiraalexandre515@gmail.com'
on conflict (user_id, provider_id) do update set balance_usd = 5.00;
