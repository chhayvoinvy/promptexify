/**
 * Automation Validation
 *
 * Security-focused validation schemas and functions for automation system
 * following OWASP secure coding guidelines and input validation best practices
 */

import { z } from "zod";
import createDOMPurify from "dompurify";
import { JSDOM } from "jsdom";
import { automationConfig } from "./config";
import type { TagData, PostData, ContentFile } from "./types";

// Security-focused validation schemas
export const TagDataSchema = z.object({
  name: z
    .string()
    .min(1, "Tag name is required")
    .max(50, "Tag name too long")
    .regex(/^[a-zA-Z0-9\s\-_]+$/, "Tag name contains invalid characters"),
  slug: z
    .string()
    .min(1, "Tag slug is required")
    .max(50, "Tag slug too long")
    .regex(
      /^[a-z0-9\-_]+$/,
      "Tag slug must be lowercase alphanumeric with dashes/underscores"
    ),
});

export const PostDataSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title too long")
    .refine(
      (title) => !title.includes("<script"),
      "Title contains suspicious content"
    ),

  slug: z
    .string()
    .min(1, "Slug is required")
    .max(100, "Slug too long")
    .regex(
      /^[a-z0-9\-_]+$/,
      "Slug must be lowercase alphanumeric with dashes/underscores"
    ),

  description: z
    .string()
    .min(1, "Description is required")
    .max(500, "Description too long")
    .refine(
      (desc) => !containsSuspiciousContent(desc),
      "Description contains suspicious content"
    ),

  content: z
    .string()
    .min(1, "Content is required")
    .max(
      automationConfig.security.maxContentLength,
      `Content exceeds ${automationConfig.security.maxContentLength} character limit`
    )
    .refine(
      (content) => !containsSuspiciousContent(content),
      "Content contains suspicious content"
    ),

  isPremium: z.boolean(),
  isPublished: z.boolean(),
  status: z.enum(["APPROVED", "PENDING_APPROVAL", "REJECTED"]),
  isFeatured: z.boolean(),

  featuredImage: z
    .string()
    .optional()
    .refine(
      (path) =>
        !path ||
        path === "" ||
        isAllowedLocalImagePath(path),
      "Invalid or suspicious image path"
    ),
  featuredVideo: z
    .string()
    .optional()
    .refine(
      (path) =>
        !path ||
        path === "" ||
        isAllowedLocalVideoPath(path),
      "Invalid or suspicious video path"
    ),
});

export const ContentFileSchema = z.object({
  category: z
    .string()
    .min(1, "Category is required")
    .max(50, "Category name too long")
    .regex(
      /^[a-z0-9\-_]+$/,
      "Category must be lowercase alphanumeric with dashes/underscores"
    ),

  tags: z
    .array(TagDataSchema)
    .min(1, "At least one tag is required")
    .max(20, "Too many tags")
    .refine((tags) => {
      const slugs = tags.map((t) => t.slug);
      return new Set(slugs).size === slugs.length;
    }, "Duplicate tag slugs detected"),

  posts: z
    .array(PostDataSchema)
    .min(1, "At least one post is required")
    .max(
      automationConfig.security.maxPostsPerFile,
      `Too many posts (max ${automationConfig.security.maxPostsPerFile})`
    )
    .refine((posts) => {
      const slugs = posts.map((p) => p.slug);
      return new Set(slugs).size === slugs.length;
    }, "Duplicate post slugs detected"),
});

/**
 * Checks if content contains suspicious patterns that might indicate malicious input
 */
