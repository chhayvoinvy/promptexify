/**
 * CSRF Protection System using JWT tokens
 * Prevents Cross-Site Request Forgery attacks using signed JWT tokens
 */

import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { SignJWT, jwtVerify, JWTPayload } from "jose";

const CSRF_TOKEN_NAME = "csrf-token";
const CSRF_HEADER_NAME = "x-csrf-token";
const TOKEN_EXPIRY = 60 * 60 * 1000; // 1 hour in milliseconds

interface CSRFPayload extends JWTPayload {
  purpose: "csrf";
  iat: number;
  exp: number;
}

/**
 * Get JWT secret key as Uint8Array for jose library
 * Priority: JWT_SECRET > AUTH_SECRET > SESSION_SECRET > default
 */
function getSecretKey(): Uint8Array {
  const secret =
    process.env.JWT_SECRET ||
    process.env.AUTH_SECRET ||
    process.env.SESSION_SECRET ||
    "default-csrf-secret-change-in-production";

  // Ensure minimum entropy for security
  if (secret.length < 32) {
    console.warn(
      "[CSRF] Warning: Secret key should be at least 32 characters for optimal security"
    );
  }

  return new TextEncoder().encode(secret);
}

/**
 * Generate a signed CSRF JWT token
 */
export async function generateCSRFToken(): Promise<string> {
  const secret = getSecretKey();
  const now = Math.floor(Date.now() / 1000);

  const token = await new SignJWT({
    purpose: "csrf",
    iat: now,
    exp: now + Math.floor(TOKEN_EXPIRY / 1000),
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(now)
    .setExpirationTime(now + Math.floor(TOKEN_EXPIRY / 1000))
    .sign(secret);

  return token;
}

/**
 * Verify a CSRF JWT token
 */
export async function verifyCSRFToken(token: string): Promise<boolean> {
  try {
    const secret = getSecretKey();

    const { payload } = await jwtVerify(token, secret, {
      algorithms: ["HS256"],
    });

    const csrfPayload = payload as CSRFPayload;

    // Verify this is a CSRF token
    if (csrfPayload.purpose !== "csrf") {
      return false;
    }

    // JWT library already checks expiration, but let's be explicit
    const now = Math.floor(Date.now() / 1000);
    if (csrfPayload.exp && csrfPayload.exp < now) {
      return false;
    }

    return true;
  } catch (error) {
    console.error("CSRF token verification error:", error);
    return false;
  }
}

/**
 * Create CSRF token and store in httpOnly cookie
 */
export async function createCSRFToken(): Promise<string> {
  const token = await generateCSRFToken();
  const cookieStore = await cookies();

  // Store in httpOnly, secure cookie
  cookieStore.set(CSRF_TOKEN_NAME, token, {
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

    // Verify both tokens are valid and match
    const [storedValid, requestValid] = await Promise.all([
      verifyCSRFToken(storedTokenCookie.value),
      verifyCSRFToken(requestToken),
    ]);

    if (!storedValid || !requestValid) {
      return false;
    }

    // For JWT tokens, we can compare them directly since they're signed
    return storedTokenCookie.value === requestToken;
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

    // Verify the token is still valid
    const isValid = await verifyCSRFToken(storedTokenCookie.value);
    if (!isValid) {
      cookieStore.delete(CSRF_TOKEN_NAME);
      return null;
    }

    return storedTokenCookie.value;
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
    "/api/csrf", // CSRF token endpoint itself
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
      const response = await fetch("/api/csrf");
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
  try {
    const token = await getCSRFToken();
    if (!token) {
      const newToken = await createCSRFToken();
      return `<meta name="csrf-token" content="${newToken}" />`;
    }
    return `<meta name="csrf-token" content="${token}" />`;
  } catch (error) {
    console.error("Error generating CSRF meta tag:", error);
    return "";
  }
}
