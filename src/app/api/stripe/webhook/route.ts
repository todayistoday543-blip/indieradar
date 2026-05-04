import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createServiceClient } from '@/lib/supabase';
import Stripe from 'stripe';

function resolvePlan(priceId: string | undefined): string {
  if (!priceId) return 'basic';
  if (priceId === process.env.STRIPE_PRICE_ID_PRO) return 'pro';
  if (priceId === process.env.STRIPE_PRICE_ID_BASIC) return 'basic';
  return 'basic';
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature');

  if (!sig) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    return NextResponse.json(
      {
        error: `Webhook Error: ${err instanceof Error ? err.message : 'unknown'}`,
      },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.user_id;
      const priceId = session.metadata?.price_id;
      const plan = resolvePlan(priceId);

      if (userId) {
        await supabase
          .from('profiles')
          .update({
            subscription_status: plan,
            subscription_plan: plan,
            stripe_customer_id: session.customer as string,
          })
          .eq('id', userId);
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;
      await supabase
        .from('profiles')
        .update({ subscription_status: 'free', subscription_plan: 'free' })
        .eq('stripe_customer_id', customerId);
      break;
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;

      if (subscription.status !== 'active') {
        await supabase
          .from('profiles')
          .update({ subscription_status: 'free', subscription_plan: 'free' })
          .eq('stripe_customer_id', customerId);
      } else {
        const priceId = subscription.items.data[0]?.price?.id;
        const plan = resolvePlan(priceId);
        await supabase
          .from('profiles')
          .update({ subscription_status: plan, subscription_plan: plan })
          .eq('stripe_customer_id', customerId);
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
