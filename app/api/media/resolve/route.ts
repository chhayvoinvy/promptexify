import { NextRequest, NextResponse } from "next/server";
import { resolveMediaUrl, resolveMediaUrls } from "@/lib/image/path";
import { z } from "zod";
import { rateLimits, getClientIdentifier, getRateLimitHeaders } from "@/lib/security/limits";
import { SECURITY_HEADERS } from "@/lib/security/sanitize";

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientId = getClientIdentifier(request);
    const rateLimitResult = await rateLimits.mediaResolve(clientId);

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: "Too many media resolution requests. Please try again later.",
          retryAfter: Math.ceil(
            (rateLimitResult.resetTime - Date.now()) / 1000
          ),
        },
        {
          status: 429,
          headers: {
            ...SECURITY_HEADERS,
            ...getRateLimitHeaders(rateLimitResult),
            "Retry-After": String(
              Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
            ),
          },
        }
      );
    }

    const bodySchema = z.object({
      paths: z.array(z.string().min(1)).max(50).nonempty("paths array required"), // Limit to 50 paths per request
    });

    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          details: parsed.error.errors.map((e) => ({
            field: e.path.join("."),
            message: e.message,
          })),
        },
        { 
          status: 400,
          headers: SECURITY_HEADERS,
        }
      );
    }

    const { paths } = parsed.data;

    // Handle single path
    if (paths.length === 1) {
      const resolvedUrl = await resolveMediaUrl(paths[0]);
      return NextResponse.json(
        { url: resolvedUrl },
        { headers: SECURITY_HEADERS }
      );
    }

    // Handle multiple paths
    const resolvedUrls = await resolveMediaUrls(paths);
    return NextResponse.json(
      { urls: resolvedUrls },
      { headers: SECURITY_HEADERS }
    );
  } catch (error) {
    console.error("Error resolving media URLs:", error);
    return NextResponse.json(
      { error: "Failed to resolve media URLs" },
      { 
        status: 500,
        headers: SECURITY_HEADERS,
      }
    );
  }
}
