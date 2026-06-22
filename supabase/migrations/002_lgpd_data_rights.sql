-- =============================================================================
-- 002_lgpd_data_rights.sql
-- Funções server-side para exportação de dados (Art. 18 LGPD) e
-- exclusão de conta (Art. 18 VI — direito ao esquecimento).
-- Executadas via rpc() do cliente Supabase com service_role.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- EXPORTAÇÃO: retorna todos os dados do titular em JSON
-- Chamada via: supabase.rpc('export_user_data', { p_user_id: user.id })
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.export_user_data(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  -- Apenas o próprio usuário pode exportar seus dados
  IF auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  SELECT jsonb_build_object(
    'exported_at', now(),
    'user_id',     p_user_id,
    'transactions', (
      SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
      FROM public.transactions t WHERE t.user_id = p_user_id
    ),
    'investments', (
      SELECT COALESCE(jsonb_agg(row_to_json(i)), '[]'::jsonb)
      FROM public.investments i WHERE i.user_id = p_user_id
    ),
    'debts', (
      SELECT COALESCE(jsonb_agg(row_to_json(d)), '[]'::jsonb)
      FROM public.debts d WHERE d.user_id = p_user_id
    ),
    'notifications', (
      SELECT COALESCE(jsonb_agg(row_to_json(n)), '[]'::jsonb)
      FROM public.notifications n WHERE n.user_id = p_user_id
    ),
    'settings', (
      SELECT row_to_json(s)
      FROM public.user_settings s WHERE s.user_id = p_user_id
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.export_user_data(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.export_user_data(uuid) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- EXCLUSÃO DE CONTA: apaga todos os dados e deleta o usuário do auth
-- Cascade já cobre as tabelas; esta função garante a deleção do auth.users.
-- Chamada via service_role no servidor (não exposta ao anon).
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.delete_user_account(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Apenas o próprio usuário autenticado pode deletar sua conta
  IF auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  -- Dados das tabelas filho são removidos por ON DELETE CASCADE.
  -- Remove o usuário do auth (dispara o cascade).
  DELETE FROM auth.users WHERE id = p_user_id;
END;
$$;

-- delete_account só é chamada server-side com service_role; não expõe ao anon
REVOKE ALL ON FUNCTION public.delete_user_account(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_user_account(uuid) TO authenticated;
