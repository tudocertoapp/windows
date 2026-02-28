-- Corrige o erro "transactions_type_check" ao cadastrar receita/despesa
-- Execute no SQL Editor do Supabase
-- O app envia type = 'income' (receita) e 'expense' (despesa)

-- 1. Remove a constraint antiga
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_type_check;

-- 2. Corrige linhas existentes com tipo inválido (normaliza para income/expense)
UPDATE transactions
SET type = CASE
  WHEN LOWER(TRIM(COALESCE(type, ''))) IN ('receita', 'income', 'entrada') THEN 'income'
  WHEN LOWER(TRIM(COALESCE(type, ''))) IN ('despesa', 'expense', 'saida') THEN 'expense'
  ELSE 'income'
END
WHERE type IS NULL OR TRIM(COALESCE(type, '')) = '' 
   OR type NOT IN ('income', 'expense', 'receita', 'despesa');

-- 3. Adiciona a nova constraint
ALTER TABLE transactions ADD CONSTRAINT transactions_type_check 
  CHECK (type IN ('income', 'expense', 'receita', 'despesa'));
