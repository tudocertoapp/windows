-- Configuração pública da loja (link compartilhável com clientes)
-- Execute no SQL Editor do Supabase.
--
-- Imagens (logo, banner): bucket "avatars", pasta {user_id}/clients/*
-- (mesma política de upload de fotos de clientes/perfil).

CREATE TABLE IF NOT EXISTS public.catalogo_configs (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.catalogo_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users own catalogo config" ON public.catalogo_configs;
CREATE POLICY "Users own catalogo config" ON public.catalogo_configs
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
