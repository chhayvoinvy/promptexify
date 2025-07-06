import { headers } from "next/headers";
import { NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

/**
 * Safely convert Unix timestamp to JavaScript Date object
 * Stripe timestamps are in seconds, JavaScript Date expects milliseconds
 *
 * @param timestamp Unix timestamp in seconds
 * @returns Valid Date object or null if invalid
 */
function safeConvertToDate(timestamp: any): Date | null {
  try {
    // Validate input
    if (!timestamp || typeof timestamp !== "number" || timestamp <= 0) {
      console.warn("Invalid timestamp provided:", timestamp);
      return null;
    }

    // Convert Unix timestamp (seconds) to JavaScript Date (milliseconds)
    const date = new Date(timestamp * 1000);

    // Verify the date is valid
    if (isNaN(date.getTime())) {
      console.error("Failed to create valid date from timestamp:", timestamp);
      return null;
    }

    return date;
  } catch (error) {
    console.error("Error converting timestamp to date:", error, timestamp);
    return null;
  }
}

/**
 * Get the current period end timestamp from subscription
 * It can be at subscription level or in subscription items
 */
function getCurrentPeriodEnd(subscription: any): number | null {
  // Try subscription items first (most common location for new subscriptions)
  const itemsPeriodEnd = subscription.items?.data?.[0]?.current_period_end;
  if (itemsPeriodEnd) {
    return itemsPeriodEnd;
  }

  // Fallback to subscription level
  const subscriptionPeriodEnd = subscription.current_period_end;
  if (subscriptionPeriodEnd) {
    return subscriptionPeriodEnd;
  }

  return null;
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = (await headers()).get("Stripe-Signature") as string;

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error("Stripe webhook secret not configured");
    return new Response("Webhook secret not configured", { status: 500 });
  }

  try {
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    console.log(
      `Processing Stripe webhook event: ${event.type} (ID: ${
        event.id
      }, Created: ${new Date(event.created * 1000).toISOString()})`
    );

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as any;
        console.log("Processing checkout session completed:", session.id);

        if (session.subscription && session.metadata?.userId) {
          try {
            // Retrieve subscription with expanded fields
            const subscription = await stripe.subscriptions.retrieve(
              session.subscription,
              {
                expand: ["items.data.price", "customer", "latest_invoice"],
              }
            );

            // Check if user exists first
            const existingUser = await prisma.user.findUnique({
              where: { id: session.metadata.userId },
              select: { id: true },
            });

            if (!existingUser) {
              console.error(
                "User not found for checkout session:",
                session.metadata.userId
              );
              break;
            }

            // Get period end date from correct location
            const currentPeriodEndTimestamp = getCurrentPeriodEnd(subscription);
            const periodEndDate = safeConvertToDate(currentPeriodEndTimestamp);

            if (!periodEndDate) {
              console.error(
                "Invalid subscription period end date:",
                currentPeriodEndTimestamp
              );
              console.error(
                "Subscription items period end:",
                subscription.items?.data?.[0]?.current_period_end
              );
              console.error(
                "Subscription level period end:",
                (subscription as any).current_period_end
              );
              break;
            }

            // Get customer ID (handle both string and object)
            const customerId =
              typeof subscription.customer === "string"
                ? subscription.customer
                : subscription.customer?.id;

            // Update user subscription
            await prisma.user.update({
              where: { id: session.metadata.userId },
              data: {
                stripeSubscriptionId: subscription.id,
                stripeCustomerId: customerId,
                stripePriceId: subscription.items?.data?.[0]?.price?.id || null,
                stripeCurrentPeriodEnd: periodEndDate,
                type: "PREMIUM",
                updatedAt: new Date(),
              },
            });

            console.log(
              "Successfully processed checkout session for user:",
              session.metadata.userId
            );
          } catch (error) {
            console.error("Error processing checkout session:", error);
            // Don't throw to prevent webhook retry loops
          }
        } else {
          console.warn(
            "Checkout session missing subscription or userId metadata:",
            session.id
          );
        }
        break;
      }

      case "customer.subscription.created": {
        const subscription = event.data.object as any;
        console.log("Processing subscription created:", subscription.id);

        try {
          // For new subscriptions, try to find user by customer ID first
          let existingUser = await prisma.user.findFirst({
            where: { stripeCustomerId: subscription.customer },
            select: { id: true },
          });

          // If not found by customer ID, try by email (from customer object)
          if (
            !existingUser &&
            subscription.customer &&
            typeof subscription.customer === "object"
          ) {
            const customerEmail = subscription.customer.email;
            if (customerEmail) {
              existingUser = await prisma.user.findFirst({
                where: { email: customerEmail },
                select: { id: true },
              });
            }
          }

          if (existingUser) {
            const currentPeriodEndTimestamp = getCurrentPeriodEnd(subscription);
            const periodEndDate = safeConvertToDate(currentPeriodEndTimestamp);

            if (periodEndDate) {
              await prisma.user.update({
                where: existingUser.id
                  ? { id: existingUser.id }
                  : { stripeCustomerId: subscription.customer },
                data: {
                  stripeSubscriptionId: subscription.id,
                  stripeCustomerId: subscription.customer,
                  stripePriceId:
                    subscription.items?.data?.[0]?.price?.id || null,
                  stripeCurrentPeriodEnd: periodEndDate,
                  type: "PREMIUM",
                  updatedAt: new Date(),
                },
              });
              console.log(
                "Successfully processed subscription creation:",
                subscription.id
              );
            }
          } else {
            console.warn(
              "No user found for customer ID or email:",
              subscription.customer
            );
          }
        } catch (error) {
          console.error("Error processing subscription creation:", error);
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as any;
        console.log(
          "Processing subscription updated:",
          subscription.id,
          "Status:",
          subscription.status
        );

        try {
          // First try to find user by subscription ID
          let existingUser = await prisma.user.findFirst({
            where: { stripeSubscriptionId: subscription.id },
            select: { id: true, email: true },
          });

          // If not found by subscription ID, try to find by customer ID
          if (!existingUser && subscription.customer) {
            existingUser = await prisma.user.findFirst({
              where: { stripeCustomerId: subscription.customer },
              select: { id: true, email: true },
            });

            // If found by customer ID, update their subscription ID
            if (existingUser) {
              await prisma.user.update({
                where: { id: existingUser.id },
                data: { stripeSubscriptionId: subscription.id },
              });
              console.log(
                `Updated subscription ID for user ${existingUser.email}: ${subscription.id}`
              );
            }
          }

          // If still not found, try to get customer details from Stripe
          if (!existingUser && subscription.customer) {
            try {
              const customer = await stripe.customers.retrieve(
                subscription.customer
              );
              if (customer && !customer.deleted && customer.email) {
                existingUser = await prisma.user.findFirst({
                  where: { email: customer.email },
                  select: { id: true, email: true },
                });

                if (existingUser) {
                  // Update user with Stripe customer and subscription data
                  await prisma.user.update({
                    where: { id: existingUser.id },
                    data: {
                      stripeCustomerId: subscription.customer,
                      stripeSubscriptionId: subscription.id,
                    },
                  });
                  console.log(
                    `Connected existing user ${existingUser.email} to Stripe subscription ${subscription.id}`
                  );
                }
              }
            } catch (customerError) {
              console.error(
                "Error retrieving customer from Stripe:",
                customerError
              );
            }
          }

          if (existingUser) {
            const currentPeriodEndTimestamp = getCurrentPeriodEnd(subscription);
            const periodEndDate = safeConvertToDate(currentPeriodEndTimestamp);

            // Determine user type based on subscription status
            let userType: "FREE" | "PREMIUM" = "FREE";

            // Only set to PREMIUM if subscription is active or trialing
            if (
              subscription.status === "active" ||
              subscription.status === "trialing"
            ) {
              userType = "PREMIUM";
            }

            // Log the status change for debugging
            console.log(
              `Subscription ${subscription.id} status: ${subscription.status}, setting user type to: ${userType}`
            );

            if (periodEndDate) {
              await prisma.user.update({
                where: { id: existingUser.id },
                data: {
                  stripePriceId:
                    subscription.items?.data?.[0]?.price?.id || null,
                  stripeCurrentPeriodEnd: periodEndDate,
                  type: userType,
                  updatedAt: new Date(),
                },
              });
              console.log(
                "Successfully processed subscription update:",
                subscription.id,
                "User type set to:",
                userType
              );
            }
          } else {
            console.warn(
              "User not found for subscription update after all lookup attempts:",
              subscription.id,
              "Customer:",
              subscription.customer
            );

            // Optional: Create a database record of orphaned subscriptions for admin review
            // You could implement a separate table to track these cases
          }
        } catch (error) {
          console.error("Error processing subscription update:", error);
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as any;
        console.log(
          "Processing invoice payment succeeded:",
          invoice.id,
          "Billing reason:",
          invoice.billing_reason,
          "Has subscription:",
          !!invoice.subscription
        );

        // Handle subscription-related invoice payments (excluding initial subscription creation)
        if (invoice.subscription) {
          const billingReason = invoice.billing_reason;

          // Skip only the initial subscription creation, but process renewals and cycles
          if (billingReason === "subscription_create") {
            console.log(
              "Skipping initial subscription creation invoice:",
              invoice.id
            );
          } else {
            try {
              // Retrieve subscription with expanded fields
              const subscription = await stripe.subscriptions.retrieve(
                invoice.subscription,
                {
                  expand: ["items.data.price", "customer"],
                }
              );

              const existingUser = await prisma.user.findFirst({
                where: { stripeSubscriptionId: subscription.id },
                select: { id: true, email: true },
              });

              if (existingUser) {
                const currentPeriodEndTimestamp =
                  getCurrentPeriodEnd(subscription);
                const periodEndDate = safeConvertToDate(
                  currentPeriodEndTimestamp
                );

                if (periodEndDate) {
                  await prisma.user.update({
                    where: { id: existingUser.id },
                    data: {
                      stripePriceId:
                        subscription.items?.data?.[0]?.price?.id || null,
                      stripeCurrentPeriodEnd: periodEndDate,
                      type: "PREMIUM",
                      updatedAt: new Date(),
                    },
                  });
                  console.log(
                    `Successfully processed ${billingReason} payment for subscription:`,
                    subscription.id,
                    "User:",
                    existingUser.email
                  );
                } else {
                  console.error(
                    "Invalid period end date for subscription:",
                    subscription.id
                  );
                }
              } else {
                console.warn(
                  "User not found for invoice payment subscription:",
                  subscription.id
                );
              }
            } catch (error) {
              console.error("Error processing invoice payment:", error);
            }
          }
        } else {
          console.log(
            "Invoice payment without subscription - likely one-time payment:",
            invoice.id
          );
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as any;
        console.log("Processing subscription deletion:", subscription.id);

        try {
          const existingUser = await prisma.user.findFirst({
            where: { stripeSubscriptionId: subscription.id },
            select: { id: true },
          });

          if (existingUser) {
            await prisma.user.update({
              where: { stripeSubscriptionId: subscription.id },
              data: {
                stripeSubscriptionId: null,
                stripePriceId: null,
                stripeCurrentPeriodEnd: null,
                type: "FREE",
                updatedAt: new Date(),
              },
            });
            console.log(
              "Successfully processed subscription deletion:",
              subscription.id
            );
          } else {
            console.warn(
              "User not found for subscription deletion:",
              subscription.id
            );
          }
        } catch (error) {
          console.error("Error processing subscription deletion:", error);
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as any;
        console.log("Processing invoice payment failed:", invoice.id);

        if (invoice.subscription) {
          try {
            // Check subscription status after payment failure
            const subscription = await stripe.subscriptions.retrieve(
              invoice.subscription
            );

            const existingUser = await prisma.user.findFirst({
              where: { stripeSubscriptionId: subscription.id },
              select: { id: true },
            });

            if (existingUser) {
              // If subscription is past_due, incomplete, or canceled, downgrade user
              if (
                subscription.status === "past_due" ||
                subscription.status === "incomplete" ||
                subscription.status === "canceled" ||
                subscription.status === "unpaid"
              ) {
                await prisma.user.update({
                  where: { stripeSubscriptionId: subscription.id },
                  data: {
                    type: "FREE",
                    // Clear subscription data if subscription is completely failed
                    ...(subscription.status === "canceled" && {
                      stripeSubscriptionId: null,
                      stripePriceId: null,
                      stripeCurrentPeriodEnd: null,
                    }),
                    updatedAt: new Date(),
                  },
                });
                console.log(
                  "User downgraded to FREE due to payment failure:",
                  subscription.id,
                  "Status:",
                  subscription.status
                );
              }
            }
          } catch (error) {
            console.error("Error processing payment failure:", error);
          }
        }
        break;
      }

      case "customer.subscription.trial_will_end": {
        const subscription = event.data.object as any;
        console.log("Processing trial will end:", subscription.id);
        // Optional: Add trial ending logic or notifications
        break;
      }

      case "customer.subscription.paused": {
        const subscription = event.data.object as any;
        console.log("Processing subscription paused:", subscription.id);

        try {
          const existingUser = await prisma.user.findFirst({
            where: { stripeSubscriptionId: subscription.id },
            select: { id: true },
          });

          if (existingUser) {
            // Downgrade user when subscription is paused
            await prisma.user.update({
              where: { stripeSubscriptionId: subscription.id },
              data: {
                type: "FREE",
                updatedAt: new Date(),
              },
            });
            console.log(
              "User downgraded to FREE due to subscription pause:",
              subscription.id
            );
          }
        } catch (error) {
          console.error("Error processing subscription pause:", error);
        }
        break;
      }

      case "customer.subscription.resumed": {
        const subscription = event.data.object as any;
        console.log("Processing subscription resumed:", subscription.id);

        try {
          const existingUser = await prisma.user.findFirst({
            where: { stripeSubscriptionId: subscription.id },
            select: { id: true },
          });

          if (existingUser && subscription.status === "active") {
            const currentPeriodEndTimestamp = getCurrentPeriodEnd(subscription);
            const periodEndDate = safeConvertToDate(currentPeriodEndTimestamp);

            if (periodEndDate) {
              await prisma.user.update({
                where: { stripeSubscriptionId: subscription.id },
                data: {
                  type: "PREMIUM",
                  stripePriceId:
                    subscription.items?.data?.[0]?.price?.id || null,
                  stripeCurrentPeriodEnd: periodEndDate,
                  updatedAt: new Date(),
                },
              });
              console.log(
                "User upgraded to PREMIUM due to subscription resume:",
                subscription.id
              );
            }
          }
        } catch (error) {
          console.error("Error processing subscription resume:", error);
        }
        break;
      }

      // Handle additional events without action but with logging
      case "charge.succeeded":
      case "payment_method.attached":
      case "customer.created":
      case "customer.updated":
      case "payment_intent.succeeded":
      case "payment_intent.created":
      case "invoice.created":
      case "invoice.finalized":
      case "invoice.paid": {
        console.log(`Received ${event.type} event - no action needed`);
        break;
      }

      // Handle invoice events
      case "invoice.upcoming": {
        const invoice = event.data.object as any;
        console.log(`Upcoming invoice for customer: ${invoice.customer}`);
        // Optional: Add logic to notify users about upcoming charges
        break;
      }

      case "invoice.updated": {
        const invoice = event.data.object as any;
        console.log(
          `Invoice updated: ${invoice.id}, status: ${invoice.status}`
        );
        // Optional: Handle invoice status changes if needed
        break;
      }

      case "invoice_payment.paid": {
        const payment = event.data.object as any;
        console.log(`Invoice payment paid: ${payment.id}`);
        // This is typically handled by invoice.payment_succeeded, so no action needed
        break;
      }

      // Handle Stripe test clock events (used in testing)
      case "test_helpers.test_clock.advancing":
      case "test_helpers.test_clock.ready":
      case "test_helpers.test_clock.created":
      case "test_helpers.test_clock.deleted": {
        console.log(
          `Test clock event: ${event.type} - development/testing event`
        );
        break;
      }

      default:
        console.log("Unhandled Stripe webhook event type:", event.type);

        // Log additional details for debugging unhandled events
        const eventData = event.data.object as any;
        console.log("Event details:", {
          eventType: event.type,
          eventId: event.id,
          objectType: eventData.object,
          objectId: eventData.id,
          created: new Date(event.created * 1000).toISOString(),
        });

      // Optional: Store unhandled events for analysis
      // You could add a database table to track these for review
    }

    return new Response(null, { status: 200 });
  } catch (error) {
    console.error("Webhook error:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;

    console.error("Webhook error stack:", errorStack);

    return new Response(`Webhook Error: ${errorMessage}`, { status: 400 });
  } finally {
    // intentionally not disconnecting the global Prisma client here
  }
}
