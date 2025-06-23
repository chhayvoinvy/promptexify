import { headers } from "next/headers";
import { NextRequest } from "next/server";

import { PrismaClient } from "@/lib/generated/prisma";
import { stripe } from "@/lib/stripe";

const prisma = new PrismaClient();

// Helper function to safely convert Unix timestamp to Date
function safeConvertToDate(timestamp: any): Date | null {
  if (!timestamp || typeof timestamp !== "number" || timestamp <= 0) {
    return null;
  }

  const date = new Date(timestamp * 1000);
  return isNaN(date.getTime()) ? null : date;
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = (await headers()).get("Stripe-Signature") as string;

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    return new Response("Webhook secret not configured", { status: 500 });
  }

  try {
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as any;

        if (session.subscription && session.metadata?.userId) {
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription
          );

          const subscriptionData = subscription as any;

          await prisma.user.update({
            where: {
              id: session.metadata.userId,
            },
            data: {
              stripeSubscriptionId: subscriptionData.id,
              stripeCustomerId: subscriptionData.customer,
              stripePriceId: subscriptionData.items.data[0]?.price?.id || null,
              stripeCurrentPeriodEnd: safeConvertToDate(
                subscriptionData.current_period_end
              ),
              type: "PREMIUM",
            },
          });
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as any;

        if (
          invoice.billing_reason !== "subscription_create" &&
          invoice.subscription
        ) {
          const subscription = await stripe.subscriptions.retrieve(
            invoice.subscription
          );

          const subscriptionData = subscription as any;

          await prisma.user.update({
            where: {
              stripeSubscriptionId: subscriptionData.id,
            },
            data: {
              stripePriceId: subscriptionData.items.data[0]?.price?.id || null,
              stripeCurrentPeriodEnd: safeConvertToDate(
                subscriptionData.current_period_end
              ),
              type: "PREMIUM",
            },
          });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as any;

        await prisma.user.update({
          where: {
            stripeSubscriptionId: subscription.id,
          },
          data: {
            stripeSubscriptionId: null,
            stripePriceId: null,
            stripeCurrentPeriodEnd: null,
            type: "FREE",
          },
        });
        break;
      }
    }

    return new Response(null, { status: 200 });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(
      `Webhook Error: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
      { status: 400 }
    );
  }
}
