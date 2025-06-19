import { NextRequest, NextResponse } from "next/server";
import { incrementPostView } from "@/lib/content";
import { headers } from "next/headers";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get client IP and user agent for tracking
    const headersList = await headers();
    const forwarded = headersList.get("x-forwarded-for");
    const realIp = headersList.get("x-real-ip");
    const userAgent = headersList.get("user-agent");

    // Get the client IP
    const clientIp = forwarded?.split(",")[0] || realIp || "127.0.0.1";

    // Increment view count
    await incrementPostView(id, clientIp, userAgent || undefined);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error tracking view:", error);
    return NextResponse.json(
      { error: "Failed to track view" },
      { status: 500 }
    );
  }
}
