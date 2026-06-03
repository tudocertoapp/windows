import { Platform } from 'react-native';
import { STRIPE_BUSINESS_PLAN_KEY } from '../constants/stripe';

export function getApiOrigin() {
  if (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_STRIPE_API_URL) {
    return String(process.env.EXPO_PUBLIC_STRIPE_API_URL).replace(/\/$/, '');
  }
  if (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_SITE_URL) {
    return String(process.env.EXPO_PUBLIC_SITE_URL).replace(/\/$/, '');
  }
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.origin) {
    const origin = window.location.origin.replace(/\/$/, '');
    // Em localhost do Expo, geralmente não há rota /api/stripe ativa.
    if (/^https?:\/\/localhost(?::\d+)?$/i.test(origin) || /^https?:\/\/127\.0\.0\.1(?::\d+)?$/i.test(origin)) {
      return '';
    }
    return origin;
  }
  return '';
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

  const contentType = String(res.headers?.get?.('content-type') || '').toLowerCase();
  const isJson = contentType.includes('application/json');
  const json = isJson ? await res.json().catch(() => ({})) : {};
  if (!res.ok) {
    throw new Error(json.error || `Erro ${res.status}`);
  }

  const checkoutUrl = json.url || json.checkoutUrl || json.checkout_url;
  if (!checkoutUrl) {
    if (!isJson) {
      throw new Error(`Endpoint Stripe inválido em ${endpoint} (resposta não JSON).`);
    }
    throw new Error('Resposta sem URL de checkout.');
  }

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.location.assign(checkoutUrl);
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
