-- Execute no SQL Editor do Supabase
-- Tabela de orçamentos (cotações comerciais)

CREATE TABLE IF NOT EXISTS orcamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  numero TEXT NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  items JSONB DEFAULT '[]',
  subtotal NUMERIC DEFAULT 0,
  desconto NUMERIC DEFAULT 0,
  total NUMERIC DEFAULT 0,
  observacoes TEXT,
  validade TEXT,
  termos TEXT,
  agenda_data TEXT,
  agenda_hora TEXT,
  agenda_obs TEXT,
  status TEXT DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'enviado', 'aceito', 'recusado', 'faturado')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orcamentos_user_id ON orcamentos(user_id);
CREATE INDEX IF NOT EXISTS idx_orcamentos_client_id ON orcamentos(client_id);
CREATE INDEX IF NOT EXISTS idx_orcamentos_status ON orcamentos(status);
CREATE INDEX IF NOT EXISTS idx_orcamentos_created_at ON orcamentos(created_at DESC);

ALTER TABLE orcamentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own orcamentos" ON orcamentos;
CREATE POLICY "Users can manage own orcamentos" ON orcamentos
  FOR ALL USING (auth.uid() = user_id);
