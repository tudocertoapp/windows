import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

function readStripeSecretKey() {
  const key = String(process.env.STRIPE_SECRET_KEY || '').trim();
  if (!key) return { key: null, error: 'STRIPE_SECRET_KEY não configurada (.env ou Vercel).' };
  if (key.startsWith('rk_')) {
    return {
      key: null,
      error:
        'STRIPE_SECRET_KEY inválida: use sk_live_ ou sk_test_ (Secret key), não rk_ (Restricted).',
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
    return { secret: null, error: 'STRIPE_WEBHOOK_SECRET não configurada (whsec_...).' };
  }
  if (!secret.startsWith('whsec_')) {
    return { secret: null, error: 'STRIPE_WEBHOOK_SECRET deve começar com whsec_.' };
  }
  return { secret, error: null };
}

function readSupabaseAdminConfig() {
  const url = String(process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || '').trim();
  const serviceRoleKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!url || !serviceRoleKey) {
    return { error: 'SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias no servidor.' };
  }
  return { url, serviceRoleKey, error: null };
}

function getSupabaseAdmin() {
  const cfg = readSupabaseAdminConfig();
  if (cfg.error) throw new Error(cfg.error);
  return createClient(cfg.url, cfg.serviceRoleKey, { auth: { persistSession: false } });
}

function mapStripeSubscriptionStatus(stripeStatus) {
  switch (stripeStatus) {
    case 'active':
    case 'trialing':
      return 'ativo';
    case 'past_due':
    case 'unpaid':
    case 'incomplete':
      return 'pendente';
    case 'canceled':
    case 'incomplete_expired':
      return 'cancelado';
    default:
      return 'pendente';
  }
}

function periodEndIso(stripeSub) {
  const ts = stripeSub?.current_period_end;
  if (!ts) return null;
  return new Date(ts * 1000).toISOString();
}

async function upsertSubscriptionFromStripe(supabaseAdmin, stripeSub, extras = {}) {
  const userId = stripeSub.metadata?.user_id || extras.userId;
  if (!userId) return null;

  const customerId =
    typeof stripeSub.customer === 'string' ? stripeSub.customer : stripeSub.customer?.id;
  const priceId = stripeSub.items?.data?.[0]?.price?.id || extras.priceId || '';
  const planId = stripeSub.metadata?.plan || extras.planId || 'pe_business';

  const row = {
    user_id: userId,
    stripe_customer_id: customerId || extras.customerId || '',
    stripe_subscription_id: stripeSub.id,
    price_id: priceId,
    plan: planId,
    status: mapStripeSubscriptionStatus(stripeSub.status),
    current_period_end: periodEndIso(stripeSub),
  };

  const { error } = await supabaseAdmin.from('subscriptions').upsert(row, { onConflict: 'user_id' });
  if (error) throw error;
  return row;
}

export default async function handler(request) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const { key: stripeSecret, error: stripeKeyError } = readStripeSecretKey();
  const { secret: whSecret, error: whConfigError } = readStripeWebhookSecret();
  if (stripeKeyError || whConfigError) {
    return new Response(stripeKeyError || whConfigError, { status: 500 });
  }

  const sig = request.headers.get('stripe-signature');
  if (!sig) {
    return new Response('Missing stripe-signature', { status: 400 });
  }

  let raw;
  try {
    raw = await request.text();
  } catch (_) {
    return new Response('Body read error', { status: 400 });
  }

  const stripe = new Stripe(stripeSecret);
  let event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, whSecret);
  } catch (err) {
    return new Response(`Webhook signature: ${err.message}`, { status: 400 });
  }

  const supabaseAdmin = getSupabaseAdmin();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        if (session.mode !== 'subscription') break;
        const userId = session.metadata?.user_id;
        const planId = session.metadata?.plan;
        if (!userId) break;
        const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
        const subId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;
        if (!customerId || !subId) break;

        const sub = await stripe.subscriptions.retrieve(subId);
        await upsertSubscriptionFromStripe(supabaseAdmin, sub, {
          userId,
          planId,
          customerId,
          priceId: sub.items?.data?.[0]?.price?.id || '',
        });
        break;
      }
      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const status = mapStripeSubscriptionStatus(sub.status);
        const patch = {
          status,
          current_period_end: periodEndIso(sub),
        };
        if (sub.metadata?.plan) patch.plan = sub.metadata.plan;
        const { error } = await supabaseAdmin
          .from('subscriptions')
          .update(patch)
          .eq('stripe_subscription_id', sub.id);
        if (error) throw error;
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const { error } = await supabaseAdmin
          .from('subscriptions')
          .update({ status: 'cancelado' })
          .eq('stripe_subscription_id', sub.id);
        if (error) throw error;
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const subId = typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id;
        if (!subId) break;
        const { error } = await supabaseAdmin
          .from('subscriptions')
          .update({ status: 'pendente' })
          .eq('stripe_subscription_id', subId);
        if (error) throw error;
        break;
      }
      case 'invoice.paid': {
        const invoice = event.data.object;
        const subId = typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id;
        if (!subId) break;
        const sub = await stripe.subscriptions.retrieve(subId);
        await upsertSubscriptionFromStripe(supabaseAdmin, sub);
        break;
      }
      default:
        break;
    }
  } catch (e) {
    console.error('[stripe webhook]', e);
    return Response.json({ received: true, error: String(e?.message || e) }, { status: 500 });
  }

  return Response.json({ received: true });
}

export const config = {
  runtime: 'edge',
};
