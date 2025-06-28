import { NextRequest } from "next/server";

// CSRF Protection
export class CSRFProtection {
  private static readonly CSRF_TOKEN_LENGTH = 32;
  private static readonly CSRF_COOKIE_NAME =
    process.env.NODE_ENV === "production" ? "__Host-csrf-token" : "csrf-token";
  private static readonly CSRF_HEADER_NAME = "x-csrf-token";

  /**
   * Generate a cryptographically secure CSRF token using Web Crypto API
   * Compatible with Edge Runtime
   */
  static generateToken(): string {
    // Generate multiple UUIDs for better entropy
    const uuid1 = crypto.randomUUID().replace(/-/g, "");
    const uuid2 = crypto.randomUUID().replace(/-/g, "");
    const combined = uuid1 + uuid2;

    // Convert to base64url using btoa directly
    const base64 = btoa(combined);

    // Convert to base64url format
    return base64
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "")
      .slice(0, 43);
  }

  /**
   * Set CSRF token in secure cookie
   */
  static async setToken(token: string): Promise<void> {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const isProduction = process.env.NODE_ENV === "production";

    // Try multiple cookie strategies for better compatibility
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax" as const,
      path: "/",
      maxAge: 60 * 60 * 24, // 24 hours
    };

    cookieStore.set(this.CSRF_COOKIE_NAME, token, cookieOptions);

    // In development, also try setting without httpOnly for debugging
    if (!isProduction) {
      cookieStore.set(`${this.CSRF_COOKIE_NAME}-debug`, token, {
        ...cookieOptions,
        httpOnly: false,
      });
    }
  }

  /**
   * Get CSRF token from cookie
   */
  static async getTokenFromCookie(): Promise<string | null> {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const isProduction = process.env.NODE_ENV === "production";

    let token = cookieStore.get(this.CSRF_COOKIE_NAME)?.value || null;

    // In development, try fallback to debug cookie if main cookie not found
    if (!token && !isProduction) {
      token = cookieStore.get(`${this.CSRF_COOKIE_NAME}-debug`)?.value || null;
    }

    return token;
  }

  /**
   * Get CSRF token from request headers
   */
  static getTokenFromHeaders(request: NextRequest): string | null {
    return request.headers.get(this.CSRF_HEADER_NAME);
  }

  /**
   * Get CSRF token from form data
   */
  static getTokenFromFormData(formData: FormData): string | null {
    return formData.get("csrf_token") as string | null;
  }

  /**
   * Timing-safe string comparison using Web Crypto API
   * Compatible with Edge Runtime
   */
  private static async timingSafeEqual(a: string, b: string): Promise<boolean> {
    if (a.length !== b.length) {
      return false;
    }

    // Use Web Crypto API for timing-safe comparison
    const encoder = new TextEncoder();
    const aBytes = encoder.encode(a);
    const bBytes = encoder.encode(b);

    // Use HMAC with a random key to ensure timing safety
    const key = await crypto.subtle.generateKey(
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const [signatureA, signatureB] = await Promise.all([
      crypto.subtle.sign("HMAC", key, aBytes),
      crypto.subtle.sign("HMAC", key, bBytes),
    ]);

    // Compare the signatures
    const sigA = new Uint8Array(signatureA);
    const sigB = new Uint8Array(signatureB);

    if (sigA.length !== sigB.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < sigA.length; i++) {
      result |= sigA[i] ^ sigB[i];
    }

    return result === 0;
  }

  /**
   * Validate CSRF token
   */
  static async validateToken(submittedToken: string | null): Promise<boolean> {
    if (!submittedToken) {
      console.warn("[SECURITY] CSRF token missing");
      return false;
    }

    const cookieToken = await this.getTokenFromCookie();
    if (!cookieToken) {
      console.warn("[SECURITY] CSRF validation failed: missing stored token");
      return false;
    }

    try {
      // Use timing-safe comparison to prevent timing attacks
      // Edge Runtime compatible implementation
      const isValid = await this.timingSafeEqual(submittedToken, cookieToken);

      if (!isValid) {
        console.warn("[SECURITY] CSRF validation failed: token mismatch");
      }

      return isValid;
    } catch (error) {
      console.error(
        "[SECURITY] CSRF validation error:",
        error instanceof Error ? error.message : "Unknown error"
      );
      return false;
    }
  }

  /**
   * Get or create CSRF token for the current session
   */
  static async getOrCreateToken(): Promise<string> {
    let token = await this.getTokenFromCookie();

    if (!token) {
      token = this.generateToken();
      await this.setToken(token);
    }

    return token;
  }
}

