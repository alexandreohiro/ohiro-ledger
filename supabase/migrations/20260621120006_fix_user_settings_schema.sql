-- Reconcilia o schema de user_settings: a tabela já existia em produção com apenas
-- (id, notification_days_before) — criada por 20260621120004_user_settings.sql.
-- A migration 001_initial_schema.sql tentou recriar a tabela com (id, user_id,
-- ai_consent, ai_consent_at), mas como usa CREATE TABLE IF NOT EXISTS, não teve
-- efeito sobre a tabela já existente, deixando o código (que assume user_id/ai_consent)
-- fora de sincronia com o banco real e causando erro 500 em GET /app.
alter table public.user_settings
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists ai_consent boolean not null default false,
  add column if not exists ai_consent_at timestamptz;

-- Backfill: nas linhas antigas, id já era o id do usuário.
update public.user_settings set user_id = id where user_id is null;

alter table public.user_settings alter column user_id set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'user_settings_user_id_key'
  ) then
    alter table public.user_settings add constraint user_settings_user_id_key unique (user_id);
  end if;
end $$;

create index if not exists user_settings_user_id_idx on public.user_settings (user_id);

drop policy if exists "user_settings_select" on public.user_settings;
create policy "user_settings_select" on public.user_settings
  for select using (auth.uid() = user_id);

drop policy if exists "user_settings_insert" on public.user_settings;
create policy "user_settings_insert" on public.user_settings
  for insert with check (auth.uid() = user_id);

drop policy if exists "user_settings_update" on public.user_settings;
create policy "user_settings_update" on public.user_settings
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
