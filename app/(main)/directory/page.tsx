import { getAllCategories } from "@/lib/content";
import { getCurrentUser } from "@/lib/auth";
import { Suspense } from "react";
import { PostMasonrySkeleton } from "@/components/post-masonry-skeleton";
import { DirectoryClientWrapper } from "@/components/directory-client-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { Container } from "@/components/ui/container";
import { Queries } from "@/lib/query";

import { getSettingsAction } from "@/actions/settings";

interface DirectoryPageProps {
  searchParams: Promise<{
    q?: string;
    category?: string;
    subcategory?: string;
    premium?: string;
  }>;
}

export const dynamic = "force-dynamic";

// Directory page skeleton that matches the full layout
function DirectoryPageSkeleton() {
  return (
    <Container>
      {/* Header: Two-column layout skeleton */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-8 gap-4">
        {/* Left: Title and description skeleton */}
        <div className="flex-1">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-5 w-full max-w-2xl" />
        </div>
        {/* Right: Filter button skeleton */}
        <div className="flex flex-col items-end gap-2 min-w-[200px]">
          <Skeleton className="h-10 w-32" />
        </div>
      </div>

      {/* Active filters skeleton - only show if there might be filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-5 w-24 rounded-full" />
        <Skeleton className="h-5 w-28 rounded-full" />
      </div>

      {/* Results summary skeleton */}
      <div className="mb-6 flex items-center justify-between">
        <Skeleton className="h-4 w-48" />
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
  const [categories, params, currentUser, settingsResult] = await Promise.all([
    getAllCategories(),
    searchParams,
    getCurrentUser(),
    getSettingsAction(),
  ]);

  const postsPageSize =
    settingsResult?.success && settingsResult.data?.postsPageSize
      ? settingsResult.data.postsPageSize
      : 12;

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
  if (premiumFilter === "premium") {
    isPremium = true;
  } else if (premiumFilter === "free") {
    isPremium = false;
  }

  // Use optimized queries based on search presence
  let result;
  if (searchQuery && searchQuery.trim()) {
    // Use search query
    result = await Queries.posts.search(searchQuery, {
      page: 1,
      limit: postsPageSize, // Use setting
      userId,
      categoryId,
      isPremium,
    });
  } else {
    // Use paginated query
    result = await Queries.posts.getPaginated({
      page: 1,
      limit: postsPageSize, // Use setting
      userId,
      categoryId,
      isPremium,
      sortBy: "latest",
    });
  }

  const { data: posts, pagination } = result;

  return (
    <DirectoryClientWrapper
      categories={categories}
      initialPosts={posts}
      hasNextPage={pagination.hasNextPage}
      totalCount={pagination.totalCount}
      userType={userType}
      pageSize={postsPageSize}
      searchQuery={searchQuery}
      categoryFilter={categoryFilter}
      subcategoryFilter={subcategoryFilter}
      premiumFilter={premiumFilter}
      pagination={pagination}
    />
  );
}

export default function DirectoryPage({ searchParams }: DirectoryPageProps) {
  return (
    <Suspense fallback={<DirectoryPageSkeleton />}>
      <DirectoryContent searchParams={searchParams} />
    </Suspense>
  );
}
