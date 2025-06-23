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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

/**
 * Checks for expired subscriptions and downgrades users accordingly
 * This function should be called periodically (e.g., via cron job)
 * to catch any missed webhook events
 */
export async function checkAndHandleExpiredSubscriptions(): Promise<{
  processedCount: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let processedCount = 0;

  try {
    // Find users who appear to have active subscriptions but may be expired
    const usersWithSubscriptions = await prisma.user.findMany({
      where: {
        type: "PREMIUM",
        stripeCurrentPeriodEnd: {
          not: null,
        },
      },
      select: {
        id: true,
        stripeSubscriptionId: true,
        stripeCurrentPeriodEnd: true,
        stripePriceId: true,
        email: true,
      },
    });

    console.log(
      `Checking ${usersWithSubscriptions.length} premium users for expired subscriptions`
    );

    for (const user of usersWithSubscriptions) {
      try {
        // Check if subscription has expired based on local data
        const isExpiredLocally =
          user.stripeCurrentPeriodEnd &&
          user.stripeCurrentPeriodEnd.getTime() < Date.now();

        if (isExpiredLocally && user.stripeSubscriptionId) {
          // Double-check with Stripe to ensure accuracy
          const subscription = await stripe.subscriptions.retrieve(
            user.stripeSubscriptionId
          );

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const subscriptionData = subscription as any;
          const currentPeriodEnd = new Date(
            subscriptionData.current_period_end * 1000
          );
          const isPaidActive =
            subscriptionData.status === "active" ||
            subscriptionData.status === "trialing";
          const isActuallyExpired = currentPeriodEnd.getTime() < Date.now();

          // If subscription is truly expired or inactive, downgrade user
          if (!isPaidActive || isActuallyExpired) {
            await prisma.user.update({
              where: { id: user.id },
              data: {
                type: "FREE",
                stripeSubscriptionId:
                  subscriptionData.status === "canceled"
                    ? null
                    : user.stripeSubscriptionId,
                stripePriceId:
                  subscriptionData.status === "canceled"
                    ? null
                    : user.stripePriceId,
                stripeCurrentPeriodEnd:
                  subscriptionData.status === "canceled"
                    ? null
                    : currentPeriodEnd,
                updatedAt: new Date(),
              },
            });

            console.log(
              `Downgraded expired subscription for user ${user.email}: ${user.stripeSubscriptionId}`
            );
            processedCount++;
          }
        }
      } catch (error) {
        const errorMsg = `Failed to process user ${user.email}: ${error}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }
    }

    return { processedCount, errors };
  } catch (error) {
    const errorMsg = `Error checking expired subscriptions: ${error}`;
    console.error(errorMsg);
    return { processedCount: 0, errors: [errorMsg] };
  }
}

/**
 * Optional: Clean up premium-only data when a user's subscription ends
 * You may want to call this when downgrading users to FREE
 */
export async function cleanupPremiumData(userId: string): Promise<void> {
  try {
    // Example: You could implement cleanup logic here
    // For now, we'll just log since you might want to preserve user data

    // Option 1: Remove premium-only bookmarks/favorites (if you have such distinction)
    // await prisma.bookmark.deleteMany({
    //   where: {
    //     userId,
    //     post: { isPremium: true }
    //   }
    // });

    // Option 2: Just log for now to preserve all user data
    console.log(
      `Premium subscription ended for user ${userId} - data preserved`
    );

    // You could add specific cleanup logic here based on your business rules
    // For example:
    // - Remove access to premium posts from recently viewed
    // - Clear premium-only settings
    // - Remove premium-only bookmarks (if desired)
  } catch (error) {
    console.error(`Error cleaning up premium data for user ${userId}:`, error);
  }
}

/**
 * Diagnose orphaned subscriptions that exist in Stripe but not in our database
 * This helps identify data sync issues between Stripe and our application
 */
export async function diagnoseOrphanedSubscriptions(): Promise<{
  orphanedSubscriptions: Array<{
    subscriptionId: string;
    customerId: string;
    customerEmail?: string;
    status: string;
    created: Date;
  }>;
  totalFound: number;
}> {
  const orphanedSubscriptions: Array<{
    subscriptionId: string;
    customerId: string;
    customerEmail?: string;
    status: string;
    created: Date;
  }> = [];

  try {
    // Get all subscription IDs from our database
    const localSubscriptions = await prisma.user.findMany({
      where: {
        stripeSubscriptionId: {
          not: null,
        },
      },
      select: {
        stripeSubscriptionId: true,
      },
    });

    const localSubscriptionIds = new Set(
      localSubscriptions
        .map((u) => u.stripeSubscriptionId)
        .filter(Boolean) as string[]
    );

    // Get recent subscriptions from Stripe
    const stripeSubscriptions = await stripe.subscriptions.list({
      limit: 100, // Adjust as needed
      expand: ["data.customer"],
    });

    for (const subscription of stripeSubscriptions.data) {
      if (!localSubscriptionIds.has(subscription.id)) {
        // This subscription exists in Stripe but not in our database
        const customer = subscription.customer as any;

        orphanedSubscriptions.push({
          subscriptionId: subscription.id,
          customerId: typeof customer === "string" ? customer : customer.id,
          customerEmail:
            typeof customer === "object" ? customer.email : undefined,
          status: subscription.status,
          created: new Date(subscription.created * 1000),
        });
      }
    }

    console.log(`Found ${orphanedSubscriptions.length} orphaned subscriptions`);

    return {
      orphanedSubscriptions,
      totalFound: orphanedSubscriptions.length,
    };
  } catch (error) {
    console.error("Error diagnosing orphaned subscriptions:", error);
    return {
      orphanedSubscriptions: [],
      totalFound: 0,
    };
  }
}
