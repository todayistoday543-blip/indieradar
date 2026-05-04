import Stripe from 'stripe';

// Lazy singleton — does not throw at module evaluation time during build.
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder';
    _stripe = new Stripe(key, { apiVersion: '2026-04-22.dahlia' });
  }
  return _stripe;
}

// Convenience proxy so existing `import { stripe }` call-sites keep working.
export const stripe: Stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    return getStripe()[prop as keyof Stripe];
  },
});
