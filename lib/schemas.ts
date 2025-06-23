import { z } from "zod";

// Authentication schemas - Updated for Magic Link only
export const magicLinkSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
});

// Legacy schemas - keeping for backward compatibility during migration
export const signInSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const signUpSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
});

// Bookmark schemas
export const bookmarkSchema = z.object({
  postId: z.string().uuid("Invalid post ID"),
});

// Favorite schemas
export const favoriteSchema = z.object({
  postId: z.string().uuid("Invalid post ID"),
});

// Post schemas with comprehensive validation
export const createPostSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title must be 200 characters or less")
    .trim(),
  slug: z
    .string()
    .min(1, "Slug is required")
    .max(200, "Slug must be 200 characters or less")
    .regex(
      /^[a-z0-9-]+$/,
      "Slug can only contain lowercase letters, numbers, and hyphens"
    )
    .trim(),
  description: z
    .string()
    .max(500, "Description must be 500 characters or less")
    .trim()
    .optional()
    .nullable(),
  content: z
    .string()
    .min(10, "Content must be at least 10 characters")
    .max(50000, "Content must be 50,000 characters or less")
    .trim(),
  featuredImage: z.string().url("Invalid image URL").optional().nullable(),
  featuredVideo: z.string().url("Invalid video URL").optional().nullable(),
  categoryId: z.string().uuid("Invalid category ID"),
  tagIds: z
    .array(z.string().uuid("Invalid tag ID"))
    .max(10, "Maximum 10 tags allowed")
    .optional()
    .default([]),
  isPremium: z.boolean().default(false),
  isPublished: z.boolean().default(false),
});

export const updatePostSchema = createPostSchema.extend({
  id: z.string().uuid("Invalid post ID"),
});

// Tag schemas with validation
export const createTagSchema = z.object({
  name: z
    .string()
    .min(1, "Tag name is required")
    .max(50, "Tag name must be 50 characters or less")
    .regex(/^[a-zA-Z0-9\s-_#@]+$/, "Tag name contains invalid characters")
    .trim(),
  slug: z
    .string()
    .min(1, "Slug is required")
    .max(50, "Slug must be 50 characters or less")
    .regex(
      /^[a-z0-9-]+$/,
      "Slug can only contain lowercase letters, numbers, and hyphens"
    )
    .trim()
    .optional(),
});

export const updateTagSchema = createTagSchema.extend({
  id: z.string().uuid("Invalid tag ID"),
});

// Category schemas with validation
export const createCategorySchema = z.object({
  name: z
    .string()
    .min(1, "Category name is required")
    .max(100, "Category name must be 100 characters or less")
    .regex(/^[a-zA-Z0-9\s-_&]+$/, "Category name contains invalid characters")
    .trim(),
  slug: z
    .string()
    .min(1, "Slug is required")
    .max(100, "Slug must be 100 characters or less")
    .regex(
      /^[a-z0-9-]+$/,
      "Slug can only contain lowercase letters, numbers, and hyphens"
    )
    .trim()
    .optional(),
  description: z
    .string()
    .max(500, "Description must be 500 characters or less")
    .trim()
    .optional()
    .nullable(),
  parentId: z.string().uuid("Invalid parent category ID").optional().nullable(),
});

export const updateCategorySchema = createCategorySchema.extend({
  id: z.string().uuid("Invalid category ID"),
});

// File upload schemas
export const fileUploadSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(100, "Title must be 100 characters or less")
    .regex(/^[a-zA-Z0-9\s-_\.]+$/, "Title contains invalid characters")
    .trim(),
});

// User profile schemas
export const updateUserProfileSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be 100 characters or less")
    .regex(/^[a-zA-Z\s-'\.]+$/, "Name contains invalid characters")
    .trim()
    .optional(),
  bio: z
    .string()
    .max(500, "Bio must be 500 characters or less")
    .trim()
    .optional()
    .nullable(),
  avatar: z.string().url("Invalid avatar URL").optional().nullable(),
});

// Search and pagination schemas
export const searchSchema = z.object({
  q: z
    .string()
    .max(100, "Search query must be 100 characters or less")
    .regex(/^[a-zA-Z0-9\s-_.#@]*$/, "Search query contains invalid characters")
    .trim()
    .optional(),
  page: z.coerce
    .number()
    .int("Page must be an integer")
    .min(1, "Page must be at least 1")
    .max(1000, "Page must be 1000 or less")
    .default(1),
  limit: z.coerce
    .number()
    .int("Limit must be an integer")
    .min(1, "Limit must be at least 1")
    .max(50, "Limit must be 50 or less")
    .default(12),
  category: z
    .string()
    .regex(/^[a-z0-9-]*$/, "Category contains invalid characters")
    .optional(),
  premium: z.enum(["free", "premium", "all"]).optional(),
});

// API response schemas for type safety
export const apiResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  error: z.string().optional(),
  data: z.any().optional(),
});

// Rate limiting schemas
export const rateLimitSchema = z.object({
  identifier: z.string().min(1, "Identifier is required"),
  limit: z.number().int().min(1, "Limit must be at least 1"),
  window: z.number().int().min(1000, "Window must be at least 1000ms"),
});

// Type exports
export type MagicLinkData = z.infer<typeof magicLinkSchema>;
export type SignInData = z.infer<typeof signInSchema>;
export type SignUpData = z.infer<typeof signUpSchema>;
export type BookmarkData = z.infer<typeof bookmarkSchema>;
export type FavoriteData = z.infer<typeof favoriteSchema>;
export type CreatePostData = z.infer<typeof createPostSchema>;
export type UpdatePostData = z.infer<typeof updatePostSchema>;
export type CreateTagData = z.infer<typeof createTagSchema>;
export type UpdateTagData = z.infer<typeof updateTagSchema>;
export type CreateCategoryData = z.infer<typeof createCategorySchema>;
export type UpdateCategoryData = z.infer<typeof updateCategorySchema>;
export type FileUploadData = z.infer<typeof fileUploadSchema>;
export type UpdateUserProfileData = z.infer<typeof updateUserProfileSchema>;
export type SearchData = z.infer<typeof searchSchema>;
export type ApiResponseData = z.infer<typeof apiResponseSchema>;
export type RateLimitData = z.infer<typeof rateLimitSchema>;
