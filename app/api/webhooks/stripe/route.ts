import { headers } from "next/headers";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { PrismaClient } from "@/lib/generated/prisma";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  const body = await req.text();
  const signature = (await headers()).get("Stripe-Signature") as string;

  let event: Stripe.Event;

  try {
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      throw new Error("STRIPE_WEBHOOK_SECRET is required");
    }

    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Webhook signature verification failed:", errorMessage);
    return new Response(`Webhook Error: ${errorMessage}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        if (session.subscription && session.metadata?.userId) {
          const subscription = (await stripe.subscriptions.retrieve(
            session.subscription as string
          )) as any;

          await prisma.user.update({
            where: { id: session.metadata.userId },
            data: {
              stripeSubscriptionId: subscription.id,
              stripeCustomerId: subscription.customer as string,
              stripePriceId: subscription.items.data[0]?.price?.id,
              stripeCurrentPeriodEnd: new Date(
                (subscription as any).current_period_end * 1000
              ),
              type: "PREMIUM",
            },
          });

          console.log(
            `Subscription created for user ${session.metadata.userId}`
          );
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;

        await prisma.user.updateMany({
          where: { stripeSubscriptionId: subscription.id },
          data: {
            type: "FREE",
            stripeSubscriptionId: null,
            stripePriceId: null,
            stripeCurrentPeriodEnd: null,
          },
        });

        console.log(`Subscription cancelled: ${subscription.id}`);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  } catch (error) {
    console.error("Error processing webhook:", error);
    return new Response("Webhook handler failed", { status: 500 });
  }

  return new Response(null, { status: 200 });
}
