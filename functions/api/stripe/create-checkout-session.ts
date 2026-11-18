import Stripe from 'stripe';

interface Env {
  STRIPE_SECRET_KEY?: string;
}

const TIER_PRICES = {
  pro: {
    name: 'Vis-Scope Professional Plan',
    month: 3900,
    year: 39000,
  },
  team: {
    name: 'Vis-Scope Team / Firm Plan (5 Seats)',
    month: 14900,
    year: 149000,
  },
} as const;

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  const secretKey = (env.STRIPE_SECRET_KEY || '').trim();
  if (!secretKey) {
    return Response.json(
      {
        error:
          'Stripe is not configured on this server. Set STRIPE_SECRET_KEY in Cloudflare Pages environment variables.',
        configured: false,
      },
      { status: 503 }
    );
  }

  const stripe = new Stripe(secretKey, {
    apiVersion: '2025-02-24.acacia' as Stripe.LatestApiVersion,
  });

  try {
    const body = ((await request.json().catch(() => ({}))) || {}) as Record<string, any>;
    const { tier, interval = 'month', customerEmail, successUrl, cancelUrl } = body;

    if (tier !== 'pro' && tier !== 'team') {
      return Response.json({ error: 'Invalid tier. Must be "pro" or "team".' }, { status: 400 });
    }

    const billingInterval = interval === 'year' ? 'year' : 'month';
    const planInfo = TIER_PRICES[tier as 'pro' | 'team'];
    const amountInCents = billingInterval === 'year' ? planInfo.year : planInfo.month;

    const origin = new URL(request.url).origin;
    const finalSuccessUrl =
      typeof successUrl === 'string' && successUrl.trim()
        ? successUrl
        : `${origin}/?session_id={CHECKOUT_SESSION_ID}&upgraded=true&tier=${tier}`;

    const finalCancelUrl =
      typeof cancelUrl === 'string' && cancelUrl.trim()
        ? cancelUrl
        : `${origin}/?checkout_canceled=true`;

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: typeof customerEmail === 'string' ? customerEmail.trim() : undefined,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: planInfo.name,
              description:
                tier === 'pro'
                  ? 'Includes MeshEngine UAD 3.6 XML exports, clean unwatermarked inspection reports, and Lowe’s B2B procurement CSV.'
                  : 'Includes 5 inspector seats, centralized team repository, and custom cost multiplier overrides.',
            },
            unit_amount: amountInCents,
            recurring: { interval: billingInterval },
          },
          quantity: 1,
        },
      ],
      success_url: finalSuccessUrl,
      cancel_url: finalCancelUrl,
      metadata: { tier, billingInterval },
    });

    return Response.json({ sessionId: session.id, url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create Stripe Checkout session';
    return Response.json({ error: message }, { status: 500 });
  }
};
