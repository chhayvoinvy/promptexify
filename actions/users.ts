"use server";

import { db } from "@/lib/db";
import {
  users,
  bookmarks,
  favorites,
  posts,
  categories,
  tags,
} from "@/lib/db/schema";
import { eq, and, desc, gte, lt, sql } from "drizzle-orm";
import { Queries } from "@/lib/query";
import { requireAuth, getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { handleAuthRedirect } from "./auth";
import { withCSRFProtection, handleSecureActionError } from "@/lib/security/csp";
import { updateUserProfileSchema } from "@/lib/schemas";
import { sanitizeInput } from "@/lib/security/sanitize";

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
        // Expanded list of reserved/brand/role/spam/scam names and common suspicious names
        /\b(admin|test|user|null|undefined|script|root|guest|supervisor|editor|google|facebook|instagram|twitter|youtube|telegram|whatsapp|microsoft|apple|amazon|ebay|paypal|visa|mastercard|amex|discover|bank|account|security|support|official|system|developer|webmaster|noreply|daemon|anonymous|anon|temp|spam|junk|fake|bot|robot|phish|scam|fraud|malware|virus|hack|cracker|exploit|banned|blocked|restricted|error|failure|delete|remove|cancel|void|invalid|licen(s|c)e|premium|pro|vip|gold|silver|bronze|free|discount|sale|offer|deal|promo|coupon|winner|prize|lucky|congratulations|claim|collect|verify|urgent|alert|warning|important|action|required|immediately|now|click|link|download|install|update|upgrade|subscribe|unsubscribe|register|login|signup|password|otp|code|pin|secret|private|confidential|billing|invoice|payment|refund|chargeback|dispute|legal|policy|terms|conditions|agreement|copyright|trademark|patent|brand|company|corporation|inc|ltd|llc|gmbh|co|org|net|com|info|biz|site|website|forum|blog|shop|store|online|service|solution|portal|dashboard|management|control|console|panel|bitcoin|crypto|forex|invest|profit|dividend|cash|money|banker|trader|loan|credit|debt|mortgage|finance|wealth|fortune|response|reply|confirm|open|report|abuse|compromise|breach|server|client|network|database|placeholder|default|unknown|qwert|asdfg)\b/i,
        /^(.)\1{4,}$/, // 5+ repeated characters in a row (e.g., "aaaaa")
        /^\s+$|^$|^\s*$/, // Only spaces or empty
        /\s{4,}/, // 4+ consecutive spaces
        /(\d)\1{4,}/, // 5+ repeated digits (e.g., "11111")
        /([^a-zA-Z\d\s])\1{4,}/, // 5+ repeated non-alphanumeric characters (e.g., "#####")
        /\b[A-Z]{5,}\d{3,}\b/, // e.g., USER12345
        /\b\d{6,}\b/, // e.g., 123456789
        // Offensive/bad words (expand as needed) - be cautious with this list for names
        /\b(fuck|suck|shit|bitch|asshole|damn|cunt|dick|bastard|slut|whore|motherfucker|pussy|nigger|faggot|retard|idiot|moron|stupid|loser|wanker|chink|gook|kyke|spic|terrorist|jihad|bomb|kill|murder|rape|pedophile|porn|sex|erotic|naked| XXX | hentai| boob|ass|tits|vagina|penis)\b/i,
      ];

      for (const pattern of suspiciousPatterns) {
        if (pattern.test(name)) {
          console.warn(
            `[SECURITY] Suspicious name pattern detected: ${name} for user ${user.id}`
          );

          // Log suspicious activity
          const { SecurityAlert } = await import("@/lib/security/monitor");
          await SecurityAlert.suspiciousRequest(
            "Suspicious name pattern in profile update",
            { name, pattern: pattern.toString() },
            user.id
          );

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

      await db
        .update(users)
        .set({ name, updatedAt: new Date() })
        .where(eq(users.id, user.id));

      // Revalidate the account page to show updated data
      revalidatePath("/account");

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
    }
  }
);

/**
 * Get user information
 * Returns user profile data
 * /account
 */
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

    const [userProfile] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        avatar: users.avatar,
        type: users.type,
        role: users.role,
        oauth: users.oauth,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.id, currentUser.id))
      .limit(1);

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

    const [bookmarkCountResult, favRows] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(bookmarks)
        .where(eq(bookmarks.userId, user.id)),
      db
        .select({
          id: favorites.id,
          postId: favorites.postId,
          createdAt: favorites.createdAt,
        })
        .from(favorites)
        .where(eq(favorites.userId, user.id))
        .orderBy(desc(favorites.createdAt))
        .limit(5),
    ]);
    const totalBookmarks = bookmarkCountResult[0]?.count ?? 0;
    const recentFavorites = await Promise.all(
      favRows.map(async (row) => {
        const post = await Queries.posts.getById(row.postId);
        return post ? { id: row.id, createdAt: row.createdAt, post } : null;
      })
    ).then((arr) => arr.filter((x): x is NonNullable<typeof x> => x !== null));

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

    const [favCountRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(favorites)
      .where(eq(favorites.userId, user.id));
    const totalFavorites = favCountRow?.count ?? 0;

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
  }
}

/**
 * Get comprehensive admin dashboard statistics
 * Returns total counts and growth percentages for posts, users, categories, and tags
 */
/**
 * Get all users with their activity data for admin dashboard
 * Returns comprehensive user information including registration, posts, and last login
 */
export async function getAllUsersActivityAction() {
  try {
    // Require authentication and check admin role
    const currentUser = await getCurrentUser();
    if (!currentUser?.userData) {
      return {
        success: false,
        error: "User not authenticated",
      };
    }

    // Check if user is admin
    if (currentUser.userData.role !== "ADMIN") {
      return {
        success: false,
        error: "Admin access required",
      };
    }

    const userRows = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        avatar: users.avatar,
        type: users.type,
        role: users.role,
        oauth: users.oauth,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt));
    const userIds = userRows.map((u) => u.id);
    const [postCounts, bookmarkCounts, favoriteCounts] = await Promise.all([
      db
        .select({ authorId: posts.authorId, count: sql<number>`count(*)::int` })
        .from(posts)
        .where(eq(posts.isPublished, true))
        .groupBy(posts.authorId),
      db
        .select({ userId: bookmarks.userId, count: sql<number>`count(*)::int` })
        .from(bookmarks)
        .groupBy(bookmarks.userId),
      db
        .select({ userId: favorites.userId, count: sql<number>`count(*)::int` })
        .from(favorites)
        .groupBy(favorites.userId),
    ]);
    const postsByUser = new Map(postCounts.map((r) => [r.authorId, r.count ?? 0]));
    const bookmarksByUser = new Map(bookmarkCounts.map((r) => [r.userId, r.count ?? 0]));
    const favoritesByUser = new Map(favoriteCounts.map((r) => [r.userId, r.count ?? 0]));
    const usersWithCounts = userRows.map((u) => ({
      ...u,
      _count: {
        posts: postsByUser.get(u.id) ?? 0,
        bookmarks: bookmarksByUser.get(u.id) ?? 0,
        favorites: favoritesByUser.get(u.id) ?? 0,
      },
    }));

    const supabase = await createClient();

    const usersWithLastLogin = await Promise.all(
      usersWithCounts.map(async (user) => {
        try {
          // Get user data from Supabase auth using the user ID
          const { data: authUser } = await supabase.auth.getUser(user.id);

          return {
            ...user,
            lastSignInAt: authUser?.user?.last_sign_in_at || null,
          };
        } catch (error) {
          console.warn(`Failed to fetch auth data for user ${user.id}:`, error);
          return {
            ...user,
            lastSignInAt: null,
          };
        }
      })
    );

    const usersActivity = usersWithLastLogin.map((user: (typeof usersWithCounts)[number] & { lastSignInAt: string | null }, index: number) => ({
      id: index + 1, // Use index for table row ID
      userId: user.id, // Keep the actual user ID
      name: user.name || "Unnamed User",
      email: user.email,
      role: user.role,
      userType: user.type,
      provider: user.oauth,
      registeredOn: user.createdAt,
      posts: user._count.posts,
      lastLogin: user.lastSignInAt ? new Date(user.lastSignInAt) : null,
      bookmarks: user._count.bookmarks,
      favorites: user._count.favorites,
    }));

    return {
      success: true,
      users: usersActivity,
    };
  } catch (error) {
    console.error("Get all users activity error:", error);
    return {
      success: false,
      error: "Failed to load user activity data. Please try again.",
    };
  }
}

