"use client";

import { DirectoryFilters } from "@/components/directory-filters";
import { Container } from "@/components/ui/container";
import { PostMasonryGrid } from "@/components/post-masonry-grid";
import { Button } from "@/components/ui/button";
import { Search } from "@/components/ui/icons";
import Link from "next/link";
import { PostWithInteractions } from "@/lib/content";

type CategoryWithCount = Awaited<
  ReturnType<typeof import("@/lib/content").getAllCategories>
>[0];

interface SearchClientWrapperProps {
  categories: CategoryWithCount[];
  posts: PostWithInteractions[];
  userType?: "FREE" | "PREMIUM" | null;
  searchQuery?: string;
  categoryFilter?: string;
  subcategoryFilter?: string;
  pagination: {
    totalCount: number;
    totalPages: number;
    currentPage: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  searchParams: {
    q?: string;
    category?: string;
    subcategory?: string;
    premium?: string;
    page?: string;
    sort?: string;
  };
}

export function SearchClientWrapper({
  categories,
  posts,
  userType,
  searchQuery,
  categoryFilter,
  subcategoryFilter,
  pagination,
  searchParams,
}: SearchClientWrapperProps) {
  return (
    <Container className="py-8">
      {/* Filters */}
      <div className="mb-8">
        <DirectoryFilters categories={categories} />
      </div>

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
                        ...searchParams,
                        page: pagination.currentPage - 1,
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
                        ...searchParams,
                        page: pagination.currentPage + 1,
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
    </Container>
  );
} 