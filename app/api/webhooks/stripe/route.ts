import { headers } from "next/headers";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { PrismaClient } from "@/lib/generated/prisma";

const prisma = new PrismaClient();

// Enhanced logging function
function logWebhookEvent(eventType: string, message: string, data?: unknown) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] Stripe Webhook [${eventType}]: ${message}`);
  if (data) {
    console.log(`[${timestamp}] Data:`, JSON.stringify(data, null, 2));
  }
}

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

  logWebhookEvent(event.type, "Processing webhook event", {
    eventId: event.id,
  });

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        logWebhookEvent(event.type, "Checkout session completed", {
          sessionId: session.id,
          customerId: session.customer,
          subscriptionId: session.subscription,
          metadata: session.metadata,
        });

        if (session.subscription && session.metadata?.userId) {
          const subscription = (await stripe.subscriptions.retrieve(
            session.subscription as string
          )) as Stripe.Subscription;

          const userData = {
            stripeSubscriptionId: subscription.id,
            stripeCustomerId: subscription.customer as string,
            stripePriceId: subscription.items.data[0]?.price.id,
            stripeCurrentPeriodEnd: new Date(
              (
                subscription as Stripe.Subscription & {
                  current_period_end: number;
                }
              ).current_period_end * 1000
            ),
            type: "PREMIUM" as const,
          };

          await prisma.user.update({
            where: { id: session.metadata.userId },
            data: userData,
          });

          logWebhookEvent(
            event.type,
            `Subscription created for user ${session.metadata.userId}`,
            userData
          );
        } else {
          logWebhookEvent(
            event.type,
            "Missing subscription or userId in session metadata",
            {
              hasSubscription: !!session.subscription,
              hasUserId: !!session.metadata?.userId,
              metadata: session.metadata,
            }
          );
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        logWebhookEvent(event.type, "Subscription updated", {
          subscriptionId: subscription.id,
          status: subscription.status,
          currentPeriodEnd: (
            subscription as Stripe.Subscription & { current_period_end: number }
          ).current_period_end,
          cancelAtPeriodEnd: (
            subscription as Stripe.Subscription & {
              cancel_at_period_end: boolean;
            }
          ).cancel_at_period_end,
        });

        // Update subscription data
        await prisma.user.updateMany({
          where: { stripeSubscriptionId: subscription.id },
          data: {
            stripePriceId: subscription.items.data[0]?.price.id,
            stripeCurrentPeriodEnd: new Date(
              (
                subscription as Stripe.Subscription & {
                  current_period_end: number;
                }
              ).current_period_end * 1000
            ),
            type: subscription.status === "active" ? "PREMIUM" : "FREE",
          },
        });

        logWebhookEvent(event.type, `Subscription ${subscription.id} updated`);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        logWebhookEvent(event.type, "Subscription deleted", {
          subscriptionId: subscription.id,
          customerId: subscription.customer,
        });

        const updateResult = await prisma.user.updateMany({
          where: { stripeSubscriptionId: subscription.id },
          data: {
            type: "FREE",
            stripeSubscriptionId: null,
            stripePriceId: null,
            stripeCurrentPeriodEnd: null,
          },
        });

        logWebhookEvent(
          event.type,
          `Subscription cancelled: ${subscription.id}, affected users: ${updateResult.count}`
        );
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        logWebhookEvent(event.type, "Invoice payment succeeded", {
          invoiceId: invoice.id,
          subscriptionId: (
            invoice as Stripe.Invoice & { subscription: string | null }
          ).subscription,
          customerId: invoice.customer,
          amount: (invoice as Stripe.Invoice & { amount_paid: number })
            .amount_paid,
        });

        const subscriptionId = (
          invoice as Stripe.Invoice & { subscription: string | null }
        ).subscription;
        if (subscriptionId) {
          const subscription = (await stripe.subscriptions.retrieve(
            subscriptionId
          )) as Stripe.Subscription;

          await prisma.user.updateMany({
            where: { stripeSubscriptionId: subscription.id },
            data: {
              stripeCurrentPeriodEnd: new Date(
                (
                  subscription as Stripe.Subscription & {
                    current_period_end: number;
                  }
                ).current_period_end * 1000
              ),
              type: "PREMIUM",
            },
          });

          logWebhookEvent(
            event.type,
            `Payment successful for subscription ${subscription.id}`
          );
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        logWebhookEvent(event.type, "Invoice payment failed", {
          invoiceId: invoice.id,
          subscriptionId: (
            invoice as Stripe.Invoice & { subscription: string | null }
          ).subscription,
          customerId: invoice.customer,
          attemptCount: (invoice as Stripe.Invoice & { attempt_count: number })
            .attempt_count,
        });

        // Optionally handle payment failures (e.g., send notifications)
        break;
      }

      default:
        logWebhookEvent(event.type, `Unhandled event type: ${event.type}`);
    }
  } catch (error) {
    console.error("Error processing webhook:", error);
    logWebhookEvent(event.type, "Error processing webhook", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return new Response("Webhook handler failed", { status: 500 });
  }

  return new Response(null, { status: 200 });
}
