-- Execute no SQL Editor do Supabase: https://supabase.com/dashboard/project/azvfiuvggppnulfepwbc/sql

-- Tabelas com user_id para RLS
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  category TEXT DEFAULT 'Outros',
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  forma_pagamento TEXT DEFAULT 'dinheiro',
  tipo_venda TEXT DEFAULT 'pessoal',
  desconto NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS agenda_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  date TEXT,
  time TEXT,
  time_end TEXT,
  type TEXT DEFAULT 'meeting',
  client_id UUID,
  service_id UUID,
  amount NUMERIC DEFAULT 0,
  tipo TEXT DEFAULT 'pessoal',
  status TEXT DEFAULT 'pendente',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS check_list_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  checked BOOLEAN DEFAULT false,
  date TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  foto TEXT,
  nivel TEXT DEFAULT 'orcamento',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price NUMERIC DEFAULT 0,
  cost_price NUMERIC DEFAULT 0,
  discount NUMERIC DEFAULT 0,
  unit TEXT DEFAULT 'un',
  photo_uri TEXT,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS composite_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price NUMERIC DEFAULT 0,
  discount NUMERIC DEFAULT 0,
  photo_uri TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS boletos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS a_receber (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  description TEXT,
  amount NUMERIC DEFAULT 0,
  due_date TEXT,
  parcel INTEGER DEFAULT 1,
  total INTEGER DEFAULT 1,
  status TEXT DEFAULT 'pendente',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT DEFAULT '',
  foto TEXT,
  profissao TEXT DEFAULT '',
  empresa TEXT DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Colunas extras se a tabela já existir
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profissao TEXT DEFAULT '';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS empresa TEXT DEFAULT '';

-- RLS: cada usuário só vê seus dados
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agenda_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE check_list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE composite_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE boletos ENABLE ROW LEVEL SECURITY;
ALTER TABLE a_receber ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Políticas RLS: DROP IF EXISTS evita erro ao reexecutar
DROP POLICY IF EXISTS "Users own transactions" ON transactions;
CREATE POLICY "Users own transactions" ON transactions FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users own agenda_events" ON agenda_events;
CREATE POLICY "Users own agenda_events" ON agenda_events FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users own check_list_items" ON check_list_items;
CREATE POLICY "Users own check_list_items" ON check_list_items FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users own clients" ON clients;
CREATE POLICY "Users own clients" ON clients FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users own products" ON products;
CREATE POLICY "Users own products" ON products FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users own composite_products" ON composite_products;
CREATE POLICY "Users own composite_products" ON composite_products FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users own services" ON services;
CREATE POLICY "Users own services" ON services FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users own suppliers" ON suppliers;
CREATE POLICY "Users own suppliers" ON suppliers FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users own boletos" ON boletos;
CREATE POLICY "Users own boletos" ON boletos FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users own a_receber" ON a_receber;
CREATE POLICY "Users own a_receber" ON a_receber FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users own profiles" ON profiles;
CREATE POLICY "Users own profiles" ON profiles FOR ALL
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Trigger para criar profile ao se registrar (search_path fixo + ON CONFLICT evita 500 em re-tentativas)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nome)
  VALUES (
    NEW.id,
    COALESCE(
      NULLIF(trim(NEW.raw_user_meta_data->>'nome'), ''),
      NULLIF(trim(NEW.raw_user_meta_data->>'full_name'), ''),
      split_part(NEW.email, '@', 1)
    )
  )
  ON CONFLICT (id) DO UPDATE SET
    nome = COALESCE(NULLIF(trim(EXCLUDED.nome), ''), public.profiles.nome),
    updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
