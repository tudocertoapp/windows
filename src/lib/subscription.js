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

/**
 * Assinatura do usuário (RLS: só a própria linha).
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} userId
 */
export async function getUserSubscription(supabase, userId) {
  if (!userId || !supabase) return null;
  const { data, error } = await supabase
    .from('subscriptions')
    .select('id,user_id,stripe_customer_id,stripe_subscription_id,price_id,plan,status,created_at')
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
  return sub.plan === STRIPE_BUSINESS_PLAN_KEY && sub.status === 'ativo';
}

export function isPaidSubscriptionActive(sub) {
  if (!sub) return false;
  return sub.status === 'ativo' && !!sub.plan;
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
