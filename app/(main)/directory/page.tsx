import { getAllCategories } from "@/lib/content";
import { getCurrentUser } from "@/lib/auth";
import { Suspense } from "react";
import { PostMasonrySkeleton } from "@/components/post-masonry-skeleton";
import { DirectoryFilters } from "@/components/directory-filters";
import { Skeleton } from "@/components/ui/skeleton";
import { InfinitePostGrid } from "@/components/infinite-scroll-grid";
import { Container } from "@/components/ui/container";
import { OptimizedQueries } from "@/lib/queries";

interface DirectoryPageProps {
  searchParams: Promise<{
    q?: string;
    category?: string;
    subcategory?: string;
    premium?: string;
  }>;
}

// Route segment config for better caching
export const revalidate = 300; // Revalidate every 5 minutes (matches CACHE_DURATIONS.POSTS_LIST)

// Directory page skeleton that matches the full layout
function DirectoryPageSkeleton() {
  return (
    <Container>
      {/* Header Skeleton */}
      <div className="mb-8">
        <Skeleton className="h-10 w-80 mb-4" />
        <Skeleton className="h-6 w-full max-w-2xl" />
      </div>

      {/* Filters Skeleton */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search skeleton */}
          <div className="relative flex-1">
            <Skeleton className="h-10 w-full" />
          </div>

          {/* Category filter skeleton */}
          <Skeleton className="h-10 w-full md:w-48" />

          {/* Premium filter skeleton */}
          <Skeleton className="h-10 w-full md:w-32" />

          {/* Buttons skeleton */}
          <div className="flex gap-2">
            <Skeleton className="h-10 w-20" />
            <Skeleton className="h-10 w-16" />
          </div>
        </div>
      </div>

      {/* Results summary skeleton */}
      <div className="mb-6">
        <Skeleton className="h-5 w-48" />
      </div>

      {/* Posts grid skeleton */}
      <PostMasonrySkeleton count={16} />
    </Container>
  );
}

async function DirectoryContent({
  searchParams,
}: {
  searchParams: DirectoryPageProps["searchParams"];
}) {
  const [categories, params, currentUser] = await Promise.all([
    getAllCategories(),
    searchParams,
    getCurrentUser(),
  ]);

  const {
    q: searchQuery,
    category: categoryFilter,
    subcategory: subcategoryFilter,
    premium: premiumFilter,
  } = params;

  const userId = currentUser?.userData?.id;
  const userType = currentUser?.userData?.type || null;

  // Determine category ID for filtering
  let categoryId: string | undefined;
  if (
    subcategoryFilter &&
    subcategoryFilter !== "all" &&
    subcategoryFilter !== "none"
  ) {
    categoryId = subcategoryFilter;
  } else if (categoryFilter && categoryFilter !== "all") {
    categoryId = categoryFilter;
  }

  // Handle premium filter
  let isPremium: boolean | undefined;
  if (premiumFilter === "premium") {
    isPremium = true;
  } else if (premiumFilter === "free") {
    isPremium = false;
  }

  // Use optimized queries based on search presence
  let result;
  if (searchQuery && searchQuery.trim()) {
    // Use search query
    result = await OptimizedQueries.posts.search(searchQuery, {
      page: 1,
      limit: 24, // Load more for initial view
      userId,
      categoryId,
      isPremium,
    });
  } else {
    // Use paginated query
    result = await OptimizedQueries.posts.getPaginated({
      page: 1,
      limit: 24, // Load more for initial view
      userId,
      categoryId,
      isPremium,
      sortBy: "latest",
    });
  }

  const { data: posts, pagination } = result;

  return (
    <Container>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Prompt Directory</h1>
        <p className="text-muted-foreground text-lg max-w-2xl">
          Discover and explore our curated collection of AI prompts. Find the
          perfect prompt for your creative and professional needs.
        </p>
      </div>

      {/* Filters */}
      <div className="mb-8">
        <DirectoryFilters categories={categories} />
      </div>

      {/* Results Summary */}
      <div className="mb-6">
        <p className="text-sm text-muted-foreground">
          {searchQuery ? (
            <>
              Found {pagination.totalCount} result
              {pagination.totalCount !== 1 ? "s" : ""} for &quot;{searchQuery}
              &quot;
            </>
          ) : (
            <>
              Showing {pagination.totalCount} prompt
              {pagination.totalCount !== 1 ? "s" : ""}
              {categoryFilter && categoryFilter !== "all" && (
                <>
                  {" "}
                  in{" "}
                  {categories.find((c) => c.slug === categoryFilter)?.name ||
                    categoryFilter}
                </>
              )}
            </>
          )}
        </p>
      </div>

      {/* Posts Grid with Infinite Scroll */}
      <InfinitePostGrid
        initialPosts={posts as any} // eslint-disable-line @typescript-eslint/no-explicit-any
        hasNextPage={pagination.hasNextPage}
        totalCount={pagination.totalCount}
        userType={userType}
      />
    </Container>
  );
}

export default function DirectoryPage({ searchParams }: DirectoryPageProps) {
  return (
    <Suspense fallback={<DirectoryPageSkeleton />}>
      <DirectoryContent searchParams={searchParams} />
    </Suspense>
  );
}
