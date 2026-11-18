import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';

export const config = {
  api: {
    bodyParser: false, // Stripe webhook signature verification requires raw body
  },
};

function readRawBody(req: VercelRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', (err) => reject(err));
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const secretKey = (process.env.STRIPE_SECRET_KEY || '').trim();
  const webhookSecret = (process.env.STRIPE_WEBHOOK_SECRET || '').trim();

  if (!secretKey) {
    return res.status(503).json({ error: 'STRIPE_SECRET_KEY not set' });
  }

  const stripe = new Stripe(secretKey, {
    apiVersion: '2025-02-24.acacia' as Stripe.LatestApiVersion,
  });

  let event: Stripe.Event;

  try {
    const rawBody = await readRawBody(req);
    const signature = req.headers['stripe-signature'];

    if (webhookSecret && signature) {
      event = stripe.webhooks.constructEvent(rawBody, signature as string, webhookSecret);
    } else {
      // Fallback if testing without webhook secret
      event = JSON.parse(rawBody.toString('utf8')) as Stripe.Event;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Webhook error';
    return res.status(400).json({ error: `Webhook signature verification failed: ${msg}` });
  }

  // Handle relevant subscription events
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const tier = session.metadata?.tier || 'pro';
      const customerEmail = session.customer_details?.email || session.customer_email;
      console.log(`[Stripe Webhook] Checkout completed for ${customerEmail}. Plan: ${tier}`);
      break;
    }
    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      console.log(`[Stripe Webhook] Subscription updated: ${subscription.id}, status: ${subscription.status}`);
      break;
    }
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      console.log(`[Stripe Webhook] Subscription canceled: ${subscription.id}`);
      break;
    }
    default:
      console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
  }

  return res.status(200).json({ received: true });
}
