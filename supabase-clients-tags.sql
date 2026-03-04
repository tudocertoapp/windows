-- Adiciona coluna tags (etiquetas) à tabela clients
-- Execute no SQL Editor do Supabase

ALTER TABLE clients ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]';
