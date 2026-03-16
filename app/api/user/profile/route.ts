import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { SECURITY_HEADERS } from "@/lib/security/sanitize";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401, headers: SECURITY_HEADERS }
      );
    }

    return NextResponse.json(user.userData, { headers: SECURITY_HEADERS });
  } catch (error) {
    console.error("User profile API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch user profile" },
      { status: 500, headers: SECURITY_HEADERS }
    );
  }
}

export async function POST() {
  return NextResponse.json(
    { error: "Method not allowed" },
    { status: 405, headers: SECURITY_HEADERS }
  );
}

export async function PUT() {
  return NextResponse.json(
    { error: "Method not allowed" },
    { status: 405, headers: SECURITY_HEADERS }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: "Method not allowed" },
    { status: 405, headers: SECURITY_HEADERS }
  );
}
