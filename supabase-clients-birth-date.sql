-- Adiciona coluna birth_date (data de nascimento) à tabela clients para lembretes de aniversário
ALTER TABLE clients ADD COLUMN IF NOT EXISTS birth_date TEXT;
