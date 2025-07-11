import { NextRequest } from "next/server";

// CSRF Protection
export class CSRFProtection {
  private static readonly CSRF_TOKEN_LENGTH = 32;
  private static readonly CSRF_COOKIE_NAME =
    process.env.NODE_ENV === "production" ? "csrf-token-secure" : "csrf-token";
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
   * Set CSRF token in secure cookie with improved reliability
   */
  static async setToken(token: string): Promise<void> {
    try {
      const { cookies } = await import("next/headers");
      const cookieStore = await cookies();
      const isProduction = process.env.NODE_ENV === "production";

      // Use more reliable cookie options
      const cookieOptions = {
        httpOnly: true,
        secure: isProduction,
        sameSite: "strict" as const,
        path: "/",
        maxAge: 60 * 60 * 24, // 24 hours
      };

      // Set primary cookie
      cookieStore.set(this.CSRF_COOKIE_NAME, token, cookieOptions);

      // Set backup cookie for reliability (with different name)
      const backupCookieName = `${this.CSRF_COOKIE_NAME}-backup`;
      cookieStore.set(backupCookieName, token, cookieOptions);

      // In development, also set a debug cookie without httpOnly for debugging
      if (!isProduction) {
        cookieStore.set(`${this.CSRF_COOKIE_NAME}-debug`, token, {
          ...cookieOptions,
          httpOnly: false,
        });
      }

      console.log(
        `[CSRF] Token set successfully with cookie name: ${this.CSRF_COOKIE_NAME}`
      );
    } catch (error) {
      console.error("[CSRF] Failed to set token:", error);
      throw error;
    }
  }

  /**
   * Get CSRF token from cookie with improved reliability and fallbacks
   */
  static async getTokenFromCookie(): Promise<string | null> {
    try {
      const { cookies } = await import("next/headers");
      const cookieStore = await cookies();
      const isProduction = process.env.NODE_ENV === "production";

      // Try primary cookie first
      let token = cookieStore.get(this.CSRF_COOKIE_NAME)?.value || null;

      // Try backup cookie if primary not found
      if (!token) {
        const backupCookieName = `${this.CSRF_COOKIE_NAME}-backup`;
        token = cookieStore.get(backupCookieName)?.value || null;
      }

      // In development, try debug cookie as final fallback
      if (!token && !isProduction) {
        token =
          cookieStore.get(`${this.CSRF_COOKIE_NAME}-debug`)?.value || null;
      }

      // if (!token) {
      //   console.warn(
      //     `[CSRF] No token found in cookies. Checked: ${this.CSRF_COOKIE_NAME}, ${this.CSRF_COOKIE_NAME}-backup`
      //   );
      //   if (!isProduction) {
      //     console.warn(
      //       `[CSRF] Also checked debug cookie: ${this.CSRF_COOKIE_NAME}-debug`
      //     );
      //   }
      // } else {
      //   console.log(`[CSRF] Token retrieved successfully from cookie`);
      // }

      return token;
    } catch (error) {
      console.error("[CSRF] Failed to get token from cookie:", error);
      return null;
    }
  }

