-- Execute no SQL Editor do Supabase para corrigir as colunas faltantes:
-- https://supabase.com/dashboard/project/azvfiuvggppnulfepwbc/sql
-- Erros: "Could not find the 'amount' column...", "Could not find the 'email' column...", etc.
-- Se alguma tabela não existir, execute primeiro o supabase-schema.sql

-- Cria tabela profiles se não existir (para perfis de usuários antigos)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT DEFAULT '',
  foto TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users own profiles" ON profiles;
CREATE POLICY "Users own profiles" ON profiles FOR ALL
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- transactions
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS amount NUMERIC DEFAULT 0;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Outros';
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS date DATE DEFAULT CURRENT_DATE;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS forma_pagamento TEXT DEFAULT 'dinheiro';
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS tipo_venda TEXT DEFAULT 'pessoal';
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS desconto NUMERIC DEFAULT 0;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- agenda_events
ALTER TABLE agenda_events ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE agenda_events ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE agenda_events ADD COLUMN IF NOT EXISTS date TEXT;
ALTER TABLE agenda_events ADD COLUMN IF NOT EXISTS time TEXT;
ALTER TABLE agenda_events ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'meeting';
ALTER TABLE agenda_events ADD COLUMN IF NOT EXISTS client_id UUID;
ALTER TABLE agenda_events ADD COLUMN IF NOT EXISTS service_id UUID;
ALTER TABLE agenda_events ADD COLUMN IF NOT EXISTS amount NUMERIC DEFAULT 0;
ALTER TABLE agenda_events ADD COLUMN IF NOT EXISTS tipo TEXT DEFAULT 'pessoal';
ALTER TABLE agenda_events ADD COLUMN IF NOT EXISTS time_end TEXT;
ALTER TABLE agenda_events ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pendente';
ALTER TABLE agenda_events ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE agenda_events ADD COLUMN IF NOT EXISTS pre_order_items JSONB DEFAULT '[]';

-- check_list_items
ALTER TABLE check_list_items ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE check_list_items ADD COLUMN IF NOT EXISTS checked BOOLEAN DEFAULT false;
ALTER TABLE check_list_items ADD COLUMN IF NOT EXISTS date TEXT;
ALTER TABLE check_list_items ADD COLUMN IF NOT EXISTS important BOOLEAN DEFAULT false;
ALTER TABLE check_list_items ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE check_list_items ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'media';
ALTER TABLE check_list_items ADD COLUMN IF NOT EXISTS time_start TEXT;
ALTER TABLE check_list_items ADD COLUMN IF NOT EXISTS time_end TEXT;
ALTER TABLE check_list_items ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE check_list_items ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- clients
ALTER TABLE clients ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS foto TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS nivel TEXT DEFAULT 'orcamento';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- products
ALTER TABLE products ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS price NUMERIC DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_price NUMERIC DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS discount NUMERIC DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'un';
ALTER TABLE products ADD COLUMN IF NOT EXISTS photo_uri TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}';
ALTER TABLE products ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- composite_products
ALTER TABLE composite_products ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE composite_products ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}';
ALTER TABLE composite_products ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- services
ALTER TABLE services ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS price NUMERIC DEFAULT 0;
ALTER TABLE services ADD COLUMN IF NOT EXISTS discount NUMERIC DEFAULT 0;
ALTER TABLE services ADD COLUMN IF NOT EXISTS photo_uri TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- suppliers
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- boletos
ALTER TABLE boletos ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}';
ALTER TABLE boletos ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- a_receber
ALTER TABLE a_receber ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE a_receber ADD COLUMN IF NOT EXISTS amount NUMERIC DEFAULT 0;
ALTER TABLE a_receber ADD COLUMN IF NOT EXISTS due_date TEXT;
ALTER TABLE a_receber ADD COLUMN IF NOT EXISTS parcel INTEGER DEFAULT 1;
ALTER TABLE a_receber ADD COLUMN IF NOT EXISTS total INTEGER DEFAULT 1;
ALTER TABLE a_receber ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pendente';
ALTER TABLE a_receber ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS nome TEXT DEFAULT '';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS foto TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
