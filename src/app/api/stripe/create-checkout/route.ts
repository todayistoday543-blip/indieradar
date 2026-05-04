import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createServiceClient } from '@/lib/supabase';

const VALID_PLANS = ['basic', 'pro'] as const;

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

  const priceId = plan === 'pro'
    ? process.env.STRIPE_PRICE_ID_PRO!
    : process.env.STRIPE_PRICE_ID_BASIC!;

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/articles?success=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?canceled=true`,
    metadata: { user_id, price_id: priceId },
  });

  return NextResponse.json({ url: session.url });
}
