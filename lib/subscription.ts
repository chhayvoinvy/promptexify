import { PrismaClient } from "@/lib/generated/prisma";
import { stripe } from "@/lib/stripe";
import { subscriptionPlans } from "@/config/subscription-plans";

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
      type: true, // Include user type for verification
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

  // Determine interval based on price ID from config
  let interval: "month" | "year" | null = null;
  if (isPaid && user.stripePriceId) {
    if (user.stripePriceId === subscriptionPlans.monthly.stripePriceId) {
      interval = "month";
    } else if (user.stripePriceId === subscriptionPlans.yearly.stripePriceId) {
      interval = "year";
    }
  }

  let isCanceled = false;
  if (isPaid && user.stripeSubscriptionId) {
    try {
      const stripePlan = await stripe.subscriptions.retrieve(
        user.stripeSubscriptionId
      );
      isCanceled = stripePlan.cancel_at_period_end;
    } catch (error) {
      console.error("Error retrieving Stripe subscription:", error);
      // If we can't retrieve from Stripe, assume not canceled
      isCanceled = false;
    }
  }

  return {
    stripeCustomerId: user.stripeCustomerId,
    stripeSubscriptionId: user.stripeSubscriptionId,
    stripePriceId: user.stripePriceId,
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
    if (basePlan.interval === "year") {
      return {
        ...basePlan,
        name: subscriptionPlans.yearly.name,
        description: subscriptionPlans.yearly.description,
        price: subscriptionPlans.yearly.price,
        features: subscriptionPlans.yearly.features,
      };
    } else if (basePlan.interval === "month") {
      return {
        ...basePlan,
        name: subscriptionPlans.monthly.name,
        description: subscriptionPlans.monthly.description,
        price: subscriptionPlans.monthly.price,
        features: subscriptionPlans.monthly.features,
      };
    }
  }

  // Free plan fallback
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

/**
 * Syncs user subscription data with Stripe to ensure consistency
 * This function helps resolve data mismatches between local DB and Stripe
 */
export async function syncUserSubscriptionWithStripe(
  userId: string
): Promise<{ synced: boolean; message: string }> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        stripeCustomerId: true,
        stripeSubscriptionId: true,
        stripePriceId: true,
        stripeCurrentPeriodEnd: true,
        type: true,
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    // If user doesn't have Stripe data, they should be FREE
    if (!user.stripeCustomerId || !user.stripeSubscriptionId) {
      if (user.type !== "FREE") {
        await prisma.user.update({
          where: { id: userId },
          data: {
            type: "FREE",
            stripePriceId: null,
            stripeCurrentPeriodEnd: null,
          },
        });
        return {
          synced: true,
          message:
            "User downgraded to FREE tier - no active subscription found",
        };
      }
      return { synced: false, message: "User is correctly set to FREE tier" };
    }

    // Fetch current subscription from Stripe
    const subscription = await stripe.subscriptions.retrieve(
      user.stripeSubscriptionId
    );

    const subscriptionData = subscription as any;
    const currentPeriodEnd = new Date(
      subscriptionData.current_period_end * 1000
    );
    const isPaidActive =
      subscriptionData.status === "active" ||
      subscriptionData.status === "trialing";
    const isExpired = currentPeriodEnd.getTime() < Date.now();

    // Determine correct user type
    const correctType = isPaidActive && !isExpired ? "PREMIUM" : "FREE";

    // Check if data is out of sync
    const needsSync =
      user.type !== correctType ||
      user.stripePriceId !== subscriptionData.items.data[0]?.price?.id ||
      !user.stripeCurrentPeriodEnd ||
      Math.abs(
        user.stripeCurrentPeriodEnd.getTime() - currentPeriodEnd.getTime()
      ) > 1000;

    if (needsSync) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          type: correctType,
          stripePriceId: subscriptionData.items.data[0]?.price?.id || null,
          stripeCurrentPeriodEnd:
            correctType === "PREMIUM" ? currentPeriodEnd : null,
        },
      });

      return {
        synced: true,
        message: `User synchronized to ${correctType} status based on Stripe subscription`,
      };
    }

    return {
      synced: false,
      message: "User data is already in sync with Stripe",
    };
  } catch (error) {
    console.error("Error syncing user subscription with Stripe:", error);
    return {
      synced: false,
      message:
        "Failed to sync with Stripe. Please try again or contact support.",
    };
  }
}
