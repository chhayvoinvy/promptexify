"use server";

import { syncUserSubscriptionWithStripe as syncFromLib } from "@/lib/subscription";

export type StripeActionResponse = {
  status: "success" | "error";
  stripeUrl?: string;
  message?: string;
};

/** No-op: re-export for billing page compatibility. All users are free. */
export async function syncUserSubscriptionWithStripe(userId: string) {
  return syncFromLib();
}

/** No-op: no paid plans. Kept for callers that still reference it. */
export async function createStripeSubscription(
  _priceId: string
): Promise<StripeActionResponse> {
  return {
    status: "error",
    message: "All features are free; no subscription needed.",
  };
}

/** No-op: no billing portal. Kept for callers that still reference it. */
export async function createCustomerPortalSession(): Promise<StripeActionResponse> {
  return {
    status: "error",
    message: "All features are free; no billing portal.",
  };
}

/** No-op: no checkout. Kept for callers that still reference it. */
export async function redirectToStripeCheckout(_priceId: string): Promise<never> {
  throw new Error("All features are free; no checkout required.");
}
