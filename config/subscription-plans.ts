// Client-safe subscription plans configuration
// This file can be imported in both client and server components

export interface SubscriptionPlan {
  name: string;
  description: string;
  stripePriceId: string;
  price: number;
  interval: "month" | "year";
  features: string[];
}

export const subscriptionPlans: {
  monthly: SubscriptionPlan;
  yearly: SubscriptionPlan;
} = {
  monthly: {
    name: "Premium Monthly",
    description: "Access all premium content and features",
    stripePriceId:
      process.env.NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PLAN_ID ||
      "price_test_monthly",
    price: 2.99,
    interval: "month",
    features: [
      "Access all premium prompts",
      "Advanced AI features",
      "Priority support",
      "Ad-free experience",
    ],
  },
  yearly: {
    name: "Premium Yearly",
    description: "Access all premium content and features (2 months free)",
    stripePriceId:
      process.env.NEXT_PUBLIC_STRIPE_PREMIUM_YEARLY_PLAN_ID ||
      "price_test_yearly",
    price: 29.9,
    interval: "year",
    features: [
      "Access all premium prompts",
      "Advanced AI features",
      "Priority support",
      "Ad-free experience",
      "2 months free",
    ],
  },
};
