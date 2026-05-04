import { Platform } from 'react-native';
import { STRIPE_BUSINESS_PLAN_KEY } from '../constants/stripe';

export function getApiOrigin() {
  if (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_SITE_URL) {
    return String(process.env.EXPO_PUBLIC_SITE_URL).replace(/\/$/, '');
  }
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin.replace(/\/$/, '');
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

/**
 * POST /api/stripe/create-checkout-session + redirect Stripe Checkout (web).
 */
export async function handleSubscribe(supabase) {
  const origin = getApiOrigin();
  if (!origin) {
    throw new Error('Defina EXPO_PUBLIC_SITE_URL ou abra o app na web.');
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

  const res = await fetch(`${origin}/api/stripe/create-checkout-session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      userId: user.id,
      email: user.email || '',
    }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.error || `Erro ${res.status}`);
  }
  if (!json.url) {
    throw new Error('Resposta sem URL de checkout.');
  }

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.location.assign(json.url);
    return;
  }

  const { Linking } = require('react-native');
  await Linking.openURL(json.url);
}
