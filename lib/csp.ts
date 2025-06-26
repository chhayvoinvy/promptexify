/**
 * Content Security Policy (CSP) utility with Next.js best practices
 * Implements nonce-based CSP for maximum security while supporting development
 */

import { NextRequest } from "next/server";

/**
 * Generate cryptographically secure nonce for CSP
 */
export function generateNonce(): string {
  // Use crypto.getRandomValues for browser-compatible secure random generation
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array)).replace(/[+/=]/g, (match) => {
    switch (match) {
      case "+":
        return "-";
      case "/":
        return "_";
      case "=":
        return "";
      default:
        return match;
    }
  });
}

/**
 * Get environment-specific CSP configuration
 */
function getCSPConfig() {
  const isDevelopment = process.env.NODE_ENV === "development";
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  // Base allowed sources
  const baseSources = {
    self: "'self'",
    data: "data:",
    blob: "blob:",
  };

  // Supabase domains
  const supabaseDomains = supabaseUrl
    ? [supabaseUrl, supabaseUrl.replace("https://", "wss://")]
    : ["https://*.supabase.co", "wss://*.supabase.co"];

  // Development-only sources
  const devSources = isDevelopment
    ? [
        "ws://localhost:*",
        "ws://127.0.0.1:*",
        "http://localhost:*",
        "http://127.0.0.1:*",
        "ws://[::1]:*",
        "http://[::1]:*",
        // Next.js development server
        "webpack://*",
      ]
    : [];

  return {
    isDevelopment,
    baseSources,
    supabaseDomains,
    devSources,
  };
}

/**
 * Generate CSP directives with nonce support
 */
export function generateCSPDirectives(nonce: string): Record<string, string> {
  const { isDevelopment, baseSources, supabaseDomains, devSources } =
    getCSPConfig();

  const baseDirectives = {
    "default-src": baseSources.self,
    "base-uri": baseSources.self,
    "form-action": baseSources.self,
    "frame-ancestors": "'none'",
    "object-src": "'none'",
    // Only add upgrade-insecure-requests in production
    ...(isDevelopment ? {} : { "upgrade-insecure-requests": "" }),
  };

  // Image sources - allow CDN and S3
  const imgSrc = [
    baseSources.self,
    baseSources.data,
    baseSources.blob,
    "https://*.s3.amazonaws.com",
    "https://s3.amazonaws.com",
    "https://*.cloudfront.net",
  ];

  // Font sources
  const fontSrc = [
    baseSources.self,
    baseSources.data,
    "https://fonts.gstatic.com",
  ];

  // Media sources
  const mediaSrc = [baseSources.self, baseSources.data, baseSources.blob];

  // Connect sources - API calls, WebSockets
  const connectSrc = [
    baseSources.self,
    ...supabaseDomains,
    // Stripe
    "https://api.stripe.com",
    "https://checkout.stripe.com",
    // AWS
    "https://*.s3.amazonaws.com",
    "https://s3.amazonaws.com",
    "https://*.cloudfront.net",
    // Google APIs
    "https://accounts.google.com",
    "https://www.googleapis.com",
    "https://securetoken.googleapis.com",
    ...devSources,
  ];

  // Worker sources
  const workerSrc = [baseSources.self, baseSources.blob];

  // Child sources (iframes)
  const childSrc = [
    baseSources.self,
    // Stripe checkout
    "https://checkout.stripe.com",
    "https://js.stripe.com",
    // Google One Tap
    "https://accounts.google.com",
  ];

  // Manifest source
  const manifestSrc = [baseSources.self];

  if (isDevelopment) {
    // Development CSP - very permissive for Next.js dev mode
    return {
      ...baseDirectives,
      "script-src": [
        baseSources.self,
        `'nonce-${nonce}'`,
        "'unsafe-inline'", // Required for Next.js dev mode
        "'unsafe-eval'", // Required for Next.js dev mode and HMR
        "'wasm-unsafe-eval'", // For WASM support
        // Additional dev domains
        "webpack://*",
        "data:",
      ].join(" "),
      "style-src": [
        baseSources.self,
        `'nonce-${nonce}'`,
        "'unsafe-inline'", // Required for Next.js dev mode and styled-components
        "'unsafe-hashes'", // For inline event handlers in dev
        "data:",
      ].join(" "),
      "img-src": imgSrc.join(" "),
      "font-src": fontSrc.join(" "),
      "media-src": mediaSrc.join(" "),
      "connect-src": connectSrc.join(" "),
      "worker-src": workerSrc.join(" "),
      "child-src": childSrc.join(" "),
      "manifest-src": manifestSrc.join(" "),
    };
  } else {
    // Production CSP - strict and secure
    return {
      ...baseDirectives,
      "script-src": [
        baseSources.self,
        `'nonce-${nonce}'`,
        "'strict-dynamic'", // Allow scripts loaded by nonce to load additional scripts
        "'wasm-unsafe-eval'", // For WASM support
        // Stripe
        "https://js.stripe.com",
        // Google One Tap
        "https://accounts.google.com",
        "https://www.gstatic.com",
        // Vercel analytics
        "https://vitals.vercel-analytics.com",
      ].join(" "),
      "style-src": [
        baseSources.self,
        `'nonce-${nonce}'`,
        // Google Fonts and external styles
        "https://fonts.googleapis.com",
      ].join(" "),
      "img-src": imgSrc.join(" "),
      "font-src": fontSrc.join(" "),
      "media-src": mediaSrc.join(" "),
      "connect-src": connectSrc.join(" "),
      "worker-src": workerSrc.join(" "),
      "child-src": childSrc.join(" "),
      "frame-src": childSrc.join(" "), // Same as child-src for iframe compatibility
      "manifest-src": manifestSrc.join(" "),
      // Add report URI for CSP violations in production
      "report-uri": "/api/csp-report",
      "report-to": "csp-violations",
    };
  }
}

/**
 * Generate CSP header value
 */
export function generateCSPHeader(nonce: string): string {
  const directives = generateCSPDirectives(nonce);
  return Object.entries(directives)
    .map(([directive, value]) => `${directive} ${value}`)
    .join("; ");
}

/**
 * Get CSP nonce from request headers (set by middleware)
 */
export function getCSPNonce(request: NextRequest): string | null {
  return request.headers.get("x-nonce") || null;
}

/**
 * Generate reporting endpoints for CSP violations (production only)
 */
export function generateReportingEndpoints(): string | null {
  if (process.env.NODE_ENV !== "production" || !process.env.CSP_REPORT_URI) {
    return null;
  }

  return JSON.stringify({
    "csp-violations": {
      url: process.env.CSP_REPORT_URI,
      max_age: 86400,
    },
  });
}

/**
 * Validate CSP configuration
 */
export function validateCSPConfig(): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (process.env.NODE_ENV === "production") {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      errors.push("NEXT_PUBLIC_SUPABASE_URL is required for production CSP");
    }

    if (!process.env.CSP_REPORT_URI) {
      console.warn(
        "CSP_REPORT_URI not set - CSP violations will not be reported"
      );
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * CSP configuration object for easy export
 */
export const CSP_CONFIG = {
  generateNonce,
  generateCSPDirectives,
  generateCSPHeader,
  getCSPNonce,
  generateReportingEndpoints,
  validateCSPConfig,
};
