"use server";

import { getCurrentUser } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { getUserSubscriptionPlan } from "@/lib/subscription";
import { getBaseUrl } from "@/lib/utils";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export type StripeActionResponse = {
  status: "success" | "error";
  stripeUrl?: string;
  message?: string;
};

const billingUrl = `${getBaseUrl()}/dashboard/billing`;

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

export async function createStripeSubscription(
  priceId: string
): Promise<StripeActionResponse> {
  return createStripeCheckoutSession(priceId);
}

export async function createCustomerPortalSession(): Promise<StripeActionResponse> {
  try {
    const user = await getCurrentUser();

    if (!user || !user.email || !user.id) {
      return {
        status: "error",
        message: "You must be logged in to access billing portal",
      };
    }

    const subscriptionPlan = await getUserSubscriptionPlan(user.id);

    if (!subscriptionPlan.isPaid || !subscriptionPlan.stripeCustomerId) {
      return {
        status: "error",
        message: "No active subscription found",
      };
    }

    // User on Paid Plan - Create a portal session to manage subscription
    const stripeSession = await stripe.billingPortal.sessions.create({
      customer: subscriptionPlan.stripeCustomerId,
      return_url: billingUrl,
    });

    return {
      status: "success",
      stripeUrl: stripeSession.url,
    };
  } catch (error) {
    console.error("Stripe billing portal error:", error);
    return {
      status: "error",
      message: "Failed to create billing portal session. Please try again.",
    };
  }
}

export async function createStripeCheckoutSession(
  priceId: string
): Promise<StripeActionResponse> {
  try {
    const user = await getCurrentUser();

    if (!user || !user.email || !user.id) {
      return {
        status: "error",
        message: "You must be logged in to upgrade to premium",
      };
    }

    const subscriptionPlan = await getUserSubscriptionPlan(user.id);

    if (subscriptionPlan.isPaid && subscriptionPlan.stripeCustomerId) {
      // User on Paid Plan - Create a portal session to manage subscription
      const stripeSession = await stripe.billingPortal.sessions.create({
        customer: subscriptionPlan.stripeCustomerId,
        return_url: billingUrl,
      });

      return {
        status: "success",
        stripeUrl: stripeSession.url,
      };
    } else {
      // User on Free Plan - Create a checkout session to upgrade
      const stripeSession = await stripe.checkout.sessions.create({
        success_url: billingUrl,
        cancel_url: billingUrl,
        payment_method_types: ["card"],
        mode: "subscription",
        billing_address_collection: "auto",
        customer_email: user.email,
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        metadata: {
          userId: user.id,
        },
      });

      return {
        status: "success",
        stripeUrl: stripeSession.url || "",
      };
    }
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return {
      status: "error",
      message: "Failed to create checkout session. Please try again.",
    };
  }
}

export async function redirectToStripeCheckout(priceId: string) {
  const response = await createStripeCheckoutSession(priceId);

  if (response.status === "error") {
    throw new Error(response.message || "Failed to create checkout session");
  }

  if (response.stripeUrl) {
    redirect(response.stripeUrl);
  }
}
