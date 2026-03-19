-- Adiciona coluna CPF à tabela clients
ALTER TABLE clients ADD COLUMN IF NOT EXISTS cpf TEXT;
