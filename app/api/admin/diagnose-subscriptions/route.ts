import { NextResponse } from "next/server";
import { diagnoseOrphanedSubscriptions } from "@/lib/subscription";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    // Check if user is authenticated and is an admin
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    if (user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    // Run the orphaned subscription diagnosis
    const result = await diagnoseOrphanedSubscriptions();

    return NextResponse.json({
      success: true,
      message: `Found ${result.totalFound} orphaned subscriptions`,
      orphanedSubscriptions: result.orphanedSubscriptions,
      totalFound: result.totalFound,
      recommendations:
        result.totalFound > 0
          ? [
              "Review orphaned subscriptions to identify sync issues",
              "Check if customers exist in your database with different email addresses",
              "Consider implementing webhook replay for missed events",
              "Verify webhook endpoint configuration",
            ]
          : [
              "No orphaned subscriptions found - all subscriptions are properly synced",
            ],
    });
  } catch (error) {
    console.error("Error diagnosing subscriptions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
