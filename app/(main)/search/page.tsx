import { getAllCategories, type SortOption } from "@/lib/content";
import { getCurrentUser } from "@/lib/auth";
import { Suspense } from "react";
import { PostMasonrySkeleton } from "@/components/post-masonry-skeleton";
import { DirectoryFilters } from "@/components/directory-filters";
import { Container } from "@/components/ui/container";
import { OptimizedQueries } from "@/lib/query";
import { getSettingsAction } from "@/actions/settings";
import { PostMasonryGrid } from "@/components/post-masonry-grid";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Search } from "@/components/ui/icons";

export const dynamic = "force-dynamic"; // Required because we use getCurrentUser() which accesses cookies

interface SearchPageProps {
  searchParams: Promise<{
    q?: string;
    category?: string;
    subcategory?: string;
    premium?: string;
    page?: string;
    sort?: string;
  }>;
}

async function SearchResults({
  searchParams,
}: {
  searchParams: SearchPageProps["searchParams"];
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
    page: pageParam = "1",
    sort: sortBy = "latest",
  } = params;

  const userId = currentUser?.userData?.id;
  const userType = currentUser?.userData?.type || null;

  // Parse page number
  const page = Math.max(1, parseInt(pageParam, 10) || 1);

  // Determine category ID for filtering
  let categoryId: string | undefined;
  if (
    subcategoryFilter &&
    subcategoryFilter !== "all" &&
    subcategoryFilter !== "none"
  ) {
    const subcategory = categories.find((c) => c.slug === subcategoryFilter);
    categoryId = subcategory?.id;
  } else if (categoryFilter && categoryFilter !== "all") {
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

  // Use search query if provided, otherwise show all posts
  let result;
  if (searchQuery && searchQuery.trim()) {
    result = await OptimizedQueries.posts.search(searchQuery, {
      page,
      limit: postsPageSize,
      userId,
      categoryId,
      isPremium,
    });
  } else {
    result = await OptimizedQueries.posts.getPaginated({
      page,
      limit: postsPageSize,
      userId,
      categoryId,
      isPremium,
      sortBy: sortBy as SortOption,
    });
  }

  const { data: posts, pagination } = result;

  return (
    <>
      {/* Results Summary */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          {searchQuery ? (
            <h1 className="text-2xl font-bold mb-2">
              Search Results for &ldquo;{searchQuery}&rdquo;
            </h1>
          ) : (
            <h1 className="text-2xl font-bold mb-2">All Prompts</h1>
          )}
          <p className="text-sm text-muted-foreground">
            {searchQuery ? (
              <>
                Found {pagination.totalCount} result
                {pagination.totalCount !== 1 ? "s" : ""}
              </>
            ) : (
              <>
                Showing {pagination.totalCount} prompt
                {pagination.totalCount !== 1 ? "s" : ""}
              </>
            )}
            {((categoryFilter && categoryFilter !== "all") ||
              (subcategoryFilter && subcategoryFilter !== "all")) && (
              <>
                {" "}
                {subcategoryFilter && subcategoryFilter !== "all" ? (
                  <>
                    in{" "}
                    {categories.find((c) => c.slug === subcategoryFilter)
                      ?.name || subcategoryFilter}
                  </>
                ) : (
                  <>
                    in{" "}
                    {categories.find((c) => c.slug === categoryFilter)?.name ||
                      categoryFilter}
                  </>
                )}
              </>
            )}
          </p>
        </div>
      </div>

      {/* Search Results */}
      {posts.length > 0 ? (
        <div className="space-y-8">
          <PostMasonryGrid posts={posts} userType={userType} />

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-8">
              {pagination.hasPreviousPage && (
                <Button variant="outline" asChild>
                  <Link
                    href={{
                      pathname: "/search",
                      query: {
                        ...params,
                        page: page - 1,
                      },
                    }}
                  >
                    Previous
                  </Link>
                </Button>
              )}

              <span className="px-4 py-2 text-sm text-muted-foreground">
                Page {pagination.currentPage} of {pagination.totalPages}
              </span>

              {pagination.hasNextPage && (
                <Button variant="outline" asChild>
                  <Link
                    href={{
                      pathname: "/search",
                      query: {
                        ...params,
                        page: page + 1,
                      },
                    }}
                  >
                    Next
                  </Link>
                </Button>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-12">
          <Search className="mx-auto h-16 w-16 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-semibold mb-2">No results found</h3>
          <p className="text-muted-foreground mb-6">
            {searchQuery ? (
              <>
                No prompts found matching &ldquo;{searchQuery}&rdquo;. <br />
                Try adjusting your search terms or filters.
              </>
            ) : (
              <>
                No prompts match your current filters. <br />
                Try adjusting your filter criteria.
              </>
            )}
          </p>
          <Button variant="outline" asChild>
            <Link href="/directory">Browse All Prompts</Link>
          </Button>
        </div>
      )}
    </>
  );
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const categories = await getAllCategories();

  return (
    <Container className="py-8">
      {/* Filters */}
      <div className="mb-8">
        <DirectoryFilters categories={categories} />
      </div>

      <Suspense fallback={<PostMasonrySkeleton />}>
        <SearchResults searchParams={searchParams} />
      </Suspense>
    </Container>
  );
}
