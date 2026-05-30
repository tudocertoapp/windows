-- Perfil do usuário + dados da empresa (comprovantes, PDV, OS, relatórios)
-- Idempotente: cria a tabela profiles se não existir e adiciona colunas faltantes.
-- Execute no SQL Editor do Supabase (todo o arquivo de uma vez).

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT DEFAULT '',
  foto TEXT,
  profissao TEXT DEFAULT '',
  empresa TEXT DEFAULT '',
  cnpj TEXT,
  endereco TEXT,
  telefone TEXT,
  email TEXT,
  endereco_rua TEXT,
  endereco_numero TEXT,
  endereco_complemento TEXT,
  endereco_bairro TEXT,
  endereco_cidade TEXT,
  endereco_estado TEXT,
  endereco_cep TEXT,
  instagram TEXT,
  primary_color TEXT,
  theme_mode TEXT DEFAULT 'light',
  custom_bg TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS profissao TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS empresa TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cnpj TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS endereco TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS telefone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS endereco_rua TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS endereco_numero TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS endereco_complemento TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS endereco_bairro TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS endereco_cidade TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS endereco_estado TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS endereco_cep TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS instagram TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS primary_color TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS theme_mode TEXT DEFAULT 'light';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS custom_bg TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users own profiles" ON public.profiles;
CREATE POLICY "Users own profiles" ON public.profiles
  FOR ALL
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

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
    nome = COALESCE(NULLIF(trim(EXCLUDED.nome), ''), public.profiles.nome),
    updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

INSERT INTO public.profiles (id, nome, email)
SELECT
  u.id,
  COALESCE(
    NULLIF(trim(u.raw_user_meta_data->>'nome'), ''),
    NULLIF(trim(u.raw_user_meta_data->>'full_name'), ''),
    split_part(u.email, '@', 1),
    ''
  ),
  u.email
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;
