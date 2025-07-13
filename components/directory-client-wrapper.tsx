"use client";

import { DirectoryFilters } from "@/components/directory-filters";
import { InfinitePostGrid } from "@/components/infinite-scroll-grid";
import { Container } from "@/components/ui/container";
import { PostWithInteractions } from "@/lib/content";

type CategoryWithCount = Awaited<
  ReturnType<typeof import("@/lib/content").getAllCategories>
>[0];

interface DirectoryClientWrapperProps {
  categories: CategoryWithCount[];
  initialPosts: PostWithInteractions[];
  hasNextPage: boolean;
  totalCount: number;
  userType?: "FREE" | "PREMIUM" | null;
  pageSize: number;
  searchQuery?: string;
  categoryFilter?: string;
  subcategoryFilter?: string;
  premiumFilter?: string;
  pagination: {
    totalCount: number;
    hasNextPage: boolean;
  };
}

export function DirectoryClientWrapper({
  categories,
  initialPosts,
  userType,
  pageSize,
  searchQuery,
  categoryFilter,
  subcategoryFilter,
  pagination,
}: DirectoryClientWrapperProps) {
  return (
    <Container>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-4">Prompt Directory</h1>
        <p className="text-muted-foreground text-lg max-w-2xl">
          Discover and explore our curated collection of AI prompts. Find the
          perfect prompt for your creative and professional needs.
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6">
        <DirectoryFilters categories={categories} />
      </div>

      {/* Results Summary */}
      <div className="mb-6 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
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
                      {categories.find((c) => c.slug === categoryFilter)
                        ?.name || categoryFilter}
                    </>
                  )}
                </>
              )}
            </>
          )}
        </p>
      </div>

      {/* Posts Grid with Infinite Scroll */}
      <InfinitePostGrid
        initialPosts={initialPosts}
        hasNextPage={pagination.hasNextPage}
        totalCount={pagination.totalCount}
        userType={userType}
        pageSize={pageSize}
      />
    </Container>
  );
} 