"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth, getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { handleAuthRedirect } from "./auth";
import { withCSRFProtection, handleSecureActionError } from "@/lib/security";
import { updateUserProfileSchema } from "@/lib/schemas";
import { sanitizeInput } from "@/lib/sanitize";

export const updateUserProfileAction = withCSRFProtection(
  async (formData: FormData) => {
    try {
      // Require authentication
      const user = await requireAuth();

      // Extract form data
      const rawName = formData.get("name") as string;

      // SECURITY: Pre-sanitize input before validation
      const sanitizedName = rawName ? sanitizeInput(rawName) : "";

      // Validate input using centralized schema
      const validationResult = updateUserProfileSchema.safeParse({
        name: sanitizedName,
      });

      if (!validationResult.success) {
        // Log validation failure for security monitoring
        console.warn(
          `[SECURITY] Profile update validation failed for user ${user.id}:`,
          validationResult.error.errors
        );

        return {
          success: false,
          error:
            validationResult.error.errors[0]?.message || "Invalid input format",
        };
      }

      const { name } = validationResult.data;

      // SECURITY: Additional server-side validation
      if (!name || name.trim().length < 2) {
        return {
          success: false,
          error: "Name must be at least 2 characters long",
        };
      }

      // SECURITY: Check for suspicious patterns
      const suspiciousPatterns = [
        /^[aA\s]+$/, // All A's and spaces
        /^[zZ\s]+$/, // All Z's and spaces
        /(admin|test|user|null|undefined|script|root|guest)/i, // Common suspicious names
        /^(.)\1{4,}$/, // 5+ repeated characters in a row
        /^\s+$|^$|^\s*$/, // Only spaces or empty
        /\s{4,}/, // 4+ consecutive spaces
      ];

      for (const pattern of suspiciousPatterns) {
        if (pattern.test(name)) {
          console.warn(
            `[SECURITY] Suspicious name pattern detected: ${name} for user ${user.id}`
          );

          // Log suspicious activity
          import("@/lib/security-monitor").then(({ SecurityAlert }) => {
            SecurityAlert.suspiciousRequest(
              "Suspicious name pattern in profile update",
              { name, pattern: pattern.toString() },
              user.id
            ).catch(console.error);
          });

          return {
            success: false,
            error:
              "Invalid name format. Please use a real name with letters and spaces only.",
          };
        }
      }

      // SECURITY: Additional check for reasonable name format
      const trimmedName = name.trim();
      const nameParts = trimmedName.split(/\s+/);

      // Allow 1-4 name parts (e.g., "John", "Mary Jane", "Mary Jane Smith", "Mary Jane Smith Johnson")
      if (nameParts.length > 4) {
        return {
          success: false,
          error: "Name can have maximum 4 parts (first, middle, last names).",
        };
      }

      // Each name part should be at least 1 character
      if (nameParts.some((part) => part.length < 1)) {
        return {
          success: false,
          error: "Each name part must contain at least one letter.",
        };
      }

      // Update user profile in database
      await prisma.user.update({
        where: { id: user.id },
        data: {
          name: name,
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
      const errorResult = handleSecureActionError(error);
      return {
        success: false,
        error: errorResult.error,
      };
    } finally {
      await prisma.$disconnect();
    }
  }
);

export async function getUserProfileAction() {
  try {
    // Require authentication and get full user data (both Supabase and Prisma)
    const currentUser = await getCurrentUser();
    if (!currentUser?.userData) {
      return {
        success: false,
        error: "User not authenticated",
      };
    }

    // Get user profile data from Prisma
    const userProfile = await prisma.user.findUnique({
      where: { id: currentUser.id },
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

    // Combine Prisma data with Supabase auth data (including last_sign_in_at)
    const userActivityData = {
      ...userProfile,
      lastSignInAt: currentUser.last_sign_in_at || null,
      emailConfirmedAt: currentUser.email_confirmed_at || null,
    };

    return {
      success: true,
      user: userActivityData,
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
