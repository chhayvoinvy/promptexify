/**
 * Manual Stripe Subscription Sync Script
 *
 * This script manually syncs the known Stripe subscriptions with your database
 * based on the data we found using MCP tools.
 */
import { PrismaClient } from "@/lib/generated/prisma";

const prisma = new PrismaClient();

// Known subscription data from MCP Stripe tools
const KNOWN_SUBSCRIPTIONS = [
  {
    id: "sub_1RdFvZ001THvdychGaydIoug",
    customer: "cus_SYMe7l0JgddwLA",
    status: "active",
    priceId: "price_1RYUST001THvdych5O8H8CjP", // Yearly plan
    currentPeriodEnd: new Date("2025-12-23T15:41:11.000Z"), // Approximate from timestamp 1782242471
  },
  {
    id: "sub_1RdFng001THvdychfKbNLHyc",
    customer: "cus_SYMWsTQnoBxtp5",
    status: "active",
    priceId: "price_1RYUST001THvdych5O8H8CjP", // Yearly plan
    currentPeriodEnd: new Date("2025-12-23T15:33:02.000Z"), // Approximate from timestamp 1782241982
  },
];

async function manualSync() {
  try {
    console.log("🔄 Starting manual Stripe subscription sync...");

    for (const sub of KNOWN_SUBSCRIPTIONS) {
      console.log(`\n🔍 Processing subscription: ${sub.id}`);
      console.log(`   Customer: ${sub.customer}`);
      console.log(`   Status: ${sub.status}`);
      console.log(`   Price ID: ${sub.priceId}`);
      console.log(`   Period End: ${sub.currentPeriodEnd.toISOString()}`);

      // First, try to find any existing user data for this customer
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { stripeCustomerId: sub.customer },
            { stripeSubscriptionId: sub.id },
          ],
        },
      });

      if (existingUser) {
        console.log(
          `✅ Found existing user: ${existingUser.email} (${existingUser.id})`
        );

        // Update their subscription data
        await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            stripeSubscriptionId: sub.id,
            stripeCustomerId: sub.customer,
            stripePriceId: sub.priceId,
            stripeCurrentPeriodEnd: sub.currentPeriodEnd,
            type: "PREMIUM",
          },
        });

        console.log(
          `🎉 Updated user ${existingUser.id} with subscription data`
        );
      } else {
        console.log(`⚠️  No existing user found for customer: ${sub.customer}`);
        console.log(
          `   You may need to manually link this subscription to a user`
        );
        console.log(`   Subscription ID: ${sub.id}`);
        console.log(`   Customer ID: ${sub.customer}`);
      }
    }

    // Display current status
    const allUsersWithSubs = await prisma.user.findMany({
      where: {
        stripeSubscriptionId: { not: null },
      },
      select: {
        id: true,
        email: true,
        name: true,
        type: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
        stripePriceId: true,
        stripeCurrentPeriodEnd: true,
      },
    });

    console.log(`\n📈 Final Status:`);
    console.log(
      `   Active Stripe subscriptions: ${KNOWN_SUBSCRIPTIONS.length}`
    );
    console.log(`   Users with subscription data: ${allUsersWithSubs.length}`);

    if (allUsersWithSubs.length > 0) {
      console.log(`\n👥 Users with subscriptions:`);
      allUsersWithSubs.forEach((user) => {
        console.log(`   - ${user.email || user.name} (${user.type})`);
        console.log(`     User ID: ${user.id}`);
        console.log(`     Subscription: ${user.stripeSubscriptionId}`);
        console.log(`     Customer: ${user.stripeCustomerId}`);
        console.log(`     Price: ${user.stripePriceId}`);
        console.log(
          `     Expires: ${user.stripeCurrentPeriodEnd?.toISOString()}`
        );
        console.log("");
      });
    }

    console.log(`\n✅ Manual sync completed!`);
  } catch (error) {
    console.error("❌ Error in manual sync:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if this file is executed directly
if (require.main === module) {
  manualSync()
    .then(() => {
      console.log("🎯 Manual sync process finished");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Manual sync process failed:", error);
      process.exit(1);
    });
}

export { manualSync };
