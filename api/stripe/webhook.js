import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  return createClient(url, key, { auth: { persistSession: false } });
}

export default async function handler(request) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const secret = process.env.STRIPE_SECRET_KEY;
  const whSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !whSecret) {
    return new Response('Misconfigured', { status: 500 });
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

  const stripe = new Stripe(secret);
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
        if (!userId) break;
        const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
        const subId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;
        if (!customerId || !subId) break;

        const sub = await stripe.subscriptions.retrieve(subId);
        const priceId = sub.items?.data?.[0]?.price?.id || '';

        const { error } = await supabaseAdmin.from('subscriptions').upsert(
          {
            user_id: userId,
            stripe_customer_id: customerId,
            stripe_subscription_id: subId,
            price_id: priceId,
            plan: 'business',
            status: 'ativo',
          },
          { onConflict: 'user_id' }
        );
        if (error) {
          console.error('[stripe webhook] upsert subscriptions', error);
          return Response.json({ received: true, dbError: error.message }, { status: 500 });
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const subId = sub.id;
        const { error } = await supabaseAdmin
          .from('subscriptions')
          .update({ status: 'cancelado' })
          .eq('stripe_subscription_id', subId);
        if (error) {
          console.error('[stripe webhook] update cancelado', error);
          return Response.json({ received: true, dbError: error.message }, { status: 500 });
        }
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
