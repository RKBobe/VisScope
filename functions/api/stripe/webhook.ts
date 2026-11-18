import Stripe from 'stripe';

interface Env {
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  const secretKey = (env.STRIPE_SECRET_KEY || '').trim();
  const webhookSecret = (env.STRIPE_WEBHOOK_SECRET || '').trim();

  if (!secretKey) {
    return Response.json({ error: 'STRIPE_SECRET_KEY not set' }, { status: 503 });
  }

  const stripe = new Stripe(secretKey, {
    apiVersion: '2025-02-24.acacia' as Stripe.LatestApiVersion,
  });

  const rawBody = await request.text();
  const signature = request.headers.get('stripe-signature');

  let event: Stripe.Event;

  try {
    if (webhookSecret && signature) {
      event = await stripe.webhooks.constructEventAsync(rawBody, signature, webhookSecret);
    } else {
      event = JSON.parse(rawBody) as Stripe.Event;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Webhook error';
    return Response.json({ error: `Signature verification failed: ${msg}` }, { status: 400 });
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      console.log(`[Cloudflare Webhook] Checkout completed for plan: ${session.metadata?.tier}`);
      break;
    }
    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription;
      console.log(`[Cloudflare Webhook] Subscription updated: ${sub.id}, status: ${sub.status}`);
      break;
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      console.log(`[Cloudflare Webhook] Subscription canceled: ${sub.id}`);
      break;
    }
  }

  return Response.json({ received: true });
};
