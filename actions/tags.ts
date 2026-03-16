"use server";

import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { tags as tagsTable, postToTag } from "@/lib/db/schema";
import { eq, or, ilike, ne, and, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createTagSchema, updateTagSchema } from "@/lib/schemas";
import {
  sanitizeTagName,
  sanitizeTagSlug,
  validateTagSlug,
} from "@/lib/security/sanitize";
import { withCSRFProtection } from "@/lib/security/csp";
import { revalidateCache, CACHE_TAGS } from "@/lib/cache";

// Define return types for consistent error handling
interface ActionResult {
  success: boolean;
  message?: string;
  error?: string;
}

// Tag Management Actions
export const createTagAction = withCSRFProtection(
  async (formData: FormData): Promise<ActionResult> => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        return {
          success: false,
          error: "Authentication required",
        };
      }

      // Only allow ADMIN to create tags for better control
      if (user.userData?.role !== "ADMIN") {
        return {
          success: false,
          error: "Admin access required",
        };
      }

      const rawName = formData.get("name") as string;
      const rawSlug = formData.get("slug") as string;

      // Validate input data using Zod schema
      const validationResult = createTagSchema.safeParse({
        name: rawName,
        slug: rawSlug || undefined,
      });

      if (!validationResult.success) {
        const errorMessages = validationResult.error.errors.map(
          (err) => err.message
        );
        return {
          success: false,
          error: `Validation failed: ${errorMessages.join(", ")}`,
        };
      }

      const { name, slug: providedSlug } = validationResult.data;

      // Additional sanitization for enhanced security
      const sanitizedName = sanitizeTagName(name);
      if (!sanitizedName || sanitizedName.length === 0) {
        return {
          success: false,
          error:
            "Tag name contains invalid characters or is empty after sanitization",
        };
      }

      // Generate or sanitize slug with strict validation
      let finalSlug: string;
      if (providedSlug) {
        finalSlug = sanitizeTagSlug(providedSlug);
      } else {
        finalSlug = sanitizeTagSlug(sanitizedName);
      }

      // Validate the final slug
      if (!validateTagSlug(finalSlug)) {
        return {
          success: false,
          error:
            "Slug can only contain lowercase letters (a-z), numbers (0-9), and hyphens (-).",
        };
      }

      const [existingTag] = await db
        .select()
        .from(tagsTable)
        .where(or(ilike(tagsTable.name, sanitizedName), eq(tagsTable.slug, finalSlug)))
        .limit(1);

      if (existingTag) {
        const isNameMatch =
          existingTag.name.toLowerCase() === sanitizedName.toLowerCase();
        const isSlugMatch = existingTag.slug === finalSlug;

        if (isNameMatch && isSlugMatch) {
          return {
            success: false,
            error: "A tag with this name and slug already exists",
          };
        } else if (isNameMatch) {
          return {
            success: false,
            error: "A tag with this name already exists",
          };
        } else {
          return {
            success: false,
            error: "A tag with this slug already exists",
          };
        }
      }

      await db.insert(tagsTable).values({ name: sanitizedName, slug: finalSlug });

      // Invalidate tags cache so new tag appears immediately
      revalidateCache(CACHE_TAGS.TAGS);
      revalidatePath("/tags");

      // Return success before redirect
      return {
        success: true,
        message: `Tag "${sanitizedName}" created successfully`,
      };
    } catch (error) {
      // Check if this is a Next.js redirect
      if (error && typeof error === "object" && "digest" in error) {
        const errorDigest = (error as { digest?: string }).digest;
        if (
          typeof errorDigest === "string" &&
          errorDigest.includes("NEXT_REDIRECT")
        ) {
          // This is a redirect - re-throw it to allow the redirect to proceed
          throw error;
        }
      }

      // Handle database-specific errors
      if (error && typeof error === "object" && "code" in error) {
        const dbError = error as { code: string; meta?: unknown };

        if (dbError.code === "P2002") {
          // Unique constraint violation
          console.error("Tag creation failed - duplicate constraint:", error);
          return {
            success: false,
            error: "A tag with this name or slug already exists",
          };
        }
      }

      console.error("Error creating tag:", error);

      // Return a user-friendly error message
      const errorMessage =
        error instanceof Error ? error.message : "Failed to create tag";
      return {
        success: false,
        error: errorMessage,
      };
    }
  }
);

