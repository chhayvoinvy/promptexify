import { NextResponse } from "next/server";
import { checkAndHandleExpiredSubscriptions } from "@/lib/subscription";
import { getCurrentUser } from "@/lib/auth";

export async function POST() {
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

    // Run the expired subscription check
    const result = await checkAndHandleExpiredSubscriptions();

    return NextResponse.json({
      success: true,
      message: `Processed ${result.processedCount} expired subscriptions`,
      processedCount: result.processedCount,
      errors: result.errors,
    });
  } catch (error) {
    console.error("Error checking expired subscriptions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
