import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  rateLimits,
  getClientIdentifier,
  getRateLimitHeaders,
} from "@/lib/security/limits";
import { sanitizeSearchQuery, SECURITY_HEADERS } from "@/lib/security/sanitize";
import { Queries } from "@/lib/query";
import { getAllCategories } from "@/lib/content";

// Ensure Node.js runtime to support Prisma and jsdom/DOMPurify used in sanitization
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  let currentUser = null;
  let userId: string | undefined;
  
  try {
    // Get current user for bookmark/favorite status with error handling
    try {
      currentUser = await getCurrentUser();
      userId = currentUser?.userData?.id;
    } catch (userError) {
      console.warn("Auth check failed (proceeding as anonymous):", userError);
      // Continue as anonymous user - don't fail the entire request
      userId = undefined;
    }

    // Rate limiting
    const clientId = getClientIdentifier(request, userId);
    const rateLimitResult = await rateLimits.search(clientId);

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: "Too many requests. Please try again later.",
          retryAfter: Math.ceil(
            (rateLimitResult.resetTime - Date.now()) / 1000
          ),
        },
        {
          status: 429,
          headers: {
            ...SECURITY_HEADERS,
            ...getRateLimitHeaders(rateLimitResult),
            "Retry-After": String(
              Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
            ),
          },
        }
      );
    }

    // Parse and validate search parameters
    const { searchParams } = new URL(request.url);
    const rawParams = {
      page: searchParams.get("page") || "1",
      limit: searchParams.get("limit") || "12",
      q: searchParams.get("q") || "",
      category: searchParams.get("category") || "",
      subcategory: searchParams.get("subcategory") || "",
      premium: searchParams.get("premium") || "",
      sortBy: searchParams.get("sortBy") || "latest",
    };

    // Validate and sanitize parameters with better error handling
    let page: number;
    let limit: number;
    
    try {
      page = Math.max(1, Math.min(100, parseInt(rawParams.page, 10) || 1));
      limit = Math.max(1, Math.min(50, parseInt(rawParams.limit, 10) || 12));
    } catch (parseError) {
      console.warn("Parameter parsing error:", parseError);
      page = 1;
      limit = 12;
    }

    let searchQuery: string;
    try {
      searchQuery = await sanitizeSearchQuery(rawParams.q);
    } catch (sanitizeError) {
      console.warn("Search query sanitization failed:", sanitizeError);
      searchQuery = "";
    }

    const categoryFilter = rawParams.category;
    const subcategoryFilter = rawParams.subcategory;
    const premiumFilter = rawParams.premium;
    const sortBy = ["latest", "popular", "trending"].includes(rawParams.sortBy)
      ? (rawParams.sortBy as "latest" | "popular" | "trending")
      : "latest";

    // Get categories to convert slugs to IDs with error handling
    let categories: Array<{ id: string; slug: string; name: string }> = [];
    try {
      categories = await getAllCategories();
    } catch (categoryError) {
      console.warn("Failed to load categories (proceeding without category filter):", categoryError);
      // Continue without category filtering rather than failing
    }

    // Determine category ID for filtering (convert slug to ID)
    let categoryId: string | undefined;
    try {
      if (
        subcategoryFilter &&
        subcategoryFilter !== "all" &&
        subcategoryFilter !== "none" &&
        categories.length > 0
      ) {
        // Find the actual category ID from the slug
        const subcategory = categories.find((c) => c.slug === subcategoryFilter);
        categoryId = subcategory?.id;
      } else if (categoryFilter && categoryFilter !== "all" && categories.length > 0) {
        // Find the actual category ID from the slug
        const category = categories.find((c) => c.slug === categoryFilter);
        categoryId = category?.id;
      }
    } catch (categoryIdError) {
      console.warn("Category ID resolution failed:", categoryIdError);
      categoryId = undefined;
    }

    // Handle premium filter
    let isPremium: boolean | undefined;
    if (premiumFilter === "premium" || premiumFilter === "true") {
      isPremium = true;
    } else if (premiumFilter === "free" || premiumFilter === "false") {
      isPremium = false;
    }

    let result;

    // Use search or paginated query based on search query presence
    try {
      if (searchQuery && searchQuery.trim()) {
        // Use optimized search query
        result = await Queries.posts.search(searchQuery, {
          page,
          limit,
          userId,
          categoryId,
          isPremium,
        });
      } else {
        // Use optimized paginated query
        result = await Queries.posts.getPaginated({
          page,
          limit,
          userId,
          categoryId,
          isPremium,
          sortBy,
        });
      }
    } catch (queryError) {
      console.error("Database query failed:", queryError);
      
      // Return fallback empty result rather than 500 error
      result = {
        data: [],
        pagination: {
          totalCount: 0,
          totalPages: 0,
          currentPage: page,
          pageSize: limit,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };
    }

    // Ensure result structure is valid
    if (!result || !result.data || !result.pagination) {
      console.warn("Invalid query result, using fallback");
      result = {
        data: [],
        pagination: {
          totalCount: 0,
          totalPages: 0,
          currentPage: page,
          pageSize: limit,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };
    }

    // Transform the response to match expected structure (posts instead of data)
    const responseData = {
      posts: result.data,
      pagination: result.pagination,
    };

    // Determine cache strategy based on user authentication
    const cacheHeaders = userId
      ? {
          // For authenticated users, use private cache with shorter duration
          // to ensure bookmark/favorite state is fresh
          "Cache-Control": "private, max-age=60, stale-while-revalidate=120",
        }
      : {
          // For anonymous users, longer public cache is fine
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        };

    return NextResponse.json(responseData, {
      status: 200,
      headers: {
        ...SECURITY_HEADERS,
        ...getRateLimitHeaders(rateLimitResult),
        ...cacheHeaders,
      },
    });
  } catch (error) {
    // Enhanced error logging for better debugging
    const errorDetails = {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
      userId: userId || "anonymous",
      url: request.url,
      method: request.method,
    };
    
    console.error("Posts API error:", errorDetails);
    
    // Return a more specific error response
    return NextResponse.json(
      {
        error: "Failed to fetch posts",
        message: "An error occurred while loading posts. Please try again.",
        details: process.env.NODE_ENV === "development" ? errorDetails : undefined,
        fallback: {
          posts: [],
          pagination: {
            totalCount: 0,
            totalPages: 0,
            currentPage: 1,
            pageSize: 12,
            hasNextPage: false,
            hasPreviousPage: false,
          },
        },
      },
      {
        status: 500,
        headers: SECURITY_HEADERS,
      }
    );
  }
}

// Disable other HTTP methods for security
export async function POST() {
  return NextResponse.json(
    { error: "Method not allowed" },
    { status: 405, headers: SECURITY_HEADERS }
  );
}

export async function PUT() {
  return NextResponse.json(
    { error: "Method not allowed" },
    { status: 405, headers: SECURITY_HEADERS }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: "Method not allowed" },
    { status: 405, headers: SECURITY_HEADERS }
  );
}

export async function PATCH() {
  return NextResponse.json(
    { error: "Method not allowed" },
    { status: 405, headers: SECURITY_HEADERS }
  );
}
