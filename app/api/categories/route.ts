import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getAllCategories } from "@/lib/content";

export async function GET() {
  try {
    // Authentication check
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Role check - allow both ADMIN and USER
    if (user.userData?.role !== "ADMIN" && user.userData?.role !== "USER") {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // Fetch categories
    const categories = await getAllCategories();

    return NextResponse.json(categories);
  } catch (error) {
    console.error("Categories API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 }
    );
  }
}
