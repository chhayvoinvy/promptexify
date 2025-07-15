"use client";

import { DirectoryFilters } from "@/components/directory-filters";
import { InfinitePostGrid } from "@/components/infinite-scroll-grid";
import { Container } from "@/components/ui/container";
import { PostWithInteractions } from "@/lib/content";
import { Badge } from "@/components/ui/badge";

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
  premiumFilter,
  pagination,
}: DirectoryClientWrapperProps) {
  // Separate parent and child categories for active filter display
  const parentCategories = categories.filter((cat) => !cat.parent);
  const childCategories = categoryFilter && categoryFilter !== "all" 
    ? categories.filter((cat) => cat.parent?.slug === categoryFilter)
    : [];

  const hasActiveFilters =
    searchQuery ||
    (categoryFilter && categoryFilter !== "all") ||
    (subcategoryFilter && subcategoryFilter !== "all") ||
    (premiumFilter && premiumFilter !== "all");

  return (
    <Container>
      {/* Header: Two-column layout */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-8 gap-4">
        {/* Left: Title and description */}
        <div className="flex-1">
          <h1 className="text-2xl font-bold mb-2">Prompt Directory</h1>
          <p className="text-muted-foreground text-lg max-w-2xl">
            Discover and explore our curated collection of AI prompts. Find the
            perfect prompt for your creative and professional needs.
          </p>
        </div>
        {/* Right: Filter button */}
        <div className="flex flex-col items-end gap-2 min-w-[200px]">
          <DirectoryFilters categories={categories} />
        </div>
      </div>

      {/* Active filters summary */}
      {hasActiveFilters && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Active filters:</span>
          {searchQuery && (
            <Badge variant="secondary" className="text-xs">
              Search: &ldquo;{searchQuery}&rdquo;
            </Badge>
          )}
          {categoryFilter && categoryFilter !== "all" && (
            <Badge variant="secondary" className="text-xs">
              Category: {parentCategories.find((c) => c.slug === categoryFilter)?.name}
            </Badge>
          )}
          {subcategoryFilter && subcategoryFilter !== "all" && (
            <Badge variant="secondary" className="text-xs">
              Subcategory: {childCategories.find((c) => c.slug === subcategoryFilter)?.name}
            </Badge>
          )}
          {premiumFilter && premiumFilter !== "all" && (
            <Badge variant="secondary" className="text-xs">
              Type: {premiumFilter === "premium" ? "Premium" : "Free"}
            </Badge>
          )}
        </div>
      )}

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