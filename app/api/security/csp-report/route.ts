import { NextRequest, NextResponse } from "next/server";
import { SECURITY_HEADERS } from "@/lib/security/sanitize";

interface CSPViolationReport {
  "csp-report": {
    "document-uri": string;
    "referrer": string;
    "violated-directive": string;
    "effective-directive": string;
    "original-policy": string;
    "disposition": string;
    "blocked-uri": string;
    "line-number"?: number;
    "column-number"?: number;
    "source-file"?: string;
    "status-code": number;
    "script-sample"?: string;
  };
}

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
    const report = await request.json().catch(() => null) as CSPViolationReport | null;

    if (report && report["csp-report"]) {
      const violation = report["csp-report"];
      
      // Enhanced logging for better debugging
      if (process.env.NODE_ENV !== "production") {
        console.warn("🚨 [CSP-VIOLATION] Content Security Policy violation detected:");
        console.warn(`📍 Page: ${violation["document-uri"]}`);
        console.warn(`🚫 Directive: ${violation["violated-directive"]}`);
        console.warn(`🔗 Blocked URI: ${violation["blocked-uri"]}`);
        
        if (violation["script-sample"]) {
          console.warn(`📝 Script Sample: ${violation["script-sample"]}`);
          
          // Try to calculate hash for the script sample to help with debugging
          try {
            const encoder = new TextEncoder();
            const data = encoder.encode(violation["script-sample"]);
            const hashBuffer = await crypto.subtle.digest("SHA-256", data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashBase64 = btoa(String.fromCharCode(...hashArray));
            const hash = `'sha256-${hashBase64}'`;
            console.warn(`🔑 Calculated Hash: ${hash}`);
            console.warn(`💡 Add this hash to CSP_HASHES.SCRIPTS in lib/csp.ts`);
          } catch (hashError) {
            console.error("Failed to calculate hash for script sample:", hashError);
          }
        }
        
        if (violation["line-number"] && violation["column-number"]) {
          console.warn(`📌 Location: Line ${violation["line-number"]}, Column ${violation["column-number"]}`);
        }
        
        if (violation["source-file"]) {
          console.warn(`📂 Source File: ${violation["source-file"]}`);
        }
        
        console.warn("Full Report:", JSON.stringify(report, null, 2));
        console.warn("═══════════════════════════════════════════════════════");
      }

      // In production, you might want to send this to your logging service
      // Example: await sendToLoggingService(violation);
      
      // Basic violation tracking for production
      if (process.env.NODE_ENV === "production") {
        // Log essential violation info without exposing sensitive details
        console.warn(`[CSP-VIOLATION] ${violation["violated-directive"]} - ${violation["blocked-uri"]}`);
      }
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
