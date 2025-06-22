import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getAllTags } from "@/lib/content";

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

    // Fetch tags
    const tags = await getAllTags();

    return NextResponse.json(tags);
  } catch (error) {
    console.error("Tags API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch tags" },
      { status: 500 }
    );
  }
}
