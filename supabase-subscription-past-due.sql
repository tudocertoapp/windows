-- Execute no SQL Editor do Supabase

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS current_period_end timestamptz;

-- Valores de status usados pelo app:
--   ativo     = pagamento em dia, recursos pagos liberados
--   pendente  = pagamento em atraso, recursos pagos bloqueados
--   cancelado = assinatura encerrada
