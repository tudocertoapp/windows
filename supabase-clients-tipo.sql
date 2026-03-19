-- Adiciona coluna tipo à tabela clients: 'pessoal' (família, amigos) ou 'empresa' (clientes)
-- Modo pessoal: parabenizar família e amigos. Modo empresa: apenas clientes.
ALTER TABLE clients ADD COLUMN IF NOT EXISTS tipo TEXT DEFAULT 'empresa';
