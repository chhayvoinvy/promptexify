"use server";

import { stripe } from "@/lib/stripe";
import { getUserSubscriptionPlan } from "@/lib/subscription";
import { createClient } from "@/lib/supabase/server";

export interface StripeResponse {
  status: "success" | "error";
  message?: string;
  stripeUrl?: string;
}

// Helper function to check if subscription is canceled (server-only)
export async function getSubscriptionCancellationStatus(
  subscriptionId: string
): Promise<boolean> {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    return subscription.cancel_at_period_end || false;
  } catch (error) {
    console.error("Error checking subscription cancellation:", error);
    return false;
  }
}

export async function createStripeSubscription(
  priceId: string
): Promise<StripeResponse> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user || !user.email) {
      return {
        status: "error",
        message: "Authentication required",
      };
    }

    const subscriptionPlan = await getUserSubscriptionPlan(user.id);

    if (subscriptionPlan.isPaid && subscriptionPlan.stripeCustomerId) {
      // User already has a subscription - redirect to billing portal
      const stripeSession = await stripe.billingPortal.sessions.create({
        customer: subscriptionPlan.stripeCustomerId,
        return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard`,
      });

      return {
        status: "success",
        stripeUrl: stripeSession.url,
      };
    } else {
      // Create new checkout session
      const stripeSession = await stripe.checkout.sessions.create({
        success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard?success=true`,
        cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard?canceled=true`,
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
        stripeUrl: stripeSession.url!,
      };
    }
  } catch (error) {
    console.error("Stripe subscription error:", error);
    return {
      status: "error",
      message: "Failed to create subscription",
    };
  }
}

export async function createCustomerPortalSession(): Promise<StripeResponse> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        status: "error",
        message: "Authentication required",
      };
    }

    const subscriptionPlan = await getUserSubscriptionPlan(user.id);

    if (!subscriptionPlan.stripeCustomerId) {
      return {
        status: "error",
        message: "No subscription found",
      };
    }

    const stripeSession = await stripe.billingPortal.sessions.create({
      customer: subscriptionPlan.stripeCustomerId,
      return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard`,
    });

    return {
      status: "success",
      stripeUrl: stripeSession.url,
    };
  } catch (error) {
    console.error("Customer portal error:", error);
    return {
      status: "error",
      message: "Failed to create customer portal session",
    };
  }
}
