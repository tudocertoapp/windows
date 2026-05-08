export const PLANS = {
  pessoal: 'pessoal',
  pessoal_empresa: 'pessoal_empresa',
  empresa: 'empresa',
};

/**
 * Tier com módulo empresa: pessoal+empresa (PE) ou só empresa.
 * Usado para WhatsApp, cadastros empresa, atalhos F1–F8 no Início (web desktop), etc.
 */
export function planTierIncludesEmpresaModule(planTier) {
  return planTier === PLANS.pessoal_empresa || planTier === PLANS.empresa;
}

/** Mapeia planId para plan (pessoal | pessoal_empresa | empresa) */
export const PLAN_ID_TO_PLAN = {
  pessoal: PLANS.pessoal,
  pessoal_free: PLANS.pessoal,
  pessoal_plus: PLANS.pessoal,
  pessoal_premium: PLANS.pessoal,
  pessoal_pro: PLANS.pessoal,
  pe_free: PLANS.pessoal_empresa,
  pe_teste_real: PLANS.pessoal_empresa,
  pe_starter: PLANS.pessoal_empresa,
  pe_pro: PLANS.pessoal_empresa,
  pe_business: PLANS.pessoal_empresa,
  emp_free: PLANS.empresa,
  emp_small: PLANS.empresa,
  emp_medium: PLANS.empresa,
  emp_enterprise: PLANS.empresa,
};

/** Nome amigável do plano para exibição */
export const PLAN_LABELS = {
  pessoal: 'Básico (Grátis)',
  pessoal_free: 'Pessoal Free',
  pessoal_plus: 'Plus',
  pessoal_premium: 'Premium',
  pessoal_pro: 'Pro Pessoal',
  pe_free: 'Pessoal+Empresa Free',
  pe_teste_real: 'Teste Real R$1',
  pe_starter: 'Starter',
  pe_pro: 'Pro',
  pe_business: 'Business',
  emp_free: 'Empresa Free',
  emp_small: 'Small',
  emp_medium: 'Medium',
  emp_enterprise: 'Enterprise',
};

/** Planos que liberam cores personalizadas (além das 2 gratuitas) */
export const PLAN_IDS_CUSTOM_COLORS = [
  'pessoal_plus', 'pessoal_premium', 'pessoal_pro',
  'pe_teste_real', 'pe_starter', 'pe_pro', 'pe_business',
  'emp_small', 'emp_medium', 'emp_enterprise',
];