function containsSuspiciousContent(content: string): boolean {
  const suspiciousPatterns = [
    /<script[^>]*>/i,
    /javascript:/i,
    /vbscript:/i,
    /onload\s*=/i,
    /onerror\s*=/i,
    /onclick\s*=/i,
    /<iframe[^>]*>/i,
    /<object[^>]*>/i,
    /<embed[^>]*>/i,
    /document\.cookie/i,
    /localStorage/i,
    /sessionStorage/i,
    /eval\s*\(/i,
    /Function\s*\(/i,
    /setTimeout\s*\(/i,
    /setInterval\s*\(/i,
  ];

  return suspiciousPatterns.some((pattern) => pattern.test(content));
}

/**
 * Validates if a local image path is allowed
 */
function isAllowedLocalImagePath(path: string): boolean {
  // Must start with /images/ and end with .jpg, .jpeg, .webp, .avif, or .png
  return (
    /^\/images\/[a-zA-Z0-9_\-./]+\.(jpg|jpeg|webp|avif|png)$/i.test(path)
  );
}

/**
 * Validates if a local video path is allowed
 */
function isAllowedLocalVideoPath(path: string): boolean {
  // Must start with /videos/ and end with .mp4
  return /^\/videos\/[a-zA-Z0-9_\-./]+\.mp4$/i.test(path);
}

/**
 * Validates file size against security limits
 */
export function validateFileSize(fileSize: number): boolean {
  return fileSize <= automationConfig.security.maxFileSize;
}

/**
 * Validates file extension against allowed extensions
 */
export function validateFileExtension(fileName: string): boolean {
  const extension = fileName.toLowerCase().substring(fileName.lastIndexOf("."));
  return automationConfig.security.allowedFileExtensions.includes(extension);
}

/**
 * Safely parses JSON with size limits and error handling
 */
export function safeJsonParse(jsonString: string): unknown {
  // Check string length before parsing
  if (jsonString.length > automationConfig.security.maxFileSize) {
    throw new Error(`JSON string too large: ${jsonString.length} bytes`);
  }

  try {
    return JSON.parse(jsonString);
  } catch (error) {
    throw new Error(
      `Invalid JSON format: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Sanitizes content using DOMPurify to prevent XSS attacks
 */
export async function sanitizeContent(content: string): Promise<string> {
  const window = new JSDOM("").window;
  const DOMPurify = createDOMPurify(window as any);
  return DOMPurify.sanitize(content);
}

// Export schema inferred types
export type { TagData, PostData, ContentFile };

/**
 * Bulk validation result interface
 */
export interface BulkValidationResult {
  success: boolean;
  validItems: ContentFile[];
  errors: string[];
  warnings: string[];
  totalItems: number;
  validCount: number;
}

/**
 * CSV validation options
 */
export interface CsvValidationOptions {
  maxRows?: number;
  requireCategory?: boolean;
  requireTags?: boolean;
  strictMode?: boolean;
}

/**
 * Validates multiple ContentFile objects in bulk
 */
export async function validateContentFilesBulk(
  contentFiles: ContentFile[],
  options: {
    maxItems?: number;
    allowPartialSuccess?: boolean;
  } = {}
): Promise<BulkValidationResult> {
  const {
    maxItems = automationConfig.security.maxFiles,
    allowPartialSuccess = true,
  } = options;

  const errors: string[] = [];
  const warnings: string[] = [];
  const validItems: ContentFile[] = [];

  if (contentFiles.length > maxItems) {
    errors.push(`Exceeded maximum number of items (${maxItems})`);
    return {
      success: false,
      validItems: [],
      errors,
      warnings,
      totalItems: contentFiles.length,
      validCount: 0,
    };
  }

  for (let i = 0; i < contentFiles.length; i++) {
    const file = contentFiles[i];
    const result = ContentFileSchema.safeParse(file);

    if (result.success) {
      const validatedFile = result.data;

      // Sanitize post content after validation
      validatedFile.posts = await Promise.all(
        validatedFile.posts.map(async (post) => ({
          ...post,
          title: await sanitizeContent(post.title),
          description: await sanitizeContent(post.description),
          content: await sanitizeContent(post.content),
        }))
      );

      validItems.push(validatedFile);
    } else {
      const errorMessages = result.error.errors.map((e) => e.message);
      errors.push(`Item ${i + 1}: ${errorMessages.join(", ")}`);
    }
  }

  const success =
    errors.length === 0 || (allowPartialSuccess && validItems.length > 0);

  return {
    success,
    validItems,
    errors,
    warnings,
    totalItems: contentFiles.length,
    validCount: validItems.length,
  };
}

/**
 * Validates JSON input, parsing it and checking against the ContentFile schema
 */
export async function validateJsonInput(
  jsonData: unknown,
  options: {
    maxSize?: number;
    allowArray?: boolean;
  } = {}
): Promise<{
  success: boolean;
  data?: ContentFile | ContentFile[];
  errors: string[];
}> {
  const { maxSize = 10 * 1024 * 1024, allowArray = true } = options;

  // Check overall size if jsonData is a string
  if (typeof jsonData === "string" && jsonData.length > maxSize) {
    return {
      success: false,
      errors: [`JSON payload exceeds max size of ${maxSize} bytes`],
    };
  }

  const schema = allowArray
    ? z.union([ContentFileSchema, z.array(ContentFileSchema)])
    : ContentFileSchema;

  const result = schema.safeParse(jsonData);

  if (!result.success) {
    return {
      success: false,
      errors: result.error.errors.map((e) => e.message),
    };
  }

  let validatedData = result.data;

  // Sanitize content after validation
  if (Array.isArray(validatedData)) {
    validatedData = await Promise.all(
      validatedData.map(async (file) => ({
        ...file,
        posts: await Promise.all(
          file.posts.map(async (post) => ({
            ...post,
            title: await sanitizeContent(post.title),
            description: await sanitizeContent(post.description),
            content: await sanitizeContent(post.content),
          }))
        ),
      }))
    );
  } else if (validatedData) {
    const file = validatedData as ContentFile;
    file.posts = await Promise.all(
      file.posts.map(async (post) => ({
        ...post,
        title: await sanitizeContent(post.title),
        description: await sanitizeContent(post.description),
        content: await sanitizeContent(post.content),
      }))
    );
    validatedData = file;
  }

  return {
    success: true,
    data: validatedData,
    errors: [],
  };
}

/**
 * Validates CSV data structure before parsing
 */
export function validateCsvStructure(
  csvContent: string,
  options: CsvValidationOptions = {}
): { success: boolean; errors: string[]; warnings: string[] } {
  const {
    maxRows = 1000,
    requireCategory = true,
    requireTags = false,
    strictMode = false,
  } = options;

  const errors: string[] = [];
  const warnings: string[] = [];

  // Check content size
  if (csvContent.length > 10 * 1024 * 1024) {
    // 10MB limit
    return {
      success: false,
      errors: ["CSV file too large (max 10MB)"],
      warnings,
    };
  }

  // Check for basic CSV structure
  const lines = csvContent.split("\n").filter((line) => line.trim());

  if (lines.length < 2) {
    return {
      success: false,
      errors: ["CSV must have at least a header row and one data row"],
      warnings,
    };
  }

  if (lines.length > maxRows + 1) {
    // +1 for header
    warnings.push(`CSV has ${lines.length - 1} rows, limiting to ${maxRows}`);
  }

  // Check header structure
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());

  if (
    requireCategory &&
    !headers.some((h) => ["category", "cat", "category_slug"].includes(h))
  ) {
    errors.push("CSV must have a category column");
  }

  if (
    requireTags &&
    !headers.some((h) => ["tag", "tags", "tag_name", "tag_names"].includes(h))
  ) {
    errors.push("CSV must have a tags column");
  }

  if (!headers.some((h) => ["title", "post_title", "name"].includes(h))) {
    errors.push("CSV must have a title column");
  }

  if (strictMode) {
    const requiredHeaders = ["title", "content", "description"];
    const missingHeaders = requiredHeaders.filter(
      (req) => !headers.some((h) => h.includes(req))
    );

    if (missingHeaders.length > 0) {
      errors.push(
        `Missing required columns in strict mode: ${missingHeaders.join(", ")}`
      );
    }
  }

  // Check for suspicious content in headers
  const suspiciousHeaders = headers.filter((h) => containsSuspiciousContent(h));
  if (suspiciousHeaders.length > 0) {
    return {
      success: false,
      errors: [
        `Suspicious content detected in headers: ${suspiciousHeaders.join(", ")}`,
      ],
      warnings,
    };
  }

  return {
    success: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates and sanitizes raw content input
 */
export async function validateRawContent(
  content: string,
  type: "title" | "description" | "content" | "category" | "tag" = "content"
): Promise<{ success: boolean; sanitized?: string; errors: string[] }> {
  const errors: string[] = [];

  if (!content || typeof content !== "string") {
    errors.push("Invalid content provided");
    return { success: false, errors };
  }

  // Basic length checks
  const maxLength =
    type === "content"
      ? automationConfig.security.maxContentLength
      : type === "title"
        ? 200
        : 500;

  if (content.length > maxLength) {
    errors.push(`Content exceeds maximum length of ${maxLength}`);
  }

  // Check for suspicious patterns
  if (containsSuspiciousContent(content)) {
    errors.push("Content contains suspicious patterns");
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  // Sanitize content
  const sanitized = await sanitizeContent(content);

  return {
    success: true,
    sanitized,
    errors: [],
  };
}
