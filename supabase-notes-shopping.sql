-- Execute no SQL Editor do Supabase para criar tabelas de anotações e lista de compras
-- https://supabase.com/dashboard/project/azvfiuvggppnulfepwbc/sql

-- Tabela de anotações (notas)
CREATE TABLE IF NOT EXISTS notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Sem título',
  content TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de itens da lista de compras
CREATE TABLE IF NOT EXISTS shopping_list_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Item',
  checked BOOLEAN DEFAULT false,
  date TEXT,
  tipo TEXT DEFAULT 'pessoal',
  photo_uris JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_list_items ENABLE ROW LEVEL SECURITY;

-- Políticas
DROP POLICY IF EXISTS "Users own notes" ON notes;
CREATE POLICY "Users own notes" ON notes FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users own shopping_list_items" ON shopping_list_items;
CREATE POLICY "Users own shopping_list_items" ON shopping_list_items FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
