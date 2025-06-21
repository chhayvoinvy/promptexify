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

// Type exports
export type MagicLinkData = z.infer<typeof magicLinkSchema>;
export type SignInData = z.infer<typeof signInSchema>;
export type SignUpData = z.infer<typeof signUpSchema>;
export type BookmarkData = z.infer<typeof bookmarkSchema>;
export type FavoriteData = z.infer<typeof favoriteSchema>;
