-- =====================================================
-- ESTRUTURA EMPRESA - Tudo Certo
-- Execute no Supabase SQL Editor
-- =====================================================

-- Notas Fiscais
CREATE TABLE IF NOT EXISTS empresa_notas_fiscais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  numero TEXT NOT NULL,
  cliente_id UUID,
  cliente_nome TEXT,
  produto TEXT,
  valor DECIMAL(12,2) NOT NULL DEFAULT 0,
  imposto DECIMAL(12,2) DEFAULT 0,
  data DATE NOT NULL,
  status TEXT DEFAULT 'pendente',
  observacao TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Remunerações
CREATE TABLE IF NOT EXISTS empresa_remuneracoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  colaborador_id UUID,
  colaborador_nome TEXT NOT NULL,
  salario DECIMAL(12,2) NOT NULL DEFAULT 0,
  bonus DECIMAL(12,2) DEFAULT 0,
  descontos DECIMAL(12,2) DEFAULT 0,
  valor_final DECIMAL(12,2) NOT NULL,
  status TEXT DEFAULT 'pendente',
  data_pagamento DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Fluxo de Caixa
CREATE TABLE IF NOT EXISTS empresa_fluxo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'saida')),
  descricao TEXT NOT NULL,
  categoria TEXT,
  valor DECIMAL(12,2) NOT NULL,
  data DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Comandas
CREATE TABLE IF NOT EXISTS empresa_comandas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  numero INTEGER NOT NULL,
  cliente_nome TEXT,
  itens JSONB DEFAULT '[]',
  valor_total DECIMAL(12,2) DEFAULT 0,
  status TEXT DEFAULT 'aberta',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Vendas
CREATE TABLE IF NOT EXISTS empresa_vendas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  cliente_id UUID,
  cliente_nome TEXT,
  produto TEXT,
  quantidade INTEGER DEFAULT 1,
  valor_unitario DECIMAL(12,2) NOT NULL,
  valor_total DECIMAL(12,2) NOT NULL,
  data DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Atendimentos
CREATE TABLE IF NOT EXISTS empresa_atendimentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  cliente_id UUID,
  cliente_nome TEXT NOT NULL,
  tipo TEXT NOT NULL,
  colaborador_id UUID,
  colaborador_nome TEXT,
  data DATE NOT NULL,
  status TEXT DEFAULT 'agendado',
  observacao TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Colaboradores
CREATE TABLE IF NOT EXISTS empresa_colaboradores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  cargo TEXT,
  telefone TEXT,
  email TEXT,
  salario DECIMAL(12,2) DEFAULT 0,
  data_admissao DATE,
  status TEXT DEFAULT 'ativo',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE empresa_notas_fiscais ENABLE ROW LEVEL SECURITY;
ALTER TABLE empresa_remuneracoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE empresa_fluxo ENABLE ROW LEVEL SECURITY;
ALTER TABLE empresa_comandas ENABLE ROW LEVEL SECURITY;
ALTER TABLE empresa_vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE empresa_atendimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE empresa_colaboradores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "empresa_notas_fiscais" ON empresa_notas_fiscais FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "empresa_remuneracoes" ON empresa_remuneracoes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "empresa_fluxo" ON empresa_fluxo FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "empresa_comandas" ON empresa_comandas FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "empresa_vendas" ON empresa_vendas FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "empresa_atendimentos" ON empresa_atendimentos FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "empresa_colaboradores" ON empresa_colaboradores FOR ALL USING (auth.uid() = user_id);
