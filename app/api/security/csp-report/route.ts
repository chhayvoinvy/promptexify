import { NextRequest, NextResponse } from "next/server";
import { SECURITY_HEADERS } from "@/lib/sanitize";

/**
 * POST /api/security/csp-report
 * Receives Content Security Policy violation reports.
 * These reports are sent by the browser when the `report-uri` or `report-to` directive
 * in the CSP header is triggered.
 *
 * NOTE: Return 204 (No Content) according to the spec and avoid leaking
 * any details back to the client.
 */
export async function POST(request: NextRequest) {
  try {
    const report = await request.json().catch(() => null);

    // Persist or forward the report to your logging infrastructure here.
    // For now we just log to the console in non-production environments.
    if (process.env.NODE_ENV !== "production") {
      console.warn("[CSP-VIOLATION]", JSON.stringify(report, null, 2));
    }
  } catch (error) {
    // Swallow errors – we never want this endpoint to break the page load.
    if (process.env.NODE_ENV !== "production") {
      console.error("Failed to handle CSP report", error);
    }
  }

  // Respond with 204 – required by CSP spec for report endpoints.
  return new NextResponse(null, {
    status: 204,
    headers: SECURITY_HEADERS,
  });
}
