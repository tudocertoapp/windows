const FALLBACK_SUPABASE_URL = 'https://azvfiuvggppnulfepwbc.supabase.co';

function readStripeSecretKey() {
  const key = String(process.env.STRIPE_SECRET_KEY || '').trim();
  if (!key) {
    return { key: null, error: 'STRIPE_SECRET_KEY não configurada (.env ou Vercel).' };
  }
  if (key.startsWith('rk_')) {
    return {
      key: null,
      error:
        'STRIPE_SECRET_KEY inválida: use a Secret key (sk_live_ ou sk_test_) no Stripe Dashboard → Developers → API keys. Chaves rk_ (Restricted) não servem para checkout/webhook.',
    };
  }
  if (!key.startsWith('sk_')) {
    return { key: null, error: 'STRIPE_SECRET_KEY deve começar com sk_test_ ou sk_live_.' };
  }
  return { key, error: null };
}

function readStripeWebhookSecret() {
  const secret = String(process.env.STRIPE_WEBHOOK_SECRET || '').trim();
  if (!secret) {
    return {
      secret: null,
      error: 'STRIPE_WEBHOOK_SECRET não configurada. Stripe Dashboard → Webhooks → Signing secret (whsec_...).',
    };
  }
  if (!secret.startsWith('whsec_')) {
    return { secret: null, error: 'STRIPE_WEBHOOK_SECRET deve começar com whsec_.' };
  }
  return { secret, error: null };
}

function readSupabaseAdminConfig() {
  const url = String(process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || FALLBACK_SUPABASE_URL).trim();
  const serviceRoleKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!url) return { url: null, serviceRoleKey: null, error: 'SUPABASE_URL não configurada.' };
  if (!serviceRoleKey) {
    return {
      url: null,
      serviceRoleKey: null,
      error: 'SUPABASE_SERVICE_ROLE_KEY não configurada (.env ou Vercel).',
    };
  }
  return { url, serviceRoleKey, error: null };
}

module.exports = {
  readStripeSecretKey,
  readStripeWebhookSecret,
  readSupabaseAdminConfig,
  FALLBACK_SUPABASE_URL,
};
