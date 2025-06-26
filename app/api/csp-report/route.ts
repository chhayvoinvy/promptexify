import { NextRequest, NextResponse } from "next/server";

/**
 * Handle CSP violation reports
 * This endpoint receives CSP violation reports and logs them for security monitoring
 */
export async function POST(request: NextRequest) {
  try {
    const report = await request.json();

    console.log("[CSP VIOLATION]", JSON.stringify(report, null, 2));

    // In production, you might want to send this to a logging service
    // For now, just log to console for debugging

    return NextResponse.json({ status: "ok" }, { status: 200 });
  } catch (error) {
    console.error("[CSP REPORT ERROR]", error);
    return NextResponse.json(
      { error: "Failed to process report" },
      { status: 400 }
    );
  }
}

// Handle both POST and PUT for different CSP report formats
export const PUT = POST;

/**
 * Handle preflight requests
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
