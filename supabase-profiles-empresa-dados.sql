-- Dados da empresa no perfil (para aparecer nos relatórios)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cnpj TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS endereco TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS telefone TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;