// CSP Nonce Management
/**
 * Content Security Policy (CSP) Implementation
 *
 * This implementation follows Next.js best practices for CSP with nonces:
 *
 * 1. Middleware generates unique nonces for each request in production
 * 2. Nonces are passed via headers (x-nonce) for Server Components
 * 3. Nonces are set in window.__CSP_NONCE__ for Client Components
 * 4. Development mode uses 'unsafe-inline' for easier development
 * 5. Production mode uses strict CSP with nonces and hashes for known inline styles
 *
 * Usage in components:
 * - Server Components: const nonce = await CSPNonce.getFromHeaders()
 * - Client Components: const nonce = CSPNonce.getFromWindow() or useNonce() hook
 * - Always apply nonce to dynamic <script> and <style> tags
 *
 * Static inline styles are handled via SHA-256 hashes in the CSP policy.
 */
export class CSPNonce {
  /**
   * Generate a cryptographically secure nonce using Web Crypto API
   * Compatible with Edge Runtime - using only Web APIs
   */
  static generate(): string {
    // Use crypto.randomUUID() and convert to base64 safely
    const uuid = crypto.randomUUID();
    // Convert string to base64 directly using btoa
    return btoa(uuid);
  }

  /**
   * Get nonce from request headers (for Server Components)
   * Note: This method should be imported and used only in Server Components
   */
  static async getFromHeaders(): Promise<string | null> {
    // This will be imported from next/headers only in server components
    const { headers } = await import("next/headers");
    const headersList = await headers();
    return headersList.get("x-nonce");
  }

  /**
   * Get nonce for client components (via cookie)
   * Note: This method should be imported and used only in Server Components
   */
  static async getFromCookie(): Promise<string | null> {
    // This will be imported from next/headers only in server components
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const nonceCookie = cookieStore.get("csp-nonce");
    return nonceCookie?.value || null;
  }

  /**
   * Get nonce for client components from window global (synchronous)
   * This is the preferred method for client components
   */
  static getFromWindow(): string | null {
    if (typeof window === "undefined") return null;
    return (
      (window as typeof window & { __CSP_NONCE__?: string }).__CSP_NONCE__ ||
      null
    );
  }
}

// Security Headers Utility
export class SecurityHeaders {
  /**
   * Get comprehensive security headers with environment-aware policies
   */
  static getSecurityHeaders(nonce?: string): Record<string, string> {
    const isProduction = process.env.NODE_ENV === "production";

    const headers: Record<string, string> = {
      // Prevent MIME type sniffing
      "X-Content-Type-Options": "nosniff",

      // Enable XSS protection
      "X-XSS-Protection": "1; mode=block",

      // Referrer policy
      "Referrer-Policy": "strict-origin-when-cross-origin",
    };

    // Production-only strict headers
    if (isProduction) {
      headers["X-Frame-Options"] = "DENY";
      headers["X-DNS-Prefetch-Control"] = "off";
      headers["Permissions-Policy"] =
        "camera=(), microphone=(), geolocation=()";
      headers["Strict-Transport-Security"] =
        "max-age=63072000; includeSubDomains; preload";
    } else {
      // Development-friendly headers
      headers["X-Frame-Options"] = "SAMEORIGIN"; // Allow iframe for dev tools
      headers["X-DNS-Prefetch-Control"] = "on"; // Allow DNS prefetch for faster dev
      // More permissive permissions policy for development
      headers["Permissions-Policy"] =
        "camera=(*), microphone=(*), geolocation=(*)";
    }

    // Add CSP header (with or without nonce based on environment)
    if (isProduction && nonce) {
      headers["Content-Security-Policy"] = this.generateCSP(nonce);
    } else if (!isProduction) {
      // In development, always add CSP (without nonce)
      headers["Content-Security-Policy"] = this.generateCSP("");
    }

    return headers;
  }

