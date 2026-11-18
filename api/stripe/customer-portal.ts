import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const secretKey = (process.env.STRIPE_SECRET_KEY || '').trim();
  if (!secretKey) {
    return res.status(503).json({ error: 'STRIPE_SECRET_KEY not set' });
  }

  const stripe = new Stripe(secretKey, {
    apiVersion: '2025-02-24.acacia' as Stripe.LatestApiVersion,
  });

  try {
    const { customerId, returnUrl } = req.body || {};

    if (!customerId || typeof customerId !== 'string') {
      return res.status(400).json({ error: 'customerId is required to open the billing portal.' });
    }

    const proto = (req.headers['x-forwarded-proto'] as string) || 'https';
    const host = (req.headers['x-forwarded-host'] as string) || req.headers.host || 'localhost:5173';
    const origin = `${proto}://${host}`;

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId.trim(),
      return_url: typeof returnUrl === 'string' && returnUrl.trim() ? returnUrl : origin,
    });

    return res.status(200).json({ url: portalSession.url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to create billing portal session';
    return res.status(500).json({ error: msg });
  }
}
