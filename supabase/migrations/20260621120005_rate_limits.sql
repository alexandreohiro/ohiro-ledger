-- Rate limiting compartilhado entre instâncias (substitui Map em memória de lib/security.ts)
create table if not exists public.rate_limits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  count integer not null default 0,
  reset_at timestamptz not null
);

alter table public.rate_limits enable row level security;

-- Acesso apenas via função RPC abaixo (security definer); nenhuma policy de client direto.

-- Incrementa e verifica o limite atomicamente (evita race condition entre requests concorrentes)
create or replace function public.check_rate_limit(
  p_user_id uuid,
  p_window_ms integer,
  p_max integer
)
returns table (allowed boolean, remaining integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_count integer;
  v_reset_at timestamptz;
begin
  insert into public.rate_limits (user_id, count, reset_at)
  values (p_user_id, 1, v_now + (p_window_ms || ' milliseconds')::interval)
  on conflict (user_id) do update
    set count = case
          when public.rate_limits.reset_at <= v_now then 1
          else public.rate_limits.count + 1
        end,
        reset_at = case
          when public.rate_limits.reset_at <= v_now then v_now + (p_window_ms || ' milliseconds')::interval
          else public.rate_limits.reset_at
        end
  returning public.rate_limits.count, public.rate_limits.reset_at into v_count, v_reset_at;

  if v_count > p_max then
    return query select false, 0;
  else
    return query select true, p_max - v_count;
  end if;
end;
$$;
