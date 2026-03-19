-- Execute no SQL Editor do Supabase para corrigir colunas faltantes na tabela clients
-- Necessário para cadastro de aniversariantes e clientes (CRM)
-- https://supabase.com/dashboard → SQL Editor → New query → Cole e execute

-- Colunas para a tabela clients
ALTER TABLE clients ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS cpf TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS link_instagram TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS birth_date TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS tipo TEXT DEFAULT 'empresa';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]';