export async function getAdminDashboardStatsAction() {
  try {
    // Require authentication and check admin role
    const currentUser = await getCurrentUser();
    if (!currentUser?.userData) {
      return {
        success: false,
        error: "User not authenticated",
      };
    }

    // Check if user is admin
    if (currentUser.userData.role !== "ADMIN") {
      return {
        success: false,
        error: "Admin access required",
      };
    }

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(thirtyDaysAgo.getTime() - 30 * 24 * 60 * 60 * 1000);

    const count = async (
      table: typeof posts | typeof users | typeof categories | typeof tags,
      where?: ReturnType<typeof and>
    ) => {
      const q = db.select({ count: sql<number>`count(*)::int` }).from(table);
      const [row] = where ? await q.where(where) : await q;
      return row?.count ?? 0;
    };

    const [
      totalPosts,
      totalUsers,
      totalCategories,
      totalTags,
      newPostsThisMonth,
      newUsersThisMonth,
      newCategoriesThisMonth,
      newTagsThisMonth,
      previousMonthPosts,
      previousMonthUsers,
      previousMonthCategories,
      previousMonthTags,
    ] = await Promise.all([
      count(posts, eq(posts.isPublished, true)),
      count(users),
      count(categories),
      count(tags),
      count(posts, and(eq(posts.isPublished, true), gte(posts.createdAt, thirtyDaysAgo))),
      count(users, gte(users.createdAt, thirtyDaysAgo)),
      count(categories, gte(categories.createdAt, thirtyDaysAgo)),
      count(tags, gte(tags.createdAt, thirtyDaysAgo)),
      count(
        posts,
        and(
          eq(posts.isPublished, true),
          gte(posts.createdAt, sixtyDaysAgo),
          lt(posts.createdAt, thirtyDaysAgo)
        )
      ),
      count(users, and(gte(users.createdAt, sixtyDaysAgo), lt(users.createdAt, thirtyDaysAgo))),
      count(categories, and(gte(categories.createdAt, sixtyDaysAgo), lt(categories.createdAt, thirtyDaysAgo))),
      count(tags, and(gte(tags.createdAt, sixtyDaysAgo), lt(tags.createdAt, thirtyDaysAgo))),
    ]);

    // Calculate growth percentages
    const calculateGrowthPercentage = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100 * 100) / 100;
    };

    const postsGrowth = calculateGrowthPercentage(
      newPostsThisMonth,
      previousMonthPosts
    );
    const usersGrowth = calculateGrowthPercentage(
      newUsersThisMonth,
      previousMonthUsers
    );
    const categoriesGrowth = calculateGrowthPercentage(
      newCategoriesThisMonth,
      previousMonthCategories
    );
    const tagsGrowth = calculateGrowthPercentage(
      newTagsThisMonth,
      previousMonthTags
    );

    const [bookmarkCountRow, favCountRow, categoryCountRows, recentRows] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(bookmarks),
      db.select({ count: sql<number>`count(*)::int` }).from(favorites),
      db
        .select({
          id: categories.id,
          name: categories.name,
          count: sql<number>`count(*)::int`.as("count"),
        })
        .from(categories)
        .innerJoin(posts, and(eq(posts.categoryId, categories.id), eq(posts.isPublished, true)))
        .groupBy(categories.id, categories.name)
        .orderBy(desc(sql`count(*)`))
        .limit(3),
      db
        .select({
          id: posts.id,
          title: posts.title,
          createdAt: posts.createdAt,
          authorName: users.name,
        })
        .from(posts)
        .innerJoin(users, eq(posts.authorId, users.id))
        .where(eq(posts.isPublished, true))
        .orderBy(desc(posts.createdAt))
        .limit(5),
    ]);
    const totalBookmarks = bookmarkCountRow[0]?.count ?? 0;
    const totalFavorites = favCountRow[0]?.count ?? 0;
    const popularCategories = categoryCountRows.map((r) => ({
      id: r.id,
      name: r.name,
      _count: { posts: r.count ?? 0 },
    }));
    const recentActivity = recentRows.map((r) => ({
      id: r.id,
      title: r.title,
      createdAt: r.createdAt,
      author: { name: r.authorName },
    }));

    return {
      success: true,
      data: {
        // Main statistics
        posts: {
          total: totalPosts,
          newThisMonth: newPostsThisMonth,
          growthPercentage: postsGrowth,
        },
        users: {
          total: totalUsers,
          newThisMonth: newUsersThisMonth,
          growthPercentage: usersGrowth,
        },
        categories: {
          total: totalCategories,
          newThisMonth: newCategoriesThisMonth,
          growthPercentage: categoriesGrowth,
        },
        tags: {
          total: totalTags,
          newThisMonth: newTagsThisMonth,
          growthPercentage: tagsGrowth,
        },

        engagement: {
          totalBookmarks,
          totalFavorites,
        },
        popularCategories,
        recentActivity,
      },
    };
  } catch (error) {
    console.error("Get admin dashboard stats error:", error);
    return {
      success: false,
      error: "Failed to load dashboard statistics. Please try again.",
    };
  }
}
