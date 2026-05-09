import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const VALID_PLANS = ['basic', 'pro'] as const;
type Plan = (typeof VALID_PLANS)[number];

function getPriceId(plan: Plan): string {
  const id = plan === 'pro'
    ? process.env.STRIPE_PRICE_ID_PRO
    : process.env.STRIPE_PRICE_ID_BASIC;
  if (!id) throw new Error(`STRIPE_PRICE_ID_${plan.toUpperCase()} is not configured`);
  return id;
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const { plan, user_id } = body;

  if (!user_id || typeof user_id !== 'string') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!plan || !VALID_PLANS.includes(plan)) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user_id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  let priceId: string;
  try {
    priceId = getPriceId(plan);
  } catch (err) {
    console.error('[create-checkout] Env config error:', err);
    return NextResponse.json({ error: 'Payment configuration error' }, { status: 500 });
  }

  const appUrl = (process.env.NEXT_PUBLIC_PROD_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').trim();

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/articles?success=true`,
      cancel_url: `${appUrl}/pricing?canceled=true`,
      metadata: { user_id, price_id: priceId },
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('[create-checkout] Stripe error:', err);
    const message = err instanceof Error ? err.message : 'Stripe error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
