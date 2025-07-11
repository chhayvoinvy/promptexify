import { NextRequest } from "next/server";
import { CSPViolationHandler } from "@/lib/security/csp";

interface CSPViolationReport {
  "csp-report": {
    "document-uri": string;
    "violated-directive": string;
    "blocked-uri"?: string;
    "script-sample"?: string;
    "style-sample"?: string;
    "source-file"?: string;
    "line-number"?: number;
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
        
        // NEW: Automated violation analysis
        try {
          const analysis = await CSPViolationHandler.analyzeViolation(violation);
          console.warn(`🔍 Analysis: ${analysis.type}`);
          console.warn(`💡 Suggested Fix: ${analysis.suggestedFix}`);
          
          if (analysis.hash) {
            console.warn(`🔑 Generated Hash: ${analysis.hash}`);
          }
          
          if (analysis.domain) {
            console.warn(`🌐 Domain: ${analysis.domain}`);
          }
          
          // Generate configuration snippet
          const configSnippet = CSPViolationHandler.generateConfigSnippet(analysis);
          console.warn(`📝 Config Snippet:\n${configSnippet}`);
          
        } catch (analysisError) {
          console.error("Failed to analyze CSP violation:", analysisError);
        }
        
        if (violation["script-sample"]) {
          console.warn(`📝 Script Sample: ${violation["script-sample"]}`);
        }
        
        if (violation["style-sample"]) {
          console.warn(`🎨 Style Sample: ${violation["style-sample"]}`);
        }
      }

      // Log violation for monitoring (production)
      if (process.env.NODE_ENV === "production") {
        console.warn(`[CSP-VIOLATION] ${violation["violated-directive"]} on ${violation["document-uri"]}`);
      }
    }
  } catch (error) {
    // Log error but don't expose details to client
    console.error("[CSP-REPORT] Error processing violation report:", error);
  }

  // Always return 204 No Content as per CSP spec
  return new Response(null, { status: 204 });
}