export const updateTagAction = withCSRFProtection(
  async (formData: FormData) => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        throw new Error("Authentication required");
      }

      // Only allow ADMIN to update tags
      if (user.userData?.role !== "ADMIN") {
        throw new Error("Admin access required");
      }

      const rawId = formData.get("id") as string;
      const rawName = formData.get("name") as string;
      const rawSlug = formData.get("slug") as string;

      // Validate input data using Zod schema
      const validationResult = updateTagSchema.safeParse({
        id: rawId,
        name: rawName,
        slug: rawSlug,
      });

      if (!validationResult.success) {
        const errorMessages = validationResult.error.errors.map(
          (err) => err.message
        );
        throw new Error(`Validation failed: ${errorMessages.join(", ")}`);
      }

      const { id, name, slug } = validationResult.data;

      // Additional sanitization for enhanced security
      const sanitizedName = sanitizeTagName(name);
      if (!sanitizedName || sanitizedName.length === 0) {
        throw new Error(
          "Tag name contains invalid characters or is empty after sanitization"
        );
      }

      // Sanitize and validate slug
      const finalSlug = sanitizeTagSlug(slug);
      if (!validateTagSlug(finalSlug)) {
        throw new Error(
          "Invalid slug format. Slug can only contain lowercase letters (a-z), numbers (0-9), and hyphens (-)."
        );
      }

      const [existingTag] = await db.select().from(tagsTable).where(eq(tagsTable.id, id)).limit(1);

      if (!existingTag) {
        throw new Error("Tag not found");
      }

      const [existingConflict] = await db
        .select()
        .from(tagsTable)
        .where(
          and(
            or(ilike(tagsTable.name, sanitizedName), eq(tagsTable.slug, finalSlug)),
            ne(tagsTable.id, id)
          )
        )
        .limit(1);

      if (existingConflict) {
        const isNameMatch =
          existingConflict.name.toLowerCase() === sanitizedName.toLowerCase();
        const isSlugMatch = existingConflict.slug === finalSlug;

        if (isNameMatch && isSlugMatch) {
          throw new Error("A tag with this name and slug already exists");
        } else if (isNameMatch) {
          throw new Error("A tag with this name already exists");
        } else {
          throw new Error("A tag with this slug already exists");
        }
      }

      await db
        .update(tagsTable)
        .set({ name: sanitizedName, slug: finalSlug, updatedAt: new Date() })
        .where(eq(tagsTable.id, id));

      // Invalidate tags cache so updated tag appears immediately
      revalidateCache(CACHE_TAGS.TAGS);
      revalidatePath("/tags");
      redirect("/tags");
    } catch (error) {
      // Check if this is a Next.js redirect
      if (error && typeof error === "object" && "digest" in error) {
        const errorDigest = (error as { digest?: string }).digest;
        if (
          typeof errorDigest === "string" &&
          errorDigest.includes("NEXT_REDIRECT")
        ) {
          // This is a redirect - re-throw it to allow the redirect to proceed
          throw error;
        }
      }

      console.error("Error updating tag:", error);
      throw new Error("Failed to update tag");
    }
  }
);

export const deleteTagAction = withCSRFProtection(
  async (formData: FormData) => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        throw new Error("Authentication required");
      }

      // Admin access required for deleting tags
      if (user.userData?.role !== "ADMIN") {
        throw new Error("Admin access required");
      }

      const id = formData.get("id") as string;

      // Input validation
      if (!id) {
        throw new Error("Tag ID is required");
      }

      const [existingTagRow] = await db.select().from(tagsTable).where(eq(tagsTable.id, id)).limit(1);
      const [countRow] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(postToTag)
        .where(eq(postToTag.B, id));
      const existingTag = existingTagRow
        ? { ...existingTagRow, _count: { posts: countRow?.count ?? 0 } }
        : null;

      if (!existingTag) {
        throw new Error("Tag not found");
      }

      // Prevent deletion if tag has associated posts
      if (existingTag._count.posts > 0) {
        throw new Error(
          `Cannot delete tag "${existingTag.name}" because it is used by ${existingTag._count.posts} post(s). Please remove the tag from all posts first.`
        );
      }

      await db.delete(tagsTable).where(eq(tagsTable.id, id));

      // Invalidate tags cache so deleted tag is removed immediately
      revalidateCache(CACHE_TAGS.TAGS);
      revalidatePath("/tags");
      return {
        success: true,
        message: `Tag "${existingTag.name}" deleted successfully`,
      };
    } catch (error) {
      console.error("Error deleting tag:", error);

      // Handle database-specific errors
      if (error && typeof error === "object" && "code" in error) {
        const dbError = error as { code: string };

        if (dbError.code === "P2003") {
          // Foreign key constraint violation
          throw new Error(
            "Cannot delete tag because it is referenced by other records"
          );
        }
      }

      const errorMessage =
        error instanceof Error ? error.message : "Failed to delete tag";
      throw new Error(errorMessage);
    }
  }
);
