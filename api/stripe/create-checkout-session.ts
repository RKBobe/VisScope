import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';

function getStripeClient(): Stripe | null {
  const secretKey = (process.env.STRIPE_SECRET_KEY || '').trim();
  if (!secretKey) return null;
  return new Stripe(secretKey, {
    apiVersion: '2025-02-24.acacia' as Stripe.LatestApiVersion,
  });
}

const TIER_PRICES = {
  pro: {
    name: 'Vis-Scope Professional Plan',
    month: 3900, // $39.00 in cents
    year: 39000, // $390.00 in cents
  },
  team: {
    name: 'Vis-Scope Team / Firm Plan (5 Seats)',
    month: 14900, // $149.00 in cents
    year: 149000, // $1490.00 in cents
  },
} as const;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const stripe = getStripeClient();
  if (!stripe) {
    return res.status(503).json({
      error: 'Stripe is not configured on this server. Set STRIPE_SECRET_KEY in Vercel environment variables.',
      configured: false,
    });
  }

  try {
    const { tier, interval = 'month', customerEmail, successUrl, cancelUrl } = req.body || {};

    if (tier !== 'pro' && tier !== 'team') {
      return res.status(400).json({ error: 'Invalid tier. Must be "pro" or "team".' });
    }

    const billingInterval = interval === 'year' ? 'year' : 'month';
    const planInfo = TIER_PRICES[tier as 'pro' | 'team'];
    const amountInCents = billingInterval === 'year' ? planInfo.year : planInfo.month;

    // Determine return URLs
    const proto = (req.headers['x-forwarded-proto'] as string) || 'https';
    const host = (req.headers['x-forwarded-host'] as string) || req.headers.host || 'localhost:5173';
    const origin = `${proto}://${host}`;

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
            recurring: {
              interval: billingInterval,
            },
          },
          quantity: 1,
        },
      ],
      success_url: finalSuccessUrl,
      cancel_url: finalCancelUrl,
      metadata: {
        tier,
        billingInterval,
      },
    });

    return res.status(200).json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create Stripe Checkout session';
    return res.status(500).json({ error: message });
  }
}
