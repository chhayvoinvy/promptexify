import Stripe from "stripe";

if (!process.env.STRIPE_API_KEY) {
  throw new Error("STRIPE_API_KEY is required");
}

export const stripe = new Stripe(process.env.STRIPE_API_KEY, {
  apiVersion: "2025-06-30.basil",
  typescript: true,
});
