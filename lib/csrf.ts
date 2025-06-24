/**
 * CSRF Protection System
 * Prevents Cross-Site Request Forgery attacks
 */

import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import crypto from "crypto";

const CSRF_TOKEN_NAME = "csrf-token";
const CSRF_HEADER_NAME = "x-csrf-token";
const TOKEN_EXPIRY = 60 * 60 * 1000; // 1 hour in milliseconds

interface CSRFTokenData {
  token: string;
  expiry: number;
}

/**
 * Generate a cryptographically secure CSRF token
 */
export function generateCSRFToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Create CSRF token with expiry and store in httpOnly cookie
 */
export async function createCSRFToken(): Promise<string> {
  const token = generateCSRFToken();
  const expiry = Date.now() + TOKEN_EXPIRY;

  const tokenData: CSRFTokenData = {
    token,
    expiry,
  };

  const cookieStore = await cookies();

  // Store in httpOnly, secure cookie
  cookieStore.set(CSRF_TOKEN_NAME, JSON.stringify(tokenData), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: TOKEN_EXPIRY / 1000, // Convert to seconds
    path: "/",
  });

  return token;
}

/**
 * Validate CSRF token from request
 */
export async function validateCSRFToken(
  request: NextRequest
): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const storedTokenCookie = cookieStore.get(CSRF_TOKEN_NAME);

    if (!storedTokenCookie?.value) {
      return false;
    }

    const storedTokenData: CSRFTokenData = JSON.parse(storedTokenCookie.value);

    // Check if token has expired
    if (Date.now() > storedTokenData.expiry) {
      // Clean up expired token
      cookieStore.delete(CSRF_TOKEN_NAME);
      return false;
    }

    // Get token from header or form data
    let requestToken = request.headers.get(CSRF_HEADER_NAME);

    if (!requestToken) {
      // Try to get from form data for non-JSON requests
      try {
        const formData = await request.clone().formData();
        requestToken = formData.get("_csrf") as string;
      } catch {
        // Ignore if not form data
      }
    }

    if (!requestToken) {
      return false;
    }

    // Compare tokens using constant-time comparison
    return crypto.timingSafeEqual(
      Buffer.from(storedTokenData.token, "hex"),
      Buffer.from(requestToken, "hex")
    );
  } catch (error) {
    console.error("CSRF token validation error:", error);
    return false;
  }
}

/**
 * Get current CSRF token (for use in forms)
 */
export async function getCSRFToken(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const storedTokenCookie = cookieStore.get(CSRF_TOKEN_NAME);

    if (!storedTokenCookie?.value) {
      return null;
    }

    const storedTokenData: CSRFTokenData = JSON.parse(storedTokenCookie.value);

    // Check if token has expired
    if (Date.now() > storedTokenData.expiry) {
      cookieStore.delete(CSRF_TOKEN_NAME);
      return null;
    }

    return storedTokenData.token;
  } catch (error) {
    console.error("Error getting CSRF token:", error);
    return null;
  }
}

/**
 * Middleware to check CSRF token on state-changing requests
 */
export async function csrfProtection(request: NextRequest): Promise<boolean> {
  const method = request.method.toUpperCase();

  // Only check CSRF for state-changing methods
  if (!["POST", "PUT", "DELETE", "PATCH"].includes(method)) {
    return true;
  }

  // Skip CSRF check in development mode for easier development
  if (process.env.NODE_ENV === "development") {
    console.log(
      `[CSRF] Skipping CSRF check in development for ${method} ${request.nextUrl.pathname}`
    );
    return true;
  }

  // Skip CSRF check for API routes that use other authentication
  const pathname = request.nextUrl.pathname;
  const skipPaths = [
    "/api/webhooks/", // Webhooks use their own verification
    "/api/auth/", // Auth endpoints handle their own security
    "/api/csrf-token", // CSRF token endpoint itself
  ];

  if (skipPaths.some((path) => pathname.startsWith(path))) {
    return true;
  }

  try {
    return await validateCSRFToken(request);
  } catch (error) {
    console.error("CSRF validation error:", error);
    // In case of error, allow request in development, block in production
    return process.env.NODE_ENV !== "production";
  }
}

/**
 * React hook for CSRF protection (client-side)
 */
export function useCSRFToken() {
  return {
    getToken: async () => {
      const response = await fetch("/api/csrf-token");
      if (response.ok) {
        const data = await response.json();
        return data.token;
      }
      return null;
    },

    addToHeaders: (headers: HeadersInit = {}) => ({
      ...headers,
      [CSRF_HEADER_NAME]:
        document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')
          ?.content || "",
    }),

    addToFormData: (formData: FormData, token: string) => {
      formData.append("_csrf", token);
      return formData;
    },
  };
}

/**
 * Generate CSRF meta tag for HTML head
 */
export async function generateCSRFMetaTag(): Promise<string> {
  const token = (await getCSRFToken()) || (await createCSRFToken());
  return `<meta name="csrf-token" content="${token}" />`;
}
