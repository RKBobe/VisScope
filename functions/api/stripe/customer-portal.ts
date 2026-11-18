import Stripe from 'stripe';

interface Env {
  STRIPE_SECRET_KEY?: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  const secretKey = (env.STRIPE_SECRET_KEY || '').trim();
  if (!secretKey) {
    return Response.json({ error: 'STRIPE_SECRET_KEY not set' }, { status: 503 });
  }

  const stripe = new Stripe(secretKey, {
    apiVersion: '2025-02-24.acacia' as Stripe.LatestApiVersion,
  });

  try {
    const body = ((await request.json().catch(() => ({}))) || {}) as Record<string, any>;
    const { customerId, returnUrl } = body;

    if (!customerId || typeof customerId !== 'string') {
      return Response.json(
        { error: 'customerId is required to open the billing portal.' },
        { status: 400 }
      );
    }

    const origin = new URL(request.url).origin;
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId.trim(),
      return_url: typeof returnUrl === 'string' && returnUrl.trim() ? returnUrl : origin,
    });

    return Response.json({ url: portalSession.url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to create billing portal session';
    return Response.json({ error: msg }, { status: 500 });
  }
};
