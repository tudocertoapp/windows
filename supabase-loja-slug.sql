-- Apelido público da loja: tudocerto-web.vercel.app/ballcher
-- Rode UMA vez no SQL Editor do Supabase. Lojas novas usam o mesmo deploy.
ALTER TABLE public.catalogo_configs
  ADD COLUMN IF NOT EXISTS loja_slug text;

CREATE UNIQUE INDEX IF NOT EXISTS catalogo_configs_loja_slug_uidx
  ON public.catalogo_configs (loja_slug)
  WHERE loja_slug IS NOT NULL AND loja_slug <> '';
