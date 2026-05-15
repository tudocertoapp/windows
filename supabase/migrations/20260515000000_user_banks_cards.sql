-- Bancos e cartões do usuário (Dinheiro / Bancos e Cartões)
-- Execute no SQL Editor do Supabase se ainda não aplicou esta migration.

CREATE TABLE IF NOT EXISTS user_banks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  banco_id TEXT NOT NULL DEFAULT 'outro',
  nome_custom TEXT,
  tipo TEXT NOT NULL DEFAULT 'pessoal',
  tipo_conta TEXT NOT NULL DEFAULT 'ambos',
  saldo NUMERIC NOT NULL DEFAULT 0,
  cor TEXT,
  bandeira TEXT DEFAULT 'visa',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bank_id UUID REFERENCES user_banks(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  dia_fechamento INTEGER NOT NULL DEFAULT 10,
  dia_vencimento INTEGER NOT NULL DEFAULT 15,
  saldo NUMERIC NOT NULL DEFAULT 0,
  bandeira TEXT DEFAULT 'visa',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_banks_user_id ON user_banks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_cards_user_id ON user_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_user_cards_bank_id ON user_cards(bank_id);

ALTER TABLE user_banks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_cards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users own user_banks" ON user_banks;
CREATE POLICY "Users own user_banks" ON user_banks FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users own user_cards" ON user_cards;
CREATE POLICY "Users own user_cards" ON user_cards FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