  /**
   * Get CSRF token from request headers
   */
  static getTokenFromHeaders(request: NextRequest): string | null {
    const token = request.headers.get(this.CSRF_HEADER_NAME);
    // if (token) {
    //   console.log("[CSRF] Token found in request headers");
    // } else {
    //   console.warn("[CSRF] No token found in request headers");
    // }
    return token;
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
   * Validate CSRF token with improved error handling and recovery
   */
  static async validateToken(submittedToken: string | null): Promise<boolean> {
    if (!submittedToken) {
      console.warn("[SECURITY] CSRF token missing from request");
      return false;
    }

    const cookieToken = await this.getTokenFromCookie();

    // If no cookie token found, try to generate a new one for recovery
    if (!cookieToken) {
      console.warn(
        "[SECURITY] CSRF validation failed: missing stored token, attempting recovery"
      );

      try {
        // Try to generate a new token and set it
        const newToken = this.generateToken();
        await this.setToken(newToken);
        console.log("[SECURITY] Generated new CSRF token for session recovery");

        // Since we just generated a new token, the submitted token won't match
        // Return false but with a more helpful message
        console.warn(
          "[SECURITY] CSRF validation failed: token regenerated, client needs to refresh token"
        );
        return false;
      } catch (error) {
        console.error("[SECURITY] Failed to recover CSRF token:", error);
        return false;
      }
    }

    try {
      // Use timing-safe comparison to prevent timing attacks
      // Edge Runtime compatible implementation
      const isValid = await this.timingSafeEqual(submittedToken, cookieToken);

      if (!isValid) {
        console.warn("[SECURITY] CSRF validation failed: token mismatch");
        console.log(
          `[SECURITY] Submitted token length: ${submittedToken.length}, Cookie token length: ${cookieToken.length}`
        );
      } else {
        console.log("[SECURITY] CSRF validation successful");
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
   * Get or create CSRF token for the current session with retry logic
   */
  static async getOrCreateToken(): Promise<string> {
    try {
      let token = await this.getTokenFromCookie();

      if (!token) {
        // console.log("[CSRF] No existing token found, generating new one");
        token = this.generateToken();
        await this.setToken(token);

        // Verify the token was set successfully
        // const verifyToken = await this.getTokenFromCookie();
      //   if (!verifyToken) {
      //     console.warn(
      //       "[CSRF] Token verification failed after setting, but continuing with generated token"
      //     );
      //   } else {
      //     console.log("[CSRF] Token set and verified successfully");
      //   }
      // } else {
      //   console.log("[CSRF] Retrieved existing token from cookie");
      }

      return token;
    } catch (error) {
      console.error("[CSRF] Error in getOrCreateToken:", error);
      // Fallback: return a generated token even if cookie operations fail
      const fallbackToken = this.generateToken();
      console.warn("[CSRF] Using fallback token due to cookie error");
      return fallbackToken;
    }
  }

  /**
   * Health check for CSRF token system
   * Returns information about token status and potential issues
   */
  static async healthCheck(): Promise<{
    hasToken: boolean;
    tokenAge?: number;
    cookieIssues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    try {
      const token = await this.getTokenFromCookie();
      const hasToken = !!token;

      if (!hasToken) {
        issues.push("No CSRF token found in cookies");
        recommendations.push("Try refreshing the page");
        recommendations.push("Check if cookies are enabled");
      }

      // Check cookie settings
      const isProduction = process.env.NODE_ENV === "production";
      if (isProduction && !process.env.HTTPS) {
        issues.push("HTTPS not detected in production");
        recommendations.push("Ensure HTTPS is properly configured");
      }

      return {
        hasToken,
        cookieIssues: issues,
        recommendations,
      };
    } catch (error) {
      issues.push(
        `Cookie access error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
      recommendations.push("Check browser console for detailed errors");

      return {
        hasToken: false,
        cookieIssues: issues,
        recommendations,
      };
    }
  }

  /**
   * Clear all CSRF tokens (for debugging/recovery)
   */
  static async clearTokens(): Promise<void> {
    try {
      const { cookies } = await import("next/headers");
      const cookieStore = await cookies();
      const isProduction = process.env.NODE_ENV === "production";

      // Clear primary cookies
      cookieStore.delete(this.CSRF_COOKIE_NAME);
      cookieStore.delete(`${this.CSRF_COOKIE_NAME}-backup`);

      if (!isProduction) {
        cookieStore.delete(`${this.CSRF_COOKIE_NAME}-debug`);
      }

      console.log("[CSRF] All tokens cleared successfully");
    } catch (error) {
      console.error("[CSRF] Failed to clear tokens:", error);
      throw error;
    }
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

// CSP Hash Constants for known inline content
const CSP_HASHES = {
  // Script hashes for known inline scripts
  SCRIPTS: [
    "'sha256-42kZcIwrKnihEZTada4V2Yh9EaONiZ1iuXhdtLJ43N8='", // Next.js or Analytics inline script
    "'sha256-ID6G40XuH1AK/MCsb3ABJl//kzckVM/gkevy3dZpwFI='", // GA inline script
    "'sha256-iOJJUj3iCtIlZA3XJK8dd9RNwaBp8ncWIqualJK/HUWSM='", // Missing inline script causing CSP violation
  ],
  // Style hashes for Next.js and library inline styles
  STYLES: [
    "'sha256-47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU='", // Empty style
    "'sha256-x85h1XW/2dJE1/4ZlPDVBP4T1CrmEDhiFyPqP+DSWBM='", // Next.js style
    "'sha256-KpSV7LuPYEu58+3u9LJr9v5Drm0uIKEv0h3u/+NVNm8='", // React inline style
    "'sha256-dkh56gAXwLNJwJkQM7pk7ARvLt6jnCYX4BrpsIFTxqI='", // Component style
    "'sha256-Mv4McvPit7qlZWszmT/z0tW/0B8ovLjbHgAYqhyu7mE='", // UI library style
    "'sha256-lwQz+ARlP3Bxlcabv9wCZkYN0WBKz7AI92HngvUijoM='", // Chart library style
    "'sha256-zlqnbDt84zf1iSefLU/ImC54isoprH/MRiVZGskwexk='", // Animation style
    "'sha256-mf/UeN4J7RwvsimPJmmeFQFxedoyNr/nO9Q1L1vCL7k='", // Theme style
    "'sha256-CIxDM5jnsGiKqXs2v7NKCY5MzdR9gu6TtiMJrDw29AY='", // Dynamic style
    "'sha256-skqujXORqzxt1aE0NNXxujEanPTX6raoqSscTV/Ww/Y='", // Responsive style
    "'sha256-42kZcIwrKnihEZTada4V2Yh9EaONiZ1iuXhdtLJ43N8='", // Additional style
    "'sha256-8qxaJlBHRbX6fXl4iM449sWYeJajq1ieb9K3hFRSWJc='", // Google One Tap
    "'sha256-8VvECQWAC1C2TMUane5XP25qXs61T8zAOUgUJxMUq0M='", // Google Accounts inline style
    "'sha256-nzTgYzXYDNe6BAHiiI7NNlfK8n/auuOAhh2t92YvuXo='", // Another Google inline style
    "'sha256-YIjArHm2rkb5J7hX9lUM1bnQ3Kp61MTfluMGkuyKwDw='", // And another one
    "'sha256-4IpjyPW3T1vEyCZLF8hGr7A9zNijDZPldrwecZUymac='", // GA inline style
    "'sha256-4nPxjXDX1GDRouae5/Jv7v3/IA131wwqhdOQm9OdtWw='", // New inline style
    "'sha256-MtxTLcyxVEJFNLEIqbVTaqR4WWr0+lYSZ78AzGmNsuA='", // New inline style
    "'sha256-PhrR5O1xWiklTp5YfH8xWeig83Y/rhbrdb5whLn1pSg='", // New inline style
    "'sha256-1OjyRYLAOH1vhXLUN4bBHal0rWxuwBDBP220NNc0CNU='", // New inline style
    "'sha256-uHMRMH/uk4ERGIkgk2bUAqw+i1tFFbeiOQTApmnK3t4='", // New inline style
    "'sha256-0/TUJR2e8LYCBRhRHap5/yeWLDibr3I9vkHArk3DX9I='", // Sanity inline style 1
    "'sha256-H2xDirDcQVcpRmgDFGCE6G5DXZx14hy+aINR3qqO7Ms='", // Sanity inline style 2
  ],
};

// NEW: Report URI for collecting CSP violations
const CSP_REPORT_URI = "/api/security/csp-report";

export class CSPNonce {


  /**
   * Generate a cryptographically secure nonce using Web Crypto API
   * Compatible with Edge Runtime - using only Web APIs
   */
  static generate(): string {
    try {
      // Use crypto.randomUUID() and convert to base64 safely
      const uuid = crypto.randomUUID();
      // Convert string to base64 directly using btoa
      const nonce = btoa(uuid);
      
      // Validate nonce format (base64 encoded, reasonable length)
      if (nonce.length < 16 || nonce.length > 64) {
        throw new Error("Generated nonce has invalid length");
      }
      
      return nonce;
    } catch (error) {
      console.error("[CSP] Failed to generate nonce:", error);
      // Fallback: generate a simpler nonce using timestamp and random values
      const fallback = btoa(`${Date.now()}-${Math.random()}`);
      console.warn("[CSP] Using fallback nonce generation");
      return fallback;
    }
  }

  /**
   * Get nonce from request headers (for Server Components)
   * Note: This method should be imported and used only in Server Components
   * Gracefully handles static rendering contexts where headers are not available
   */
  static async getFromHeaders(): Promise<string | null> {
    try {
      // This will be imported from next/headers only in server components
      const { headers } = await import("next/headers");
      const headersList = await headers();
      const nonce = headersList.get("x-nonce");
      
      // Validate nonce if present
      if (nonce && (nonce.length < 16 || nonce.length > 64)) {
        console.warn("[CSP] Invalid nonce format in headers, ignoring");
        return null;
      }
      
      return nonce;
    } catch (error) {
      // Check if this is a static rendering error (expected during build)
      const isStaticRenderingError = error instanceof Error && 
        (error.message.includes("Dynamic server usage") || 
         error.message.includes("couldn't be rendered statically") ||
         error.message.includes("used `headers`"));
      
      if (isStaticRenderingError) {
        // This is expected during static generation - don't log as error
        return null;
      }
      
      // Log unexpected errors only
      console.error("[CSP] Failed to get nonce from headers:", error);
      return null;
    }
  }

  /**
   * Get nonce for client components (via cookie)
   * Note: This method should be imported and used only in Server Components
   */
  static async getFromCookie(): Promise<string | null> {
    try {
      // This will be imported from next/headers only in server components
      const { cookies } = await import("next/headers");
      const cookieStore = await cookies();
      const nonceCookie = cookieStore.get("csp-nonce");
      const nonce = nonceCookie?.value || null;
      
      // Validate nonce if present
      if (nonce && (nonce.length < 16 || nonce.length > 64)) {
        console.warn("[CSP] Invalid nonce format in cookie, ignoring");
        return null;
      }
      
      return nonce;
    } catch (error) {
      console.error("[CSP] Failed to get nonce from cookie:", error);
      return null;
    }
  }

  /**
   * Get nonce for client components from window global (synchronous)
   * This is the preferred method for client components
   */
  static getFromWindow(): string | null {
    if (typeof window === "undefined") return null;
    
    try {
      const nonce = (window as typeof window & { __CSP_NONCE__?: string }).__CSP_NONCE__ || null;
      
      // Validate nonce if present
      if (nonce && (nonce.length < 16 || nonce.length > 64)) {
        console.warn("[CSP] Invalid nonce format in window global, ignoring");
        return null;
      }
      
      return nonce;
    } catch (error) {
      console.error("[CSP] Failed to get nonce from window:", error);
      return null;
    }
  }

  /**
   * Get nonce safely - handles both static and dynamic contexts
   * Returns null during static rendering without errors
   * Use this in layouts and components that might be statically rendered
   */
  static async getFromHeadersSafe(): Promise<string | null> {
    try {
      // Try to get headers - this will fail during static generation
      const { headers } = await import("next/headers");
      const headersList = await headers();
      const nonce = headersList.get("x-nonce");
      
      // Validate nonce if present
      if (nonce && (nonce.length < 16 || nonce.length > 64)) {
        return null;
      }
      
      return nonce;
    } catch (error) {
      // Check if this is a static rendering error (expected during build)
      const isStaticRenderingError = error instanceof Error && 
        (error.message.includes("Dynamic server usage") || 
         error.message.includes("couldn't be rendered statically") ||
         error.message.includes("used `headers`"));
      
      if (isStaticRenderingError) {
        // This is expected during static generation - return null silently
        return null;
      }
      
      // Log unexpected errors
      console.error("[CSP] Unexpected error getting nonce:", error);
      return null;
    }
  }

  /**
   * Calculate SHA-256 hash for inline content (for development/debugging)
   * Use this to generate hashes for new inline scripts or styles
   *
   * @param content - The inline content to hash
   * @returns Promise<string> - The SHA-256 hash in CSP format
   *
   * Example:
   * const hash = await CSPNonce.calculateHash('console.log("test");');
   * console.log(hash); // 'sha256-...'
   */
  static async calculateHash(content: string): Promise<string> {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(content);
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashBase64 = btoa(String.fromCharCode(...hashArray));
      return `'sha256-${hashBase64}'`;
    } catch (error) {
      console.error("[CSP] Failed to calculate hash:", error);
      throw new Error("Hash calculation failed");
    }
  }

  /**
   * Utility to calculate hashes for multiple inline contents at once
   * Useful for batch processing and debugging
   */
  static async calculateMultipleHashes(contents: string[]): Promise<Array<{content: string; hash: string}>> {
    const results = await Promise.allSettled(
      contents.map(async (content) => ({
        content,
        hash: await this.calculateHash(content),
      }))
    );

    return results
      .filter((result): result is PromiseFulfilledResult<{content: string; hash: string}> => 
        result.status === 'fulfilled'
      )
      .map(result => result.value);
  }

  /**
   * Debug helper to find missing hashes from known content patterns
   * Call this in development to identify new inline scripts/styles
   */
  static async debugMissingHashes(): Promise<void> {
    if (process.env.NODE_ENV === "production") {
      console.warn("[CSP] debugMissingHashes should only be used in development");
      return;
    }

    const commonInlineContents = [
      // Common Next.js inline scripts
      `window.__CSP_NONCE__ = "${this.generate()}";`,
      `window.__CSP_NONCE__ = null; // Development mode - no CSP nonces`,
      // Common analytics patterns
      `gtag('config', 'GA_MEASUREMENT_ID');`,
      `gtag('js', new Date());`,
      // Common theme scripts
      `document.documentElement.classList.add('dark');`,
      `document.documentElement.classList.remove('dark');`,
      // Vercel Analytics patterns
      `window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };`,
    ];

    console.log("[CSP] Calculating hashes for common inline content patterns:");
    const hashes = await this.calculateMultipleHashes(commonInlineContents);
    
    hashes.forEach(({content, hash}) => {
      console.log(`Content: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`);
      console.log(`Hash: ${hash}`);
      console.log("---");
    });
  }
}

// Security Headers Utility
export class SecurityHeaders {
  /**
   * Get comprehensive security headers with environment-aware policies
   */
  static getSecurityHeaders(nonce?: string, request?: Request): Record<string, string> {
    const config = EnvironmentDetector.getCSPConfig();
    const isLocalhost = request ? EnvironmentDetector.isLocalhost(request) : false;

    const headers: Record<string, string> = {
      // Prevent MIME type sniffing
      "X-Content-Type-Options": "nosniff",

      // Enable XSS protection
      "X-XSS-Protection": "1; mode=block",

      // Referrer policy
      "Referrer-Policy": "strict-origin-when-cross-origin",
    };

    // Production-only strict headers
    if (config.isProduction) {
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

    // CSP handling based on environment
    if (config.isLocalDevelopment) {
      // Local development - use very permissive CSP
      // console.log("[CSP] Using permissive CSP for local development");
      headers["Content-Security-Policy"] = this.generateCSP("");
    } else if (config.isProduction && nonce) {
      // Production with strict CSP
      headers["Content-Security-Policy"] = this.generateCSP(nonce);
    }

    return headers;
  }

  /**
   * Generate Content Security Policy with environment-aware policies
   */
  static generateCSP(nonce: string): string {
    const config = EnvironmentDetector.getCSPConfig();

    try {
      if (config.isProduction) {
        // Validate nonce for production
        if (!nonce || nonce.length < 16) {
          console.error("[CSP] Invalid or missing nonce in production mode");
          // Don't fall back to unsafe-inline in production
          throw new Error("CSP nonce required in production");
        }

        // Use the new CSP Policy Builder for cleaner, more maintainable code
        return CSPPolicyBuilder.createProductionPolicy(nonce);
      } else if (config.isLocalDevelopment) {
        // Local development - use very permissive CSP
        return CSPPolicyBuilder.createMinimalDevelopmentPolicy();
      } else {
        // Use the new CSP Policy Builder for development
        return CSPPolicyBuilder.createDevelopmentPolicy();
      }
    } catch (error) {
      console.error("[CSP] Failed to generate CSP policy:", error);
      
      // Emergency fallback CSP - very restrictive but functional
      const fallbackCSP = [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline'", // Only for emergency
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' blob: data: https:",
        "font-src 'self' https://fonts.gstatic.com",
        "connect-src 'self'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
      ];
      
      console.warn("[CSP] Using emergency fallback CSP");
      return fallbackCSP.join("; ");
    }
  }
}

// NEW: Automated Hash Generation Utility
export class CSPHashGenerator {
  /**
   * Generate SHA-256 hash for inline content
   */
  static async generateHash(content: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashBase64 = btoa(String.fromCharCode(...hashArray));
    return `'sha256-${hashBase64}'`;
  }

  /**
   * Generate hashes for multiple content pieces
   */
  static async generateHashes(contents: string[]): Promise<string[]> {
    const hashes = await Promise.all(
      contents.map(content => this.generateHash(content))
    );
    return hashes;
  }

  /**
   * Validate if a hash is properly formatted
   */
  static isValidHash(hash: string): boolean {
    return /^'sha256-[A-Za-z0-9+/=]+'$/.test(hash);
  }
}

// NEW: Dynamic CSP Policy Builder
export class CSPPolicyBuilder {
  private directives: Map<string, Set<string>> = new Map();
  private nonce?: string;

  constructor(nonce?: string) {
    this.nonce = nonce;
  }

  /**
   * Add a directive with values
   */
  addDirective(directive: string, ...values: string[]): this {
    if (!this.directives.has(directive)) {
      this.directives.set(directive, new Set());
    }
    values.forEach(value => this.directives.get(directive)!.add(value));
    return this;
  }

  /**
   * Add script sources with automatic nonce handling
   */
  addScriptSources(...sources: string[]): this {
    const scriptSources = ['self'];
    
    if (this.nonce) {
      scriptSources.push(`'nonce-${this.nonce}'`);
      scriptSources.push("'strict-dynamic'");
    }
    
    scriptSources.push(...sources);
    return this.addDirective('script-src', ...scriptSources);
  }

  /**
   * Add style sources with automatic nonce handling
   */
  addStyleSources(...sources: string[]): this {
    const styleSources = ['self'];
    
    if (this.nonce) {
      styleSources.push(`'nonce-${this.nonce}'`);
      styleSources.push("'unsafe-hashes'");
    }
    
    styleSources.push(...sources);
    return this.addDirective('style-src', ...styleSources);
  }

  /**
   * Add hashes to a directive
   */
  addHashes(directive: string, hashes: string[]): this {
    return this.addDirective(directive, ...hashes);
  }

  /**
   * Build the final CSP string
   */
  build(): string {
    const directives: string[] = [];
    
    for (const [directive, values] of this.directives) {
      const valuesArray = Array.from(values);
      directives.push(`${directive} ${valuesArray.join(' ')}`);
    }
    
    return directives.join('; ');
  }

  /**
   * Create a production-ready CSP policy
   */
  static createProductionPolicy(nonce: string, options?: {
    additionalScripts?: string[];
    additionalStyles?: string[];
    additionalDomains?: Record<string, string[]>;
  }): string {
    const builder = new CSPPolicyBuilder(nonce);
    
    // Base directives
    builder
      .addDirective('default-src', 'self')
      .addScriptSources(
        ...CSP_HASHES.SCRIPTS,
        'https://www.googletagmanager.com',
        'https://www.google-analytics.com',
        'https://accounts.google.com',
        'https://vitals.vercel-insights.com',
        'https://va.vercel-scripts.com',
        'https://securepubads.g.doubleclick.net',
        'https://pagead2.googlesyndication.com',
        'https://*.sanity.io',
        ...(options?.additionalScripts || [])
      )
      .addStyleSources(
        ...CSP_HASHES.STYLES,
        'https://fonts.googleapis.com',
        'https://accounts.google.com',
        'https://*.sanity.io',
        'https://pagead2.googlesyndication.com',
        ...(options?.additionalStyles || [])
      )
      .addDirective('img-src', 'self', 'blob:', 'data:', 'https:', 'https://*.s3.amazonaws.com', 'https://*.cloudfront.net', 'https://cdn.sanity.io/', 'https://pagead2.googlesyndication.com')
      .addDirective('font-src', 'self', 'https://fonts.gstatic.com')
      .addDirective('connect-src', 'self', 'https://api.stripe.com', 'https://*.supabase.co', 'wss://*.supabase.co', 'https://*.s3.amazonaws.com', 'https://*.cloudfront.net', 'https://vitals.vercel-analytics.com', 'wss://vitals.vercel-analytics.com', 'https://accounts.google.com', 'https://*.api.sanity.io', 'wss://*.api.sanity.io', 'https://pagead2.googlesyndication.com')
      .addDirective('frame-src', 'self', 'https://accounts.google.com', 'https://googleads.g.doubleclick.net', 'https://tpc.googlesyndication.com', 'https://pagead2.googlesyndication.com', 'https://*.sanity.io')
      .addDirective('media-src', 'self', 'blob:', 'data:', 'https://*.s3.amazonaws.com', 'https://*.cloudfront.net')
      .addDirective('object-src', 'none')
      .addDirective('base-uri', 'self')
      .addDirective('form-action', 'self')
      .addDirective('frame-ancestors', 'none')
      .addDirective('upgrade-insecure-requests')
      .addDirective('report-uri', CSP_REPORT_URI)
      .addDirective('worker-src', 'self', 'blob:');

    // Add additional domains if provided
    if (options?.additionalDomains) {
      for (const [directive, domains] of Object.entries(options.additionalDomains)) {
        builder.addDirective(directive, ...domains);
      }
    }

    return builder.build();
  }

  /**
   * Create a development CSP policy
   */
  static createDevelopmentPolicy(): string {
    const builder = new CSPPolicyBuilder();
    
    return builder
      .addDirective('default-src', 'self', 'unsafe-inline', 'unsafe-eval')
      .addDirective('script-src', 'self', 'unsafe-eval', 'unsafe-inline', 'https://www.googletagmanager.com', 'https://www.google-analytics.com', 'https://accounts.google.com', 'https://vitals.vercel-insights.com', 'https://va.vercel-scripts.com', 'localhost:*', 'ws:', 'wss:', 'blob:', 'http:', 'https:')
      .addDirective('style-src', 'self', 'unsafe-inline', 'https://fonts.googleapis.com', 'https://accounts.google.com', 'localhost:*', 'blob:', 'http:', 'https:')
      .addDirective('img-src', 'self', 'blob:', 'data:', 'https:', 'http:', 'https://*.s3.amazonaws.com', 'https://*.cloudfront.net', 'localhost:*', '*')
      .addDirective('font-src', 'self', 'https://fonts.gstatic.com', 'data:', 'blob:', 'http:', 'https:')
      .addDirective('connect-src', 'self', 'https://api.stripe.com', 'https://*.supabase.co', 'https://*.s3.amazonaws.com', 'https://*.cloudfront.net', 'https://vitals.vercel-analytics.com', 'https://*.api.sanity.io', 'wss://*.api.sanity.io', 'localhost:*', 'ws:', 'wss:', 'http:', 'https:', 'blob:')
      .addDirective('media-src', 'self', 'blob:', 'data:', 'https:', 'http:', 'https://*.s3.amazonaws.com', 'https://*.cloudfront.net', 'localhost:*', '*')
      .addDirective('object-src', 'self', 'blob:', 'http:', 'https:')
      .addDirective('base-uri', 'self')
      .addDirective('form-action', 'self')
      .addDirective('frame-ancestors', 'self', 'localhost:*')
      .addDirective('report-uri', CSP_REPORT_URI)
      .build();
  }

  /**
   * Create a minimal development CSP policy (when CSP is mostly disabled)
   */
  static createMinimalDevelopmentPolicy(): string {
    // Ultra-permissive CSP for local development - allows everything
    return "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; script-src * 'unsafe-inline' 'unsafe-eval' data: blob:; style-src * 'unsafe-inline' data: blob:; img-src * data: blob:; font-src * data: blob:; connect-src * data: blob: ws: wss:; media-src * data: blob:; object-src * data: blob:; frame-src * data: blob:; frame-ancestors *; worker-src * data: blob:; base-uri *; form-action *; report-uri " + CSP_REPORT_URI;
  }
}

// NEW: Enhanced CSP Violation Handler
export class CSPViolationHandler {
  /**
   * Analyze CSP violation and suggest fixes
   */
  static async analyzeViolation(violation: {
    'violated-directive': string;
    'blocked-uri'?: string;
    'script-sample'?: string;
    'style-sample'?: string;
  }): Promise<{
    type: 'script' | 'style' | 'domain' | 'other';
    suggestedFix: string;
    hash?: string;
    domain?: string;
  }> {
    const { 'violated-directive': directive, 'blocked-uri': uri, 'script-sample': script, 'style-sample': style } = violation;

    // Handle script violations
    if (directive === 'script-src' && script) {
      const hash = await CSPHashGenerator.generateHash(script);
      return {
        type: 'script',
        suggestedFix: `Add hash to CSP_HASHES.SCRIPTS: ${hash}`,
        hash
      };
    }

    // Handle style violations
    if (directive === 'style-src' && style) {
      const hash = await CSPHashGenerator.generateHash(style);
      return {
        type: 'style',
        suggestedFix: `Add hash to CSP_HASHES.STYLES: ${hash}`,
        hash
      };
    }

    // Handle domain violations
    if (uri && !uri.startsWith('data:') && !uri.startsWith('blob:')) {
      const domain = this.extractDomain(uri);
      if (domain) {
        return {
          type: 'domain',
          suggestedFix: `Add domain to ${directive}: ${domain}`,
          domain
        };
      }
    }

    return {
      type: 'other',
      suggestedFix: `Review ${directive} directive for blocked content`
    };
  }

  /**
   * Extract domain from URI
   */
  private static extractDomain(uri: string): string | null {
    try {
      const url = new URL(uri);
      return url.origin;
    } catch {
      return null;
    }
  }

  /**
   * Generate CSP configuration snippet
   */
  static generateConfigSnippet(analysis: ReturnType<typeof CSPViolationHandler.analyzeViolation> extends Promise<infer T> ? T : never): string {
    switch (analysis.type) {
      case 'script':
        return `// Add to CSP_HASHES.SCRIPTS array:
${analysis.hash}`;
      
      case 'style':
        return `// Add to CSP_HASHES.STYLES array:
${analysis.hash}`;
      
      case 'domain':
        return `// Add to ${analysis.suggestedFix}`;
      
      default:
        return analysis.suggestedFix;
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

// NEW: Environment Detection Utility
// Automatically detects development vs production environments
// and applies appropriate CSP policies:
// - Local development: Ultra-permissive CSP (allows everything)
// - Production: Strict CSP with nonces and hashes
export class EnvironmentDetector {
  /**
   * Check if we're in a development environment
   */
  static isDevelopment(): boolean {
    return process.env.NODE_ENV === "development";
  }

  /**
   * Check if we're in a production environment
   */
  static isProduction(): boolean {
    return process.env.NODE_ENV === "production";
  }

  /**
   * Check if we're running in Edge Runtime
   */
  static isEdgeRuntime(): boolean {
    return process.env.NEXT_RUNTIME === "edge" ||
           process.env.VERCEL_REGION !== undefined ||
           (typeof globalThis !== "undefined" && "EdgeRuntime" in globalThis);
  }

  /**
   * Check if we're running locally (localhost)
   */
  static isLocalhost(request?: Request): boolean {
    if (request) {
      const url = new URL(request.url);
      return url.hostname === "localhost" || 
             url.hostname === "127.0.0.1" || 
             url.hostname.startsWith("192.168.") ||
             url.hostname.startsWith("10.") ||
             url.hostname.startsWith("172.");
    }
    return false;
  }

  /**
   * Check if we're in a local development environment that needs permissive CSP
   */
  static isLocalDevelopment(): boolean {
    return this.isDevelopment() || 
           process.env.NODE_ENV === "development" ||
           process.env.VERCEL_ENV === "development" ||
           process.env.NEXT_PUBLIC_VERCEL_ENV === "development";
  }

  /**
   * Get environment-specific CSP configuration
   */
  static getCSPConfig() {
    return {
      isDevelopment: this.isDevelopment(),
      isProduction: this.isProduction(),
      isEdgeRuntime: this.isEdgeRuntime(),
      isLocalDevelopment: this.isLocalDevelopment(),
    };
  }
}
