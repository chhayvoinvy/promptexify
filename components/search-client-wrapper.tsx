"use client";

import { DirectoryFilters } from "@/components/directory-filters";
import { Container } from "@/components/ui/container";
import { PostMasonryGrid } from "@/components/post-masonry-grid";
import { Button } from "@/components/ui/button";
import { Search } from "@/components/ui/icons";
import Link from "next/link";
import { PostWithInteractions } from "@/lib/content";

interface SearchClientWrapperProps {
  posts: PostWithInteractions[];
  userType?: "FREE" | "PREMIUM" | null;
  searchQuery?: string;
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
  posts,
  userType,
  searchQuery,
  pagination,
  searchParams,
}: SearchClientWrapperProps) {
  return (
    <Container className="py-8">
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="flex-1">
          {searchQuery ? (
            <>
              <h1 className="text-2xl font-bold mb-1">
                Results for &ldquo;{searchQuery}&rdquo;
              </h1>
              <p className="text-sm text-muted-foreground">
                {pagination.totalCount === 0
                  ? "No results found"
                  : `${pagination.totalCount} result${pagination.totalCount !== 1 ? "s" : ""} found`}
              </p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold mb-1">All Prompts</h1>
              <p className="text-sm text-muted-foreground">
                {pagination.totalCount} prompt{pagination.totalCount !== 1 ? "s" : ""} available
              </p>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <DirectoryFilters />
        </div>
      </div>

      {/* Search Results */}
      {posts.length > 0 ? (
        <div className="space-y-8">
          <PostMasonryGrid posts={posts} userType={userType} />

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex justify-center items-center gap-3 mt-8">
              <Button
                variant="outline"
                size="sm"
                asChild
                disabled={!pagination.hasPreviousPage}
              >
                <Link
                  href={{
                    pathname: "/search",
                    query: {
                      ...searchParams,
                      page: pagination.currentPage - 1,
                    },
                  }}
                  aria-label="Previous page"
                  className={!pagination.hasPreviousPage ? "pointer-events-none opacity-50" : ""}
                >
                  Previous
                </Link>
              </Button>

              <span className="px-4 py-2 text-sm text-muted-foreground tabular-nums">
                Page {pagination.currentPage} of {pagination.totalPages}
              </span>

              <Button
                variant="outline"
                size="sm"
                asChild
                disabled={!pagination.hasNextPage}
              >
                <Link
                  href={{
                    pathname: "/search",
                    query: {
                      ...searchParams,
                      page: pagination.currentPage + 1,
                    },
                  }}
                  aria-label="Next page"
                  className={!pagination.hasNextPage ? "pointer-events-none opacity-50" : ""}
                >
                  Next
                </Link>
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-16">
          <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Search className="h-8 w-8 text-muted-foreground/50" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No results found</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            {searchQuery ? (
              <>
                We couldn&apos;t find any prompts matching &ldquo;{searchQuery}&rdquo;.
                Try using different keywords, checking for typos, or broadening your search.
              </>
            ) : (
              <>
                No prompts match your current filters.
                Try adjusting your filter criteria or clearing all filters.
              </>
            )}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {searchQuery && (
              <Button variant="outline" asChild>
                <Link href="/search">Clear Search</Link>
              </Button>
            )}
            <Button variant="outline" asChild>
              <Link href="/directory">Browse All Prompts</Link>
            </Button>
          </div>
        </div>
      )}
    </Container>
  );
}