  /**
   * Generate Content Security Policy with environment-aware policies
   */
  static generateCSP(nonce: string): string {
    const isProduction = process.env.NODE_ENV === "production";

    if (isProduction) {
      // Strict production CSP with required hashes for inline styles
      const csp = [
        "default-src 'self'",
        `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://www.googletagmanager.com https://www.google-analytics.com https://accounts.google.com https://vitals.vercel-insights.com https://va.vercel-scripts.com`,
        // Updated style-src with hashes for Next.js and library inline styles
        `style-src 'self' 'nonce-${nonce}' 'unsafe-hashes' https://fonts.googleapis.com https://accounts.google.com 'sha256-47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU=' 'sha256-x85h1XW/2dJE1/4ZlPDVBP4T1CrmEDhiFyPqP+DSWBM=' 'sha256-KpSV7LuPYEu58+3u9LJr9v5Drm0uIKEv0h3u/+NVNm8=' 'sha256-dkh56gAXwLNJwJkQM7pk7ARvLt6jnCYX4BrpsIFTxqI=' 'sha256-Mv4McvPit7qlZWszmT/z0tW/0B8ovLjbHgAYqhyu7mE=' 'sha256-lwQz+ARlP3Bxlcabv9wCZkYN0WBKz7AI92HngvUijoM=' 'sha256-zlqnbDt84zf1iSefLU/ImC54isoprH/MRiVZGskwexk=' 'sha256-mf/UeN4J7RwvsimPJmmeFQFxedoyNr/nO9Q1L1vCL7k=' 'sha256-CIxDM5jnsGiKqXs2v7NKCY5MzdR9gu6TtiMJrDw29AY=' 'sha256-skqujXORqzxt1aE0NNXxujEanPTX6raoqSscTV/Ww/Y=' 'sha256-42kZcIwrKnihEZTada4V2Yh9EaONiZ1iuXhdtLJ43N8='`,
        "img-src 'self' blob: data: https: https://*.s3.amazonaws.com https://*.cloudfront.net",
        "font-src 'self' https://fonts.gstatic.com",
        "connect-src 'self' https://api.stripe.com https://*.supabase.co https://*.s3.amazonaws.com https://*.cloudfront.net https://vitals.vercel-analytics.com https://accounts.google.com",
        "frame-src 'self' https://accounts.google.com",
        "media-src 'self' blob: data: https://*.s3.amazonaws.com https://*.cloudfront.net",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
        "upgrade-insecure-requests",
      ];
      return csp.join("; ");
    } else {
      // Development-friendly CSP - No nonces in dev mode to allow 'unsafe-inline'
      const csp = [
        "default-src 'self' 'unsafe-inline' 'unsafe-eval'",
        // Very permissive script sources for development (Next.js needs this)
        "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com https://accounts.google.com https://vitals.vercel-insights.com https://va.vercel-scripts.com localhost:* ws: wss: blob:",
        // More permissive style sources for development
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com localhost:* blob:",
        "img-src 'self' blob: data: https: http: https://*.s3.amazonaws.com https://*.cloudfront.net localhost:*",
        "font-src 'self' https://fonts.gstatic.com data: blob:",
        // More permissive connect sources for development
        "connect-src 'self' https://api.stripe.com https://*.supabase.co https://*.s3.amazonaws.com https://*.cloudfront.net https://vitals.vercel-analytics.com localhost:* ws: wss: http: blob:",
        "media-src 'self' blob: data: https: http: https://*.s3.amazonaws.com https://*.cloudfront.net localhost:*",
        // Allow objects in development for debugging tools
        "object-src 'self' blob:",
        "base-uri 'self'",
        "form-action 'self'",
        // Allow framing in development for dev tools
        "frame-ancestors 'self' localhost:*",
        // Don't force HTTPS in development
      ];
      return csp.join("; ");
    }
  }
}

// CSRF validation decorator for server actions
export function withCSRFProtection<T extends unknown[], R>(
  action: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R> => {
    // Find FormData in arguments
    const formData = args.find((arg) => arg instanceof FormData) as
      | FormData
      | undefined;

    if (!formData) {
      throw new Error("CSRF protection requires FormData");
    }

    // Validate CSRF token
    const submittedToken = CSRFProtection.getTokenFromFormData(formData);
    const isValid = await CSRFProtection.validateToken(submittedToken);

    if (!isValid) {
      throw new Error("Invalid CSRF token");
    }

    // Remove CSRF token from FormData before processing
    formData.delete("csrf_token");

    return action(...args);
  };
}

// Server action error handling with security logging
export class SecureActionError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 400
  ) {
    super(message);
    this.name = "SecureActionError";
  }
}

export function handleSecureActionError(error: unknown): {
  error: string;
  code: string;
} {
  if (error instanceof SecureActionError) {
    return {
      error: error.message,
      code: error.code,
    };
  }

  // Log unexpected errors securely
  console.error("Unexpected server action error:", {
    message: error instanceof Error ? error.message : "Unknown error",
    timestamp: new Date().toISOString(),
  });

  return {
    error: "An unexpected error occurred. Please try again.",
    code: "INTERNAL_ERROR",
  };
}
