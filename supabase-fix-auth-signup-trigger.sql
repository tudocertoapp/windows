-- Corrige cadastro que falha com 500 no /auth/v1/signup quando o trigger em auth.users quebra
-- (ex.: perfil já existe, search_path inseguro, coluna obrigatória em profiles).
-- Execute no SQL Editor do Supabase (mesmo projecto do URL em src/lib/supabase.js).

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nome)
  VALUES (
    NEW.id,
    COALESCE(
      NULLIF(trim(NEW.raw_user_meta_data->>'nome'), ''),
      NULLIF(trim(NEW.raw_user_meta_data->>'full_name'), ''),
      split_part(NEW.email, '@', 1)
    )
  )
  ON CONFLICT (id) DO UPDATE SET
    nome = COALESCE(
      NULLIF(trim(EXCLUDED.nome), ''),
      public.profiles.nome
    ),
    updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
