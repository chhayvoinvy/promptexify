import { prisma } from "@/lib/prisma";

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

/** All users are on the free plan; no paid subscriptions. */
const FREE_PLAN: UserSubscriptionPlan = {
  stripeCustomerId: null,
  stripeSubscriptionId: null,
  stripePriceId: null,
  stripeCurrentPeriodEnd: null,
  isPaid: false,
  interval: null,
  isCanceled: false,
};

const FREE_PLAN_ENHANCED: EnhancedUserSubscriptionPlan = {
  ...FREE_PLAN,
  name: "Free",
  description: "Full access to all prompts and features",
  price: 0,
  features: [
    "Access to all prompts",
    "Bookmarks and favorites",
    "Create and manage your prompts",
    "Community support",
  ],
};

export async function getUserSubscriptionPlan(
  userId: string
): Promise<UserSubscriptionPlan> {
  if (!userId) throw new Error("Missing parameters");
  const user = await prisma.user.findFirst({
    where: { id: userId },
    select: { id: true },
  });
  if (!user) throw new Error("User not found");
  return { ...FREE_PLAN };
}

export async function getEnhancedUserSubscriptionPlan(
  userId: string
): Promise<EnhancedUserSubscriptionPlan> {
  await getUserSubscriptionPlan(userId);
  return { ...FREE_PLAN_ENHANCED };
}

/** No-op: no Stripe to sync. Kept for API compatibility. */
export async function syncUserSubscriptionWithStripe(
  _userId: string
): Promise<{ synced: boolean; message: string }> {
  return { synced: false, message: "All features are free; no subscription to sync." };
}

/** No-op: no paid subscriptions. Kept for API compatibility. */
export async function checkAndHandleExpiredSubscriptions(): Promise<{
  processedCount: number;
  errors: string[];
}> {
  return { processedCount: 0, errors: [] };
}

export async function cleanupPremiumData(_userId: string): Promise<void> {
  // No-op
}

/** No-op: no Stripe. Kept for API compatibility. */
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
  return { orphanedSubscriptions: [], totalFound: 0 };
}
