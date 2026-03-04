-- Adiciona colunas de tema à tabela profiles (nome, profissão, tema)
-- Execute no SQL Editor do Supabase: https://supabase.com/dashboard/project/azvfiuvggppnulfepwbc/sql

-- Colunas para nome, profissão, empresa (caso não existam)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profissao TEXT DEFAULT '';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS empresa TEXT DEFAULT '';

-- Colunas para tema/cor
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS primary_color TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS theme_mode TEXT DEFAULT 'light';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS custom_bg TEXT;
