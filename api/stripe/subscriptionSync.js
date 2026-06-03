const PLAN_TO_PRICE_ID = {
  pessoal_plus: 'price_1TUotKECYmuevOzFnccC3opK',
  pessoal_premium: 'price_1TUotLECYmuevOzFkIvOgwSu',
  pessoal_pro: 'price_1TUotMECYmuevOzFuRlRXeob',
  pe_teste_real: 'price_1TUp1GECYmuevOzFzrVPhleL',
  pe_starter: 'price_1TUotRECYmuevOzFWvrAiCik',
  pe_pro: 'price_1TUotSECYmuevOzFupnpOqOJ',
  pe_business: 'price_1TUotUECYmuevOzFX94TbtLm',
  emp_small: 'price_1TUotNECYmuevOzFa44C1flC',
  emp_medium: 'price_1TUotPECYmuevOzFXYhEBiGu',
  emp_enterprise: 'price_1TUotQECYmuevOzFuC5OHj8m',
};

const PRICE_TO_PLAN = Object.fromEntries(
  Object.entries(PLAN_TO_PRICE_ID).map(([plan, price]) => [price, plan]),
);

const ACTIVE_STRIPE_STATUSES = new Set(['active', 'trialing']);

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

function resolvePlanId(stripeSub, extras = {}) {
  if (stripeSub?.metadata?.plan) return stripeSub.metadata.plan;
  if (extras.planId) return extras.planId;
  const priceId = stripeSub?.items?.data?.[0]?.price?.id || extras.priceId || '';
  return PRICE_TO_PLAN[priceId] || 'pe_business';
}

async function upsertSubscriptionFromStripe(supabaseAdmin, stripeSub, extras = {}) {
  const userId = stripeSub.metadata?.user_id || extras.userId;
  if (!userId) return null;

  const customerId =
    typeof stripeSub.customer === 'string' ? stripeSub.customer : stripeSub.customer?.id;
  const priceId = stripeSub.items?.data?.[0]?.price?.id || extras.priceId || '';
  const planId = resolvePlanId(stripeSub, extras);

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

function scoreStripeSubscription(sub) {
  const status = sub?.status || '';
  let score = ACTIVE_STRIPE_STATUSES.has(status) ? 100 : status === 'past_due' ? 40 : 10;
  if (sub.metadata?.user_id) score += 5;
  if (sub.metadata?.plan) score += 3;
  return score;
}

async function findBestStripeSubscription(stripe, { userId, email, sessionId }) {
  if (sessionId) {
    const session = await stripe.checkout.sessions.retrieve(String(sessionId), {
      expand: ['subscription'],
    });
    if (session.mode === 'subscription' && session.subscription) {
      const sub =
        typeof session.subscription === 'string'
          ? await stripe.subscriptions.retrieve(session.subscription)
          : session.subscription;
      const metaUser = session.metadata?.user_id || sub.metadata?.user_id;
      if (metaUser && metaUser !== userId) {
        throw new Error('Esta sessão de pagamento pertence a outra conta. Entre com o e-mail usado no checkout.');
      }
      return {
        subscription: sub,
        extras: {
          userId,
          planId: session.metadata?.plan || sub.metadata?.plan,
          customerId: typeof session.customer === 'string' ? session.customer : session.customer?.id,
          priceId: sub.items?.data?.[0]?.price?.id,
        },
      };
    }
  }

  const candidates = [];
  if (email) {
    const customers = await stripe.customers.list({ email: String(email).trim(), limit: 20 });
    for (const customer of customers.data) {
      const subs = await stripe.subscriptions.list({
        customer: customer.id,
        status: 'all',
        limit: 20,
      });
      for (const sub of subs.data) {
        const metaUser = sub.metadata?.user_id;
        if (metaUser && metaUser !== userId) continue;
        candidates.push({ sub, customerId: customer.id });
      }
    }
  }

  if (!candidates.length) return null;

  candidates.sort((a, b) => scoreStripeSubscription(b.sub) - scoreStripeSubscription(a.sub));
  const best = candidates[0];
  return {
    subscription: best.sub,
    extras: {
      userId,
      customerId: best.customerId,
      planId: best.sub.metadata?.plan,
      priceId: best.sub.items?.data?.[0]?.price?.id,
    },
  };
}

module.exports = {
  PLAN_TO_PRICE_ID,
  mapStripeSubscriptionStatus,
  upsertSubscriptionFromStripe,
  findBestStripeSubscription,
  ACTIVE_STRIPE_STATUSES,
};
