"use server";

import { getCurrentUser } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { getUserSubscriptionPlan } from "@/lib/subscription";
import { getBaseUrl } from "@/lib/utils";
import { redirect } from "next/navigation";

export type StripeActionResponse = {
  status: "success" | "error";
  stripeUrl?: string;
  message?: string;
};

const billingUrl = `${getBaseUrl()}/dashboard/billing`;

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
