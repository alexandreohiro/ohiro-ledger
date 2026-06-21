-- =============================================================================
-- 001_initial_schema.sql
-- Schema completo do Ohiro Ledger com RLS, índices e CHECK constraints.
-- Executar no Supabase SQL editor ou via CLI: supabase db push
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- TRANSACTIONS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.transactions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date          date NOT NULL,
  account       text NOT NULL CHECK (char_length(account) BETWEEN 1 AND 200),
  type          text NOT NULL CHECK (type IN ('Receita','Gasto','Dívida','Investimento','Transferência','Reserva')),
  category      text NOT NULL CHECK (char_length(category) BETWEEN 1 AND 100),
  subcategory   text NOT NULL DEFAULT '' CHECK (char_length(subcategory) <= 100),
  description   text NOT NULL CHECK (char_length(description) BETWEEN 1 AND 500),
  amount        numeric(15,2) NOT NULL CHECK (amount > 0),
  currency      text NOT NULL DEFAULT 'BRL' CHECK (currency IN ('BRL','USD','EUR')),
  exchange_rate numeric(12,6) NOT NULL DEFAULT 1 CHECK (exchange_rate > 0),
  status        text NOT NULL CHECK (status IN ('Previsto','Pago','Pendente','Atrasado','Recorrente')),
  due_date      date,
  recurrence    text NOT NULL DEFAULT 'Nenhuma' CHECK (recurrence IN ('Mensal','Semanal','Anual','Única','Nenhuma')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "transactions_select" ON public.transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "transactions_insert" ON public.transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "transactions_update" ON public.transactions
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "transactions_delete" ON public.transactions
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS transactions_user_id_idx    ON public.transactions (user_id);
CREATE INDEX IF NOT EXISTS transactions_date_idx       ON public.transactions (user_id, date DESC);
CREATE INDEX IF NOT EXISTS transactions_due_date_idx   ON public.transactions (user_id, due_date) WHERE due_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS transactions_type_idx       ON public.transactions (user_id, type);
CREATE INDEX IF NOT EXISTS transactions_status_idx     ON public.transactions (user_id, status);

-- Auto-atualiza updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS transactions_updated_at ON public.transactions;
CREATE TRIGGER transactions_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- INVESTMENTS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.investments (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asset_name            text NOT NULL CHECK (char_length(asset_name) BETWEEN 1 AND 200),
  class                 text NOT NULL CHECK (class IN ('Renda Fixa','Renda Variável','Conta Global','Cripto','Reserva de Emergência','Outros')),
  amount                numeric(15,2) NOT NULL CHECK (amount >= 0),
  currency              text NOT NULL DEFAULT 'BRL' CHECK (currency IN ('BRL','USD','EUR')),
  exchange_rate         numeric(12,6) NOT NULL DEFAULT 1 CHECK (exchange_rate > 0),
  converted_amount_brl  numeric(15,2) NOT NULL DEFAULT 0 CHECK (converted_amount_brl >= 0),
  monthly_contribution  numeric(15,2) NOT NULL DEFAULT 0 CHECK (monthly_contribution >= 0),
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "investments_select" ON public.investments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "investments_insert" ON public.investments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "investments_update" ON public.investments
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "investments_delete" ON public.investments
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS investments_user_id_idx    ON public.investments (user_id);
CREATE INDEX IF NOT EXISTS investments_class_idx      ON public.investments (user_id, class);
CREATE INDEX IF NOT EXISTS investments_created_at_idx ON public.investments (user_id, created_at DESC);

DROP TRIGGER IF EXISTS investments_updated_at ON public.investments;
CREATE TRIGGER investments_updated_at
  BEFORE UPDATE ON public.investments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- DEBTS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.debts (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  creditor            text NOT NULL CHECK (char_length(creditor) BETWEEN 1 AND 200),
  original_amount     numeric(15,2) NOT NULL CHECK (original_amount > 0),
  current_amount      numeric(15,2) NOT NULL CHECK (current_amount >= 0),
  installment_amount  numeric(15,2) NOT NULL DEFAULT 0 CHECK (installment_amount >= 0),
  due_date            date,
  interest_rate       numeric(7,4) NOT NULL DEFAULT 0 CHECK (interest_rate >= 0),
  status              text NOT NULL CHECK (status IN ('Ativo','Quitado','Atrasado','Renegociado')),
  priority            text NOT NULL CHECK (priority IN ('Baixo','Médio','Alto','Crítico')),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "debts_select" ON public.debts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "debts_insert" ON public.debts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "debts_update" ON public.debts
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "debts_delete" ON public.debts
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS debts_user_id_idx   ON public.debts (user_id);
CREATE INDEX IF NOT EXISTS debts_status_idx    ON public.debts (user_id, status);
CREATE INDEX IF NOT EXISTS debts_due_date_idx  ON public.debts (user_id, due_date) WHERE due_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS debts_priority_idx  ON public.debts (user_id, priority);

DROP TRIGGER IF EXISTS debts_updated_at ON public.debts;
CREATE TRIGGER debts_updated_at
  BEFORE UPDATE ON public.debts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- NOTIFICATIONS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  message     text NOT NULL CHECK (char_length(message) BETWEEN 1 AND 1000),
  type        text NOT NULL DEFAULT 'info' CHECK (type IN ('info','warning','error','success')),
  read        boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_select" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "notifications_insert" ON public.notifications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "notifications_update" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "notifications_delete" ON public.notifications
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS notifications_user_id_idx   ON public.notifications (user_id);
CREATE INDEX IF NOT EXISTS notifications_unread_idx    ON public.notifications (user_id, read) WHERE read = false;
CREATE INDEX IF NOT EXISTS notifications_created_idx   ON public.notifications (user_id, created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- USER_SETTINGS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_settings (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_days_before  integer NOT NULL DEFAULT 3 CHECK (notification_days_before BETWEEN 0 AND 30),
  -- LGPD: consentimento explícito para processamento por IA de terceiros
  ai_consent                boolean NOT NULL DEFAULT false,
  ai_consent_at             timestamptz,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_settings_select" ON public.user_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "user_settings_insert" ON public.user_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_settings_update" ON public.user_settings
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS user_settings_user_id_idx ON public.user_settings (user_id);

DROP TRIGGER IF EXISTS user_settings_updated_at ON public.user_settings;
CREATE TRIGGER user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
