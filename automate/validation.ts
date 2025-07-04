import { z } from "zod";
import { seedConfig } from "./configuration";
import DOMPurify from "isomorphic-dompurify";

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
      seedConfig.security.maxContentLength,
      `Content exceeds ${seedConfig.security.maxContentLength} character limit`
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
      (url) =>
        !url ||
        url === "" ||
        (z.string().url().safeParse(url).success && isAllowedImageUrl(url)),
      "Invalid or suspicious image URL"
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
      seedConfig.security.maxPostsPerFile,
      `Too many posts (max ${seedConfig.security.maxPostsPerFile})`
    )
    .refine((posts) => {
      const slugs = posts.map((p) => p.slug);
      return new Set(slugs).size === slugs.length;
    }, "Duplicate post slugs detected"),
});

// Security helper functions
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

function isAllowedImageUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);

    // Only allow HTTPS URLs
    if (parsedUrl.protocol !== "https:") {
      return false;
    }

    // Allow common image hosting services
    const allowedDomains = [
      "images.unsplash.com",
      "unsplash.com",
      "picsum.photos", // Lorem Picsum for testing
      "cdn.example.com", // Replace with your CDN
      "s3.amazonaws.com",
      "storage.googleapis.com",
      "cdn.jsdelivr.net",
      "raw.githubusercontent.com",
    ];

    return allowedDomains.some(
      (domain) =>
        parsedUrl.hostname === domain ||
        parsedUrl.hostname.endsWith(`.${domain}`)
    );
  } catch {
    return false;
  }
}

// File validation
export function validateFileSize(fileSize: number): boolean {
  return fileSize <= seedConfig.security.maxFileSize;
}

export function validateFileExtension(fileName: string): boolean {
  const extension = fileName.toLowerCase().substring(fileName.lastIndexOf("."));
  return seedConfig.security.allowedFileExtensions.includes(extension);
}

// Safe JSON parsing with size limits
export function safeJsonParse(jsonString: string): unknown {
  // Check string length before parsing
  if (jsonString.length > seedConfig.security.maxFileSize) {
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

// Content sanitization
export function sanitizeContent(content: string): string {
  return DOMPurify.sanitize(content);
}

export type TagData = z.infer<typeof TagDataSchema>;
export type PostData = z.infer<typeof PostDataSchema>;
export type ContentFile = z.infer<typeof ContentFileSchema>;
