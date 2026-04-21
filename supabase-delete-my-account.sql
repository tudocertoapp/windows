-- Excluir conta: execute no SQL Editor do Supabase (Dashboard > SQL).
-- Permite ao utilizador autenticado apagar a própria linha em auth.users
-- apenas se o plano na metadata for o gratuito (plan_id = 'pessoal').
-- As tabelas públicas com ON DELETE CASCADE em auth.users são limpas automaticamente.

CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  meta jsonb;
  plan_id text;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '28000';
  END IF;

  SELECT u.raw_user_meta_data INTO meta
  FROM auth.users u
  WHERE u.id = uid;

  plan_id := COALESCE(
    NULLIF(trim(meta->>'plan_id'), ''),
    NULLIF(trim(meta->>'planId'), ''),
    'pessoal'
  );

  -- Só permite exclusão no plano gratuito (Básico).
  IF plan_id IS DISTINCT FROM 'pessoal' THEN
    RAISE EXCEPTION 'plan_not_free' USING ERRCODE = 'P0001';
  END IF;

  DELETE FROM auth.users WHERE id = uid;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_my_account() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;

COMMENT ON FUNCTION public.delete_my_account() IS
  'Apaga o utilizador atual em auth.users se plan_id na metadata for pessoal. Requer CASCADE nas FKs.';
