export const PLANS = {
  free: {
    name: 'Free',
    price_jpy: 0,
    features: {
      articles_per_day: 999,
      show_full_translation: false,
      ai_prompt_model: null,
      can_post: true,
      prompt_generation: false,
      custom_prompt_chat: false,
    },
  },
  basic: {
    name: 'Basic',
    price_jpy: 500,
    stripe_price_id: process.env.STRIPE_PRICE_ID_BASIC,
    features: {
      articles_per_day: 999,
      show_full_translation: true,
      ai_prompt_model: null,
      can_post: true,
      prompt_generation: false,
      custom_prompt_chat: false,
    },
  },
  pro: {
    name: 'Pro',
    price_jpy: 1500,
    stripe_price_id: process.env.STRIPE_PRICE_ID_PRO,
    features: {
      articles_per_day: 999,
      show_full_translation: true,
      ai_prompt_model: 'sonnet' as const,
      can_post: true,
      prompt_generation: true,
      custom_prompt_chat: true,
    },
  },
} as const;

export type PlanKey = keyof typeof PLANS;
