const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

const BUSINESS_PRICE_ID = 'price_1THoyFECYmuevOzFxkP44dmF';
const FALLBACK_SUPABASE_URL = 'https://azvfiuvggppnulfepwbc.supabase.co';
const FALLBACK_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF6dmZpdXZnZ3BwbnVsZmVwd2JjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2MTc1OTUsImV4cCI6MjA4NTE5MzU5NX0.eZUbc2sveWDRCu_Nm6z0chP7T6-hqDJf7omatgiB2Pk';

function getSiteUrl(req) {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL;
  if (envUrl) return String(envUrl).replace(/\/$/, '');
  if (process.env.VERCEL_URL) return `https://${String(process.env.VERCEL_URL).replace(/\/$/, '')}`;
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers.host;
  if (host) return `${proto}://${host}`;
  return 'http://localhost:8081';
}

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
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

  // Fallback: valida o JWT com cliente público (anon) quando service role não está configurada.
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

  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    return res.status(500).json({ error: 'Stripe not configured' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body || '{}');
    } catch (_) {
      return res.status(400).json({ error: 'Invalid JSON' });
    }
  }
  if (!body || typeof body !== 'object') {
    body = {};
  }

  const { userId, email } = body;
  if (!userId || !email) {
    return res.status(400).json({ error: 'userId and email are required' });
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

  const stripe = new Stripe(secret);

  const base = getSiteUrl(req);
  const success_url = `${base}/sucesso?session_id={CHECKOUT_SESSION_ID}`;
  const cancel_url = `${base}/cancelado`;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: String(email).trim(),
      line_items: [{ price: BUSINESS_PRICE_ID, quantity: 1 }],
      metadata: {
        user_id: userId,
        plan: 'business',
      },
      subscription_data: {
        metadata: {
          user_id: userId,
          plan: 'business',
        },
      },
      success_url,
      cancel_url,
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    const msg = err?.message || 'Checkout failed';
    return res.status(500).json({ error: msg });
  }
};
