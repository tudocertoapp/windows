import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { DEFAULT_STRIPE_API_ORIGIN, STRIPE_BUSINESS_PLAN_KEY } from '../constants/stripe';

function normalizeOrigin(value) {
  const raw = String(value || '').trim().replace(/\/$/, '');
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://${raw}`;
}

function isLocalOrigin(origin) {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(?::\d+)?$/i.test(String(origin || ''));
}

export function getApiOrigin() {
  const extra = Constants.expoConfig?.extra || Constants.manifest?.extra || {};
  const fromExtra = normalizeOrigin(extra.stripeApiUrl || extra.siteUrl);
  const fromEnv = normalizeOrigin(
    (typeof process !== 'undefined' && (process.env?.EXPO_PUBLIC_STRIPE_API_URL || process.env?.EXPO_PUBLIC_SITE_URL)) || '',
  );
  if (fromExtra) return fromExtra;
  if (fromEnv) return fromEnv;

  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.origin) {
    const origin = normalizeOrigin(window.location.origin);
    // Localhost/Electron não tem /api/stripe — usa a API de produção.
    if (origin && !isLocalOrigin(origin)) return origin;
  }

  return DEFAULT_STRIPE_API_ORIGIN;
}

export const SUBSCRIPTION_STATUS = {
  ATIVO: 'ativo',
  PENDENTE: 'pendente',
  CANCELADO: 'cancelado',
};

/**
 * Assinatura do usuário (RLS: só a própria linha).
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} userId
 */
export async function getUserSubscription(supabase, userId) {
  if (!userId || !supabase) return null;
  const { data, error } = await supabase
    .from('subscriptions')
    .select('id,user_id,stripe_customer_id,stripe_subscription_id,price_id,plan,status,created_at,current_period_end')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) {
    console.warn('[subscription]', error.message);
    return null;
  }
  return data;
}

/**
 * Plano Business pago e ativo no Stripe/Supabase.
 */
export function hasActiveBusinessSubscription(sub) {
  if (!sub) return false;
  return sub.plan === STRIPE_BUSINESS_PLAN_KEY && sub.status === SUBSCRIPTION_STATUS.ATIVO;
}

export function isPaidSubscriptionActive(sub) {
  if (!sub) return false;
  return sub.status === SUBSCRIPTION_STATUS.ATIVO && !!sub.plan;
}

/** Pagamento em atraso — recursos pagos bloqueados até regularizar. */
export function isSubscriptionPastDue(sub) {
  if (!sub) return false;
  return sub.status === SUBSCRIPTION_STATUS.PENDENTE && !!sub.plan;
}

export function formatSubscriptionPeriodEnd(iso) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch (_) {
    return null;
  }
}

/**
 * POST /api/stripe/create-checkout-session + redirect Stripe Checkout (web).
 */
export async function handleSubscribe(supabase, planId) {
  const origin = getApiOrigin();
  if (!origin) {
    throw new Error('Defina EXPO_PUBLIC_STRIPE_API_URL (ou EXPO_PUBLIC_SITE_URL com API ativa) para usar o checkout.');
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !sessionData?.session?.user) {
    throw new Error('Faça login para assinar.');
  }

  const user = sessionData.session.user;
  const accessToken = sessionData.session.access_token;
  if (!accessToken) {
    throw new Error('Sessão inválida. Entre novamente.');
  }
  if (!planId) {
    throw new Error('Plano inválido para checkout.');
  }

  const endpoint = `${origin}/api/stripe/create-checkout-session`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      userId: user.id,
      email: user.email || '',
      planId,
    }),
  });

  const rawText = await res.text().catch(() => '');
  let json = {};
  try {
    json = rawText ? JSON.parse(rawText) : {};
  } catch (_) {
    json = {};
  }
  if (!res.ok) {
    throw new Error(json.error || rawText || `Erro ${res.status} ao criar checkout`);
  }

  const checkoutUrl = json.url || json.checkoutUrl || json.checkout_url;
  if (!checkoutUrl) {
    throw new Error(`Resposta sem URL de checkout (${endpoint}).`);
  }

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    // Electron: window.open cai no openExternal; navegador: nova aba (fallback: mesma aba).
    const opened = window.open(checkoutUrl, '_blank', 'noopener,noreferrer');
    if (!opened) window.location.assign(checkoutUrl);
    return;
  }

  const { Linking } = require('react-native');
  await Linking.openURL(checkoutUrl);
}

/**
 * Busca assinatura paga no Stripe e grava em public.subscriptions (quando webhook ainda não rodou).
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {{ sessionId?: string }} [options]
 */
export async function syncSubscriptionFromStripe(supabase, options = {}) {
  const origin = getApiOrigin();
  if (!origin) {
    throw new Error('Defina EXPO_PUBLIC_STRIPE_API_URL para sincronizar a assinatura.');
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !sessionData?.session?.user) {
    throw new Error('Faça login com a mesma conta usada no pagamento.');
  }

  const user = sessionData.session.user;
  const accessToken = sessionData.session.access_token;
  if (!accessToken) throw new Error('Sessão inválida. Entre novamente.');

  const res = await fetch(`${origin}/api/stripe/sync-subscription`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      userId: user.id,
      email: user.email || '',
      sessionId: options.sessionId || '',
    }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.error || `Erro ${res.status}`);
  }
  return json;
}

/** session_id na URL após checkout Stripe (web). */
export function getStripeCheckoutSessionIdFromUrl() {
  if (typeof window === 'undefined') return '';
  const params = new URLSearchParams(window.location.search);
  return params.get('session_id') || '';
}
