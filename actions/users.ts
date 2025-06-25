"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth, getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { handleAuthRedirect } from "./auth";

// Schema for updating user profile
const updateUserProfileSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(50, "Name must be less than 50 characters")
    .trim(),
});

export async function updateUserProfileAction(formData: FormData) {
  try {
    // Require authentication
    const user = await requireAuth();

    // Extract and validate form data
    const name = formData.get("name") as string;

    const validatedData = updateUserProfileSchema.safeParse({ name });

    if (!validatedData.success) {
      return {
        success: false,
        error: validatedData.error.errors[0]?.message || "Invalid input",
      };
    }

    // Update user profile in database
    await prisma.user.update({
      where: { id: user.id },
      data: {
        name: validatedData.data.name,
        updatedAt: new Date(),
      },
    });

    // Revalidate the account page to show updated data
    revalidatePath("/dashboard/account");

    return {
      success: true,
      message: "Profile updated successfully",
    };
  } catch (error) {
    console.error("Update user profile error:", error);
    return {
      success: false,
      error: "Failed to update profile. Please try again.",
    };
  } finally {
    await prisma.$disconnect();
  }
}

export async function getUserProfileAction() {
  try {
    // Require authentication
    const user = await requireAuth();

    // Get user profile data
    const userProfile = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        type: true,
        role: true,
        oauth: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!userProfile) {
      return {
        success: false,
        error: "User profile not found",
      };
    }

    return {
      success: true,
      user: userProfile,
    };
  } catch (error) {
    console.error("Get user profile error:", error);
    return {
      success: false,
      error: "Failed to load profile. Please try again.",
    };
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Get user dashboard statistics
 * Returns total bookmarks, joined date, and recent favorite posts
 */
export async function getUserDashboardStatsAction() {
  try {
    // Get the current user with authentication check
    const currentUser = await getCurrentUser();
    if (!currentUser?.userData) {
      handleAuthRedirect();
    }
    const user = currentUser.userData;

    // Execute all queries in parallel for better performance
    const [totalBookmarks, recentFavorites] = await Promise.all([
      // Get total bookmarks count
      prisma.bookmark.count({
        where: {
          userId: user.id,
        },
      }),

      // Get recent favorite posts (limit 5)
      prisma.favorite.findMany({
        where: {
          userId: user.id,
        },
        include: {
          post: {
            include: {
              author: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  avatar: true,
                },
              },
              category: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
              tags: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 5, // Limit to 5 most recent favorites
      }),
    ]);

    return {
      success: true,
      data: {
        totalBookmarks,
        joinedDate: user.createdAt,
        recentFavorites,
        userInfo: {
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          type: user.type,
          role: user.role,
        },
      },
    };
  } catch (error) {
    // Handle authentication redirects
    if (error && typeof error === "object" && "digest" in error) {
      const errorDigest = (error as { digest?: string }).digest;
      if (
        typeof errorDigest === "string" &&
        errorDigest.includes("NEXT_REDIRECT")
      ) {
        throw error;
      }
    }

    console.error("Error fetching user dashboard stats:", error);
    return {
      success: false,
      error: "Failed to fetch user dashboard statistics",
    };
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Get total favorite posts count for user
 */
export async function getUserFavoritesCountAction() {
  try {
    // Get the current user with authentication check
    const currentUser = await getCurrentUser();
    if (!currentUser?.userData) {
      handleAuthRedirect();
    }
    const user = currentUser.userData;

    const totalFavorites = await prisma.favorite.count({
      where: {
        userId: user.id,
      },
    });

    return {
      success: true,
      totalFavorites,
    };
  } catch (error) {
    // Handle authentication redirects
    if (error && typeof error === "object" && "digest" in error) {
      const errorDigest = (error as { digest?: string }).digest;
      if (
        typeof errorDigest === "string" &&
        errorDigest.includes("NEXT_REDIRECT")
      ) {
        throw error;
      }
    }

    console.error("Error fetching user favorites count:", error);
    return {
      success: false,
      error: "Failed to fetch favorites count",
    };
  } finally {
    await prisma.$disconnect();
  }
}
