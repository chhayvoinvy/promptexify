/**
 * Content sanitization utilities to prevent XSS attacks
 * and ensure safe content handling
 */

// HTML entity mapping for basic sanitization
const HTML_ENTITIES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#x27;",
  "/": "&#x2F;",
  "`": "&#x60;",
  "=": "&#x3D;",
};

/**
 * Check if running in production environment
 */
function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

/**
 * Check if running in development environment
 */
function isDevelopment(): boolean {
  return process.env.NODE_ENV === "development";
}

/**
 * Escape HTML entities to prevent XSS
 */
export function escapeHtml(text: string): string {
  if (typeof text !== "string") {
    return String(text);
  }

  return text.replace(/[&<>"'`=\/]/g, (char) => HTML_ENTITIES[char] || char);
}

/**
 * Sanitize user input for safe database storage and display
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== "string") {
    return String(input);
  }

  return (
    input
      .trim()
      // Remove null bytes
      .replace(/\0/g, "")
      // Remove potential script tags
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      // Remove javascript: URLs
      .replace(/javascript:/gi, "")
      // Remove on* event handlers
      .replace(/\bon\w+\s*=/gi, "")
      // Remove data: URLs (except images)
      .replace(/data:(?!image\/)/gi, "data-blocked:")
      // Remove vbscript: URLs
      .replace(/vbscript:/gi, "")
      // Normalize whitespace
      .replace(/\s+/g, " ")
      .trim()
  );
}

/**
 * Sanitize and validate URLs
 */
export function sanitizeUrl(url: string): string | null {
  if (typeof url !== "string") {
    return null;
  }

  const trimmedUrl = url.trim();

  // Empty URL
  if (!trimmedUrl) {
    return null;
  }

  // Block dangerous protocols
  const dangerousProtocols = [
    "javascript:",
    "vbscript:",
    "file:",
    "ftp:",
    "data:",
  ];

  const lowerUrl = trimmedUrl.toLowerCase();
  for (const protocol of dangerousProtocols) {
    if (lowerUrl.startsWith(protocol)) {
      return null;
    }
  }

  // Only allow http, https, and relative URLs
  if (!/^(https?:\/\/|\/|#)/.test(trimmedUrl)) {
    return null;
  }

  // Basic URL validation
  try {
    if (trimmedUrl.startsWith("http")) {
      new URL(trimmedUrl);
    }
    return trimmedUrl;
  } catch {
    return null;
  }
}

/**
 * Sanitize filename for safe file uploads
 */
export function sanitizeFilename(filename: string): string {
  if (typeof filename !== "string") {
    return "file";
  }

  return (
    filename
      .trim()
      // Remove path traversal attempts
      .replace(/\.{2,}/g, "")
      .replace(/[\/\\]/g, "")
      // Remove null bytes
      .replace(/\0/g, "")
      // Keep only safe characters
      .replace(/[^a-zA-Z0-9\-_\.]/g, "_")
      // Prevent hidden files
      .replace(/^\./, "_")
      // Limit length
      .substring(0, 100)
      .trim() || "file"
  );
}

/**
 * Sanitize content for markdown/rich text
 * Enhanced to handle more XSS vectors and malicious content
 */
export function sanitizeContent(content: string): string {
  if (typeof content !== "string") {
    return String(content);
  }

  return (
    content
      .trim()
      // Remove null bytes and control characters
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
      // Remove script tags and their content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      // Remove iframe tags
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
      // Remove object and embed tags
      .replace(/<(object|embed)\b[^<]*(?:(?!<\/\1>)<[^<]*)*<\/\1>/gi, "")
      // Remove form elements
      .replace(
        /<(form|input|button|textarea|select)\b[^<]*(?:(?!<\/\1>)<[^<]*)*<\/\1>/gi,
        ""
      )
      // Remove dangerous event handlers
      .replace(/\bon\w+\s*=/gi, "")
      // Remove javascript: URLs
      .replace(/javascript:/gi, "")
      // Remove vbscript: URLs
      .replace(/vbscript:/gi, "")
      // Remove data: URLs except for images
      .replace(/data:(?!image\/)[^"'\s]*/gi, "")
      // Remove style attributes with expressions
      .replace(/style\s*=\s*["'][^"']*expression\s*\([^"']*["']/gi, "")
      // Remove meta refresh
      .replace(/<meta\b[^>]*http-equiv\s*=\s*["']?refresh["']?[^>]*>/gi, "")
      // Remove base tags
      .replace(/<base\b[^>]*>/gi, "")
      // Limit extremely long content
      .substring(0, 100000)
  );
}

/**
 * Sanitize tag names with strict validation
 * Only allows a-z, A-Z, 0-9, spaces, hyphens, and underscores
 */
export function sanitizeTagName(tagName: string): string {
  if (typeof tagName !== "string") {
    return "";
  }

  return (
    tagName
      .trim()
      // Remove null bytes and control characters
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
      // Only allow alphanumeric, spaces, hyphens, and underscores
      .replace(/[^a-zA-Z0-9\s\-_]/g, "")
      // Normalize whitespace
      .replace(/\s+/g, " ")
      .trim()
      // Limit length
      .substring(0, 50)
  );
}

/**
 * Sanitize and generate tag slug with strict validation
 * Only allows a-z, 0-9, and hyphens as specified in requirements
 */
export function sanitizeTagSlug(input: string): string {
  if (typeof input !== "string") {
    return "";
  }

  const slug = input
    .trim()
    .toLowerCase()
    // Remove null bytes and control characters
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    // Replace spaces and underscores with hyphens
    .replace(/[\s_]+/g, "-")
    // Only allow a-z, 0-9, and hyphens
    .replace(/[^a-z0-9-]/g, "")
    // Remove consecutive hyphens
    .replace(/-+/g, "-")
    // Remove leading and trailing hyphens
    .replace(/^-+|-+$/g, "")
    // Limit length
    .substring(0, 50);

  return slug;
}

/**
 * Validate tag slug format according to requirements
 * Only a-z, 0-9, and hyphens allowed
 */
export function validateTagSlug(slug: string): boolean {
  if (typeof slug !== "string" || slug.length === 0) {
    return false;
  }

  // Check if slug matches the required format
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return false;
  }

  // Check if slug starts or ends with hyphen
  if (slug.startsWith("-") || slug.endsWith("-")) {
    return false;
  }

  // Check for consecutive hyphens
  if (slug.includes("--")) {
    return false;
  }

  // Check length
  if (slug.length > 50) {
    return false;
  }

  return true;
}

/**
 * Advanced content sanitization for user-generated HTML content
 * Use this for content that may legitimately contain some HTML
 */
export function sanitizeRichContent(content: string): string {
  if (typeof content !== "string") {
    return String(content);
  }

  // Note: Only specific safe HTML tags are allowed (hardcoded in regex patterns below)
  // Allowed tags: p, br, strong, em, u, h1-h6, ul, ol, li, blockquote, a
  // Allowed attributes: href, title, alt

  return (
    content
      .trim()
      // Remove null bytes and control characters
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
      // Remove all script tags
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      // Remove dangerous tags
      .replace(
        /<(iframe|object|embed|form|input|button|textarea|select|meta|base|link|style)\b[^>]*(?:\/>|>.*?<\/\1>)/gi,
        ""
      )
      // Remove event handlers
      .replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, "")
      // Remove javascript: and vbscript: URLs
      .replace(/(javascript|vbscript):[^"'\s]*/gi, "")
      // Remove data: URLs except for images
      .replace(/data:(?!image\/)[^"'\s]*/gi, "")
      // Sanitize href attributes to only allow safe URLs
      .replace(/href\s*=\s*["']([^"']*)["']/gi, (match, url) => {
        const sanitizedUrl = sanitizeUrl(url);
        return sanitizedUrl ? `href="${sanitizedUrl}"` : "";
      })
      // Remove tags not in allowlist
      .replace(
        /<(?!\/?(?:p|br|strong|em|u|h[1-6]|ul|ol|li|blockquote|a)\b)[^>]*>/gi,
        ""
      )
      // Limit content length
      .substring(0, 50000)
  );
}

/**
 * Sanitize search query to prevent injection attacks
 * Enhanced security version with additional pattern detection
 */
export function sanitizeSearchQuery(
  query: string,
  options?: {
    userId?: string;
    ip?: string;
    logSuspicious?: boolean;
  }
): string {
  if (typeof query !== "string") {
    return "";
  }

  const { userId, ip, logSuspicious = true } = options || {};

  // SECURITY: Enhanced sanitization
  const sanitized = query
    .trim()
    // Remove null bytes and control characters
    .replace(/[\0-\x1F\x7F-\x9F]/g, "")
    // Remove SQL injection patterns (more comprehensive)
    .replace(/[';\\"`]/g, "")
    // Remove script tags and HTML
    .replace(/<[^>]*>/g, "")
    // Remove potentially dangerous URL patterns
    .replace(/javascript:/gi, "")
    .replace(/data:/gi, "")
    .replace(/vbscript:/gi, "")
    // Remove excessive special characters (keep only basic ones)
    .replace(/[^\w\s\-_.]/g, "")
    // Normalize whitespace
    .replace(/\s+/g, " ")
    // Remove leading/trailing special characters
    .replace(/^[\s\-_.]+|[\s\-_.]+$/g, "")
    // Limit length
    .substring(0, 100)
    .trim();

  // SECURITY: Additional validation - must contain at least one alphanumeric character
  if (sanitized && !/[a-zA-Z0-9]/.test(sanitized)) {
    return "";
  }

  // SECURITY: Block suspicious patterns
  const suspiciousPatterns = [
    { pattern: /union\s+select/i, name: "SQL_UNION_SELECT" },
    { pattern: /drop\s+table/i, name: "SQL_DROP_TABLE" },
    { pattern: /insert\s+into/i, name: "SQL_INSERT" },
    { pattern: /delete\s+from/i, name: "SQL_DELETE" },
    { pattern: /update\s+set/i, name: "SQL_UPDATE" },
    { pattern: /exec\s*\(/i, name: "SQL_EXEC" },
    { pattern: /script\s*>/i, name: "XSS_SCRIPT" },
    { pattern: /on\s*error/i, name: "JS_ERROR_HANDLER" },
    { pattern: /\.\.\/+/, name: "PATH_TRAVERSAL" },
    { pattern: /\$\{/, name: "TEMPLATE_INJECTION" },
    { pattern: /%[0-9a-f]{2}/i, name: "URL_ENCODING" },
  ];

  for (const { pattern, name } of suspiciousPatterns) {
    if (pattern.test(sanitized)) {
      console.warn(
        `[SECURITY] Suspicious search pattern blocked: ${name} - ${sanitized}`
      );

      // Log suspicious pattern if enabled
      if (logSuspicious) {
        // Dynamically import to avoid circular dependencies
        import("@/lib/monitor").then(({ SecurityAlert }) => {
          SecurityAlert.suspiciousSearchPattern(query, name, userId, ip).catch(
            console.error
          );
        });
      }

      return "";
    }
  }

  return sanitized;
}

/**
 * Sanitize slug for URL safety
 */
export function sanitizeSlug(slug: string): string {
  if (typeof slug !== "string") {
    return "";
  }

  return (
    slug
      .trim()
      .toLowerCase()
      // Remove non-alphanumeric characters except hyphens
      .replace(/[^a-z0-9-]/g, "-")
      // Remove multiple consecutive hyphens
      .replace(/-+/g, "-")
      // Remove leading/trailing hyphens
      .replace(/^-+|-+$/g, "")
      // Limit length
      .substring(0, 100)
      .trim()
  );
}

/**
 * Validate and sanitize email addresses
 */
export function sanitizeEmail(email: string): string | null {
  if (typeof email !== "string") {
    return null;
  }

  const trimmedEmail = email.trim().toLowerCase();

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmedEmail)) {
    return null;
  }

  // Check for dangerous characters
  if (/[<>'"\\\/]/.test(trimmedEmail)) {
    return null;
  }

  return trimmedEmail.substring(0, 254); // RFC 5321 limit
}

/**
 * Sanitize JSON data recursively
 */
export function sanitizeJsonData(data: unknown): unknown {
  if (typeof data === "string") {
    return sanitizeInput(data);
  }

  if (Array.isArray(data)) {
    return data.map(sanitizeJsonData);
  }

  if (data && typeof data === "object") {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      const sanitizedKey = sanitizeInput(key);
      sanitized[sanitizedKey] = sanitizeJsonData(value);
    }
    return sanitized;
  }

  return data;
}

/**
 * Remove potentially dangerous file extensions
 */
export function validateFileExtension(filename: string): boolean {
  const dangerousExtensions = [
    ".exe",
    ".bat",
    ".cmd",
    ".com",
    ".pif",
    ".scr",
    ".vbs",
    ".js",
    ".jar",
    ".php",
    ".asp",
    ".aspx",
    ".jsp",
    ".py",
    ".rb",
    ".pl",
    ".sh",
    ".ps1",
    ".app",
    ".deb",
    ".rpm",
    ".dmg",
    ".iso",
  ];

  const extension = filename.toLowerCase().split(".").pop();
  return !dangerousExtensions.includes(`.${extension}`);
}

/**
 * Get environment-aware security headers
 */
function getSecurityHeaders() {
  const baseHeaders = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Referrer-Policy": "strict-origin-when-cross-origin",
  };

  if (isProduction()) {
    // Production headers - maximum security
    return {
      ...baseHeaders,
      "Strict-Transport-Security":
        "max-age=63072000; includeSubDomains; preload",
      "X-Permitted-Cross-Domain-Policies": "none",
      "Cross-Origin-Embedder-Policy": "require-corp",
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Resource-Policy": "same-origin",
      // Remove server information
      Server: "Promptexify",
      // Cache control for security
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    };
  } else {
    // Development headers - less restrictive for development
    return {
      ...baseHeaders,
      // Don't enforce HSTS in development (allows HTTP)
      "X-Permitted-Cross-Domain-Policies": "none",
      // Less strict CORS policies for development
      "Cross-Origin-Embedder-Policy": "unsafe-none",
      "Cross-Origin-Opener-Policy": "unsafe-none",
    };
  }
}

/**
 * Security headers for API responses
 */
export const SECURITY_HEADERS = getSecurityHeaders();

// Enhanced security headers for API responses
export function getEnhancedSecurityHeaders() {
  return {
    ...getSecurityHeaders(),
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
    "Cache-Control": "no-store, no-cache, must-revalidate, private",
    Pragma: "no-cache",
    Expires: "0",
  };
}

export const ENHANCED_SECURITY_HEADERS = getEnhancedSecurityHeaders();

/**
 * Get rate limit configurations based on environment
 */
export function getRateLimitConfig() {
  if (isProduction()) {
    // Stricter rate limits in production
    return {
      auth: { limit: 5, window: 15 * 60 * 1000 }, // 5 requests per 15 minutes
      upload: { limit: 10, window: 60 * 1000 }, // 10 uploads per minute
      createPost: { limit: 3, window: 60 * 1000 }, // 3 posts per minute (stricter)
      createTag: { limit: 15, window: 60 * 1000 }, // 15 tags per minute (stricter)
      api: { limit: 60, window: 60 * 1000 }, // 60 requests per minute (stricter)
      search: { limit: 30, window: 60 * 1000 }, // 30 searches per minute (stricter)
      interactions: { limit: 100, window: 60 * 1000 }, // 100 interactions per minute (stricter)
    };
  } else {
    // More lenient rate limits in development
    return {
      auth: { limit: 10, window: 15 * 60 * 1000 }, // 10 requests per 15 minutes
      upload: { limit: 20, window: 60 * 1000 }, // 20 uploads per minute
      createPost: { limit: 10, window: 60 * 1000 }, // 10 posts per minute
      createTag: { limit: 50, window: 60 * 1000 }, // 50 tags per minute
      api: { limit: 200, window: 60 * 1000 }, // 200 requests per minute
      search: { limit: 100, window: 60 * 1000 }, // 100 searches per minute
      interactions: { limit: 500, window: 60 * 1000 }, // 500 interactions per minute
    };
  }
}

/**
 * Get file upload configurations based on environment
 */
export function getFileUploadConfig() {
  return {
    maxImageSize: isProduction() ? 2 * 1024 * 1024 : 5 * 1024 * 1024, // 2MB prod, 5MB dev
    maxVideoSize: isProduction() ? 10 * 1024 * 1024 : 50 * 1024 * 1024, // 10MB prod, 50MB dev
    allowedImageTypes: [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      ...(isDevelopment() ? ["image/gif", "image/bmp"] : []), // Additional types in dev
    ],
    allowedVideoTypes: [
      "video/mp4",
      "video/webm",
      "video/quicktime",
      ...(isDevelopment() ? ["video/avi", "video/mov"] : []), // Additional types in dev
    ],
  };
}

/**
 * Validate content length based on environment
 */
export function getContentLimits() {
  return {
    postTitle: isProduction() ? 200 : 300,
    postContent: isProduction() ? 50000 : 100000,
    postDescription: isProduction() ? 500 : 1000,
    tagName: isProduction() ? 50 : 100,
    categoryName: isProduction() ? 100 : 200,
    searchQuery: isProduction() ? 100 : 200,
    filename: isProduction() ? 100 : 200,
  };
}

/**
 * Get logging configuration based on environment
 */
export function getLoggingConfig() {
  return {
    logLevel: isProduction() ? "error" : "debug",
    logSensitiveData: isDevelopment(),
    logRateLimitViolations: true,
    logSecurityEvents: true,
    logFileUploads: isProduction(),
  };
}

/**
 * Environment-aware error response
 */
export function createErrorResponse(error: Error, message: string) {
  const config = getLoggingConfig();

  return {
    error: message,
    ...(config.logSensitiveData && {
      details: error.message,
      stack: error.stack,
    }),
    timestamp: new Date().toISOString(),
    ...(isProduction() && {
      reference: `ERR_${Date.now()}_${Math.random()
        .toString(36)
        .substring(2, 15)}`,
    }),
  };
}
