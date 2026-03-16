"use server";

import { type FavoriteData, favoriteSchema } from "@/lib/schemas";
import { db } from "@/lib/db";
import { favorites as favoritesTable } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { revalidateCache, CACHE_TAGS } from "@/lib/cache";
import { Queries } from "@/lib/query";

// Favorite actions
export async function toggleFavoriteAction(data: FavoriteData) {
  try {
    // Validate the input
    const validatedData = favoriteSchema.parse(data);

    // Get the current user
    const currentUser = await getCurrentUser();
    if (!currentUser?.userData) {
      // Return authentication error instead of redirecting to prevent modal navigation issues
      return {
        success: false,
        error: "Authentication required. Please sign in.",
      };
    }
    const user = currentUser.userData;

    const [existingFavorite] = await db
      .select()
      .from(favoritesTable)
      .where(and(eq(favoritesTable.userId, user.id), eq(favoritesTable.postId, validatedData.postId)))
      .limit(1);

    if (existingFavorite) {
      await db
        .delete(favoritesTable)
        .where(and(eq(favoritesTable.userId, user.id), eq(favoritesTable.postId, validatedData.postId)));

      // Targeted cache invalidation — only favorite-relevant caches
      await revalidateCache([
        CACHE_TAGS.USER_FAVORITES,
        CACHE_TAGS.POST_BY_ID,
        CACHE_TAGS.POPULAR_POSTS,
      ]);
      return { success: true, favorited: false };
    } else {
      await db.insert(favoritesTable).values({
        userId: user.id,
        postId: validatedData.postId,
      });

      // Targeted cache invalidation — only favorite-relevant caches
      await revalidateCache([
        CACHE_TAGS.USER_FAVORITES,
        CACHE_TAGS.POST_BY_ID,
        CACHE_TAGS.POPULAR_POSTS,
      ]);
      return { success: true, favorited: true };
    }
  } catch (error) {
    // Check if this is a Next.js redirect (authentication redirect)
    if (error && typeof error === "object" && "digest" in error) {
      const errorDigest = (error as { digest?: string }).digest;
      if (
        typeof errorDigest === "string" &&
        errorDigest.includes("NEXT_REDIRECT")
      ) {
        // This is an authentication redirect - re-throw it
        throw error;
      }
    }

    console.error("Error toggling favorite:", error);
    return { success: false, error: "Failed to toggle favorite" };
  }
}

export async function getUserFavoritesAction() {
  try {
    // Get the current user
    const currentUser = await getCurrentUser();
    if (!currentUser?.userData) {
      // Return authentication error instead of redirecting
      return {
        success: false,
        error: "Authentication required. Please sign in.",
      };
    }
    const user = currentUser.userData;

    const favoriteRows = await db
      .select({ postId: favoritesTable.postId, id: favoritesTable.id, createdAt: favoritesTable.createdAt })
      .from(favoritesTable)
      .where(eq(favoritesTable.userId, user.id))
      .orderBy(desc(favoritesTable.createdAt));
    const favoritesWithPosts = await Promise.all(
      favoriteRows.map(async (f) => {
        const post = await Queries.posts.getById(f.postId, user.id);
        return { id: f.id, createdAt: f.createdAt, post };
      })
    );
    return { success: true, favorites: favoritesWithPosts };
  } catch (error) {
    // Check if this is a Next.js redirect (authentication redirect)
    if (error && typeof error === "object" && "digest" in error) {
      const errorDigest = (error as { digest?: string }).digest;
      if (
        typeof errorDigest === "string" &&
        errorDigest.includes("NEXT_REDIRECT")
      ) {
        // This is an authentication redirect - re-throw it
        throw error;
      }
    }

    console.error("Error fetching user favorites:", error);
    return { success: false, error: "Failed to fetch favorites" };
  }
}

export async function checkFavoriteStatusAction(postId: string) {
  try {
    // Get the current user
    const currentUser = await getCurrentUser();
    if (!currentUser?.userData) {
      // Return authentication error instead of redirecting
      return {
        success: false,
        error: "Authentication required. Please sign in.",
      };
    }
    const user = currentUser.userData;

    const [favorite] = await db
      .select()
      .from(favoritesTable)
      .where(and(eq(favoritesTable.userId, user.id), eq(favoritesTable.postId, postId)))
      .limit(1);
    return { success: true, favorited: !!favorite };
  } catch (error) {
    // Check if this is a Next.js redirect (authentication redirect)
    if (error && typeof error === "object" && "digest" in error) {
      const errorDigest = (error as { digest?: string }).digest;
      if (
        typeof errorDigest === "string" &&
        errorDigest.includes("NEXT_REDIRECT")
      ) {
        // This is an authentication redirect - re-throw it
        throw error;
      }
    }

    console.error("Error checking favorite status:", error);
    return { success: false, error: "Failed to check favorite status" };
  }
}
