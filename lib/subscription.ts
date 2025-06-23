// Server-only subscription management utilities
// This file should ONLY be imported in server-side code

import { PrismaClient } from "@/lib/generated/prisma";
import {
  subscriptionPlans,
  type SubscriptionPlan,
} from "@/config/subscription-plans";

const prisma = new PrismaClient();

export interface UserSubscriptionPlan {
  name: string;
  description: string;
  stripePriceId: string;
  price: number;
  interval: "month" | "year" | null;
  features: string[];
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  stripeCurrentPeriodEnd?: number | null;
  isPaid: boolean;
  isCanceled: boolean;
}

export async function getUserSubscriptionPlan(
  userId: string
): Promise<UserSubscriptionPlan> {
  if (!userId) {
    throw new Error("User ID is required");
  }

  const user = await prisma.user.findFirst({
    where: { id: userId },
    select: {
      stripeSubscriptionId: true,
      stripeCurrentPeriodEnd: true,
      stripeCustomerId: true,
      stripePriceId: true,
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  // Check if user is on a paid plan
  const isPaid =
    user.stripePriceId &&
    user.stripeCurrentPeriodEnd &&
    user.stripeCurrentPeriodEnd.getTime() + 86_400_000 > Date.now();

  // Determine which plan the user is on
  const isMonthly =
    user.stripePriceId === subscriptionPlans.monthly.stripePriceId;
  const isYearly =
    user.stripePriceId === subscriptionPlans.yearly.stripePriceId;

  let plan: SubscriptionPlan;
  let interval: "month" | "year" | null = null;

  if (isPaid && isMonthly) {
    plan = subscriptionPlans.monthly;
    interval = "month";
  } else if (isPaid && isYearly) {
    plan = subscriptionPlans.yearly;
    interval = "year";
  } else {
    // Free plan
    plan = {
      name: "Free",
      description: "Basic access to public content",
      stripePriceId: "",
      price: 0,
      interval: "month",
      features: ["Access to free content", "Basic features"],
    };
  }

  // Note: We removed the Stripe API call for checking cancellation here
  // since this function might be called from client-side through server actions
  // The cancellation check can be done separately in server-only contexts

  return {
    ...plan,
    stripeCustomerId: user.stripeCustomerId,
    stripeSubscriptionId: user.stripeSubscriptionId,
    stripeCurrentPeriodEnd: user.stripeCurrentPeriodEnd?.getTime() || null,
    isPaid: !!isPaid,
    interval,
    isCanceled: false, // This would need to be checked separately via Stripe API in server context
  };
}
