import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "./lib/supabase/middleware";
import { SecurityEvents, getClientIP, sanitizeUserAgent } from "./lib/audit";

export async function middleware(request: NextRequest) {
  try {
    // Handle Supabase session
    const response = await updateSession(request);

    // Log successful state-changing requests for monitoring
    if (["POST", "PUT", "DELETE", "PATCH"].includes(request.method)) {
      const pathname = request.nextUrl.pathname;

      // Don't log internal/sensitive endpoints
      const skipLogging = ["/api/webhooks/", "/api/upload/"];

      if (!skipLogging.some((path) => pathname.startsWith(path))) {
        console.log(
          `[SECURITY] ${request.method} ${pathname} - IP: ${getClientIP(
            request
          )} - User-Agent: ${sanitizeUserAgent(
            request.headers.get("user-agent")
          )}`
        );
      }
    }

    return response;
  } catch (error) {
    console.error("Middleware error:", error);

    // Log security incident
    await SecurityEvents.inputValidationFailure(
      undefined,
      "middleware",
      "middleware_error",
      getClientIP(request)
    );

    return NextResponse.json(
      {
        error: "Internal server error",
        code: "MIDDLEWARE_ERROR",
      },
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "X-Content-Type-Options": "nosniff",
        },
      }
    );
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - Static assets (images, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
