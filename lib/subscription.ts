import { PrismaClient } from "@/lib/generated/prisma";
import { stripe } from "@/lib/stripe";

const prisma = new PrismaClient();

export interface UserSubscriptionPlan {
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  stripePriceId?: string | null;
  stripeCurrentPeriodEnd?: number | null;
  isPaid: boolean;
  interval: "month" | "year" | null;
  isCanceled: boolean;
}

export interface EnhancedUserSubscriptionPlan extends UserSubscriptionPlan {
  name: string;
  description: string;
  price: number;
  features: string[];
}

export async function getUserSubscriptionPlan(
  userId: string
): Promise<UserSubscriptionPlan> {
  if (!userId) throw new Error("Missing parameters");

  const user = await prisma.user.findFirst({
    where: {
      id: userId,
    },
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
    user.stripeCurrentPeriodEnd.getTime() + 86_400_000 > Date.now()
      ? true
      : false;

  const interval = isPaid
    ? user.stripePriceId ===
      process.env.NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID
      ? "month"
      : user.stripePriceId ===
        process.env.NEXT_PUBLIC_STRIPE_PREMIUM_YEARLY_PRICE_ID
      ? "year"
      : null
    : null;

  let isCanceled = false;
  if (isPaid && user.stripeSubscriptionId) {
    const stripePlan = await stripe.subscriptions.retrieve(
      user.stripeSubscriptionId
    );
    isCanceled = stripePlan.cancel_at_period_end;
  }

  return {
    ...user,
    stripeCurrentPeriodEnd: user.stripeCurrentPeriodEnd?.getTime() || null,
    isPaid,
    interval,
    isCanceled,
  };
}

export async function getEnhancedUserSubscriptionPlan(
  userId: string
): Promise<EnhancedUserSubscriptionPlan> {
  const basePlan = await getUserSubscriptionPlan(userId);

  // Determine plan details based on current subscription
  if (basePlan.isPaid) {
    const premiumFeatures = [
      "Access all premium prompts",
      "Advanced AI features",
      "Priority support",
      "Ad-free experience",
    ];

    if (basePlan.interval === "year") {
      return {
        ...basePlan,
        name: "Premium Yearly",
        description: "Annual premium subscription",
        price: 29.99,
        features: [...premiumFeatures, "2 months free"],
      };
    } else {
      return {
        ...basePlan,
        name: "Premium Monthly",
        description: "Monthly premium subscription",
        price: 2.99,
        features: premiumFeatures,
      };
    }
  }

  return {
    ...basePlan,
    name: "Free",
    description: "Free tier with limited features",
    price: 0,
    features: [
      "Limited access to prompts",
      "Basic features",
      "Community support",
    ],
  };
}
