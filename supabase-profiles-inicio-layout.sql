-- Layout do Início por usuário (JSON: ordem, tamanhos, favorito).
-- Execute no SQL Editor do Supabase.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS inicio_layout JSONB;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS inicio_layout_favorite JSONB;
