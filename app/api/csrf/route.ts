import { createCSRFToken, getCSRFToken } from "@/lib/csrf";
import { NextResponse } from "next/server";

/**
 * GET /api/csrf-token
 * Returns a CSRF token for client-side requests
 */
export async function GET() {
  try {
    // Try to get existing token first
    let token = await getCSRFToken();

    // If no valid token exists, create a new one
    if (!token) {
      token = await createCSRFToken();
    }

    return NextResponse.json(
      {
        token,
        success: true,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("Error in CSRF token endpoint:", error);
    return NextResponse.json(
      {
        error: "Failed to generate CSRF token",
        success: false,
      },
      { status: 500 }
    );
  }
}

// POST method for creating a new token (force refresh)
export async function POST() {
  try {
    const token = await createCSRFToken();

    return NextResponse.json(
      {
        token,
        success: true,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("Error creating new CSRF token:", error);
    return NextResponse.json(
      {
        error: "Failed to create CSRF token",
        success: false,
      },
      { status: 500 }
    );
  }
}
