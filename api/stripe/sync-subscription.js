const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');
const { readStripeSecretKey, readSupabaseAdminConfig, FALLBACK_SUPABASE_URL } = require('./env');
const {
  upsertSubscriptionFromStripe,
  findBestStripeSubscription,
  ACTIVE_STRIPE_STATUSES,
} = require('./subscriptionSync');

const FALLBACK_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF6dmZpdXZnZ3BwbnVsZmVwd2JjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2MTc1OTUsImV4cCI6MjA4NTE5MzU5NX0.eZUbc2sveWDRCu_Nm6z0chP7T6-hqDJf7omatgiB2Pk';

function getSupabaseAdmin() {
  const cfg = readSupabaseAdminConfig();
  if (cfg.error) return null;
  return createClient(cfg.url, cfg.serviceRoleKey, { auth: { persistSession: false } });
}

function getSupabasePublicVerifier() {
  const url = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || FALLBACK_SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || FALLBACK_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

async function verifyUserSession(jwt, userId) {
  const supabaseAdmin = getSupabaseAdmin();
  if (supabaseAdmin) {
    const { data: userData, error: authErr } = await supabaseAdmin.auth.getUser(jwt);
    return !authErr && !!userData?.user && userData.user.id === userId;
  }
  const supabasePublic = getSupabasePublicVerifier();
  if (!supabasePublic) return false;
  const { data: userData, error: authErr } = await supabasePublic.auth.getUser(jwt);
  return !authErr && !!userData?.user && userData.user.id === userId;
}

module.exports = async function handler(req, res) {
  const requestOrigin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', requestOrigin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { key: stripeSecret, error: stripeConfigError } = readStripeSecretKey();
  if (stripeConfigError) {
    return res.status(500).json({ error: stripeConfigError });
  }

  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY não configurada no servidor.' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body || '{}');
    } catch (_) {
      return res.status(400).json({ error: 'Invalid JSON' });
    }
  }
  if (!body || typeof body !== 'object') body = {};

  const { userId, email, sessionId } = body;
  if (!userId) {
    return res.status(400).json({ error: 'userId é obrigatório' });
  }

  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader || !String(authHeader).startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing Authorization Bearer token' });
  }
  const jwt = String(authHeader).slice(7).trim();

  try {
    const ok = await verifyUserSession(jwt, userId);
    if (!ok) return res.status(403).json({ error: 'Invalid session' });
  } catch (e) {
    return res.status(500).json({ error: 'Auth verification failed' });
  }

  const stripe = new Stripe(stripeSecret);

  try {
    const found = await findBestStripeSubscription(stripe, {
      userId,
      email: email || '',
      sessionId: sessionId || '',
    });

    if (!found?.subscription) {
      return res.status(404).json({
        error:
          'Nenhuma assinatura encontrada no Stripe para este e-mail. Use a mesma conta do pagamento ou configure o webhook (STRIPE_WEBHOOK_SECRET).',
      });
    }

    const row = await upsertSubscriptionFromStripe(supabaseAdmin, found.subscription, found.extras);
    const active = ACTIVE_STRIPE_STATUSES.has(found.subscription.status);

    return res.status(200).json({
      ok: true,
      activated: active && row?.status === 'ativo',
      subscription: row,
      stripeStatus: found.subscription.status,
    });
  } catch (err) {
    const msg = err?.message || 'Falha ao sincronizar assinatura';
    return res.status(500).json({ error: msg });
  }
};
