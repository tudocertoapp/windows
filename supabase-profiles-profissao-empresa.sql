-- Adiciona colunas profissao e empresa à tabela profiles
-- Execute no SQL Editor do Supabase: https://supabase.com/dashboard/project/azvfiuvggppnulfepwbc/sql

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profissao TEXT DEFAULT '';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS empresa TEXT DEFAULT '';
