-- Campos extras para controle de renovação e inadimplência (Stripe)

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS current_period_end timestamptz;

-- status: ativo | pendente | cancelado
