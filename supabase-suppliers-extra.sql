-- Campos extras para fornecedores: links (site, Instagram, loja), CNPJ, estado
-- Execute no SQL Editor do Supabase

ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS link_site TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS link_instagram TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS link_loja TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS cnpj TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS estado TEXT;
