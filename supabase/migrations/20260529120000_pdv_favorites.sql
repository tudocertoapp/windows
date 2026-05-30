-- Favoritos do PDV (produtos/serviços e clientes) sincronizados por usuário

CREATE TABLE IF NOT EXISTS pdv_favorites (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  items TEXT[] NOT NULL DEFAULT '{}',
  clients TEXT[] NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE pdv_favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users own pdv_favorites" ON pdv_favorites;
CREATE POLICY "Users own pdv_favorites" ON pdv_favorites FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
