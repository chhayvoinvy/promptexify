import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  rateLimits,
  getClientIdentifier,
  getRateLimitHeaders,
} from "@/lib/limits";
import { sanitizeSearchQuery, SECURITY_HEADERS } from "@/lib/sanitize";
import { Queries } from "@/lib/query";
import { getAllCategories } from "@/lib/content";

export async function GET(request: NextRequest) {
  try {
    // Get current user for bookmark/favorite status
    const currentUser = await getCurrentUser();
    const userId = currentUser?.userData?.id;

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

    // Validate and sanitize parameters
    const page = Math.max(1, Math.min(100, parseInt(rawParams.page, 10) || 1));
    const limit = Math.max(
      1,
      Math.min(50, parseInt(rawParams.limit, 10) || 12)
    );
    const searchQuery = sanitizeSearchQuery(rawParams.q);
    const categoryFilter = rawParams.category;
    const subcategoryFilter = rawParams.subcategory;
    const premiumFilter = rawParams.premium;
    const sortBy = ["latest", "popular", "trending"].includes(rawParams.sortBy)
      ? (rawParams.sortBy as "latest" | "popular" | "trending")
      : "latest";

    // Get categories to convert slugs to IDs
    const categories = await getAllCategories();

    // Determine category ID for filtering (convert slug to ID)
    let categoryId: string | undefined;
    if (
      subcategoryFilter &&
      subcategoryFilter !== "all" &&
      subcategoryFilter !== "none"
    ) {
      // Find the actual category ID from the slug
      const subcategory = categories.find((c) => c.slug === subcategoryFilter);
      categoryId = subcategory?.id;
    } else if (categoryFilter && categoryFilter !== "all") {
      // Find the actual category ID from the slug
      const category = categories.find((c) => c.slug === categoryFilter);
      categoryId = category?.id;
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
    console.error("Posts API error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch posts",
        details:
          process.env.NODE_ENV === "development" ? String(error) : undefined,
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
