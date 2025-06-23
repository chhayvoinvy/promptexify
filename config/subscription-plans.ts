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
    stripePriceId: "price_1RYURt001THvdychB50o4KZa",
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
    stripePriceId: "price_1RYUST001THvdych5O8H8CjP",
    price: 29.99,
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

// Environment variable validation
if (typeof window === "undefined") {
  // Server-side validation
  const monthlyEnvPrice =
    process.env.NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PLAN_ID;
  const yearlyEnvPrice = process.env.NEXT_PUBLIC_STRIPE_PREMIUM_YEARLY_PLAN_ID;

  if (
    monthlyEnvPrice &&
    monthlyEnvPrice !== subscriptionPlans.monthly.stripePriceId
  ) {
    console.warn(
      `Monthly price ID mismatch: config has ${subscriptionPlans.monthly.stripePriceId}, env has ${monthlyEnvPrice}`
    );
  }

  if (
    yearlyEnvPrice &&
    yearlyEnvPrice !== subscriptionPlans.yearly.stripePriceId
  ) {
    console.warn(
      `Yearly price ID mismatch: config has ${subscriptionPlans.yearly.stripePriceId}, env has ${yearlyEnvPrice}`
    );
  }
}
