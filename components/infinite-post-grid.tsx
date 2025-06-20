"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { PostMasonryGrid } from "@/components/post-masonry-grid";
import { PostWithInteractions } from "@/lib/content";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface InfinitePostGridProps {
  initialPosts: PostWithInteractions[];
  totalCount: number;
  hasNextPage: boolean;
}

interface PostsResponse {
  posts: PostWithInteractions[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export function InfinitePostGrid({
  initialPosts,
  totalCount,
  hasNextPage: initialHasNextPage,
}: InfinitePostGridProps) {
  const [posts, setPosts] = useState<PostWithInteractions[]>(initialPosts);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(initialHasNextPage);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadingRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();
  const previousSearchParamsRef = useRef<string>("");
  const hasUserScrolledRef = useRef(false);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isLoadingRequestRef = useRef(false);

  // Create a stable key for the search params to detect changes
  const searchParamsKey = useMemo(() => {
    const params = new URLSearchParams();
    const q = searchParams.get("q");
    const category = searchParams.get("category");
    const premium = searchParams.get("premium");

    if (q) params.set("q", q);
    if (category) params.set("category", category);
    if (premium) params.set("premium", premium);

    return params.toString();
  }, [searchParams]);

  // Reset posts when search params change
  useEffect(() => {
    if (previousSearchParamsRef.current !== searchParamsKey) {
      setPosts(initialPosts);
      setCurrentPage(1);
      setHasNextPage(initialHasNextPage);
      setError(null);
      hasUserScrolledRef.current = false; // Reset scroll state on search change
      isLoadingRequestRef.current = false; // Reset loading state
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
      previousSearchParamsRef.current = searchParamsKey;
    }
  }, [initialPosts, initialHasNextPage, searchParamsKey]);

  const loadMorePosts = useCallback(async () => {
    // Prevent multiple simultaneous requests
    if (isLoading || !hasNextPage || isLoadingRequestRef.current) return;

    // Clear any pending timeout
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }

    isLoadingRequestRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set("page", (currentPage + 1).toString());
      params.set("limit", "12");

      // Add current search parameters
      const q = searchParams.get("q");
      const category = searchParams.get("category");
      const premium = searchParams.get("premium");

      if (q) params.set("q", q);
      if (category) params.set("category", category);
      if (premium) params.set("premium", premium);

      const response = await fetch(`/api/posts?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: PostsResponse = await response.json();

      // Use functional update to ensure we're working with the latest state
      setPosts((prevPosts) => {
        // Create a Set of existing post IDs to avoid duplicates
        const existingIds = new Set(prevPosts.map((post) => post.id));

        // Filter out any posts that already exist (safety check)
        const newPosts = data.posts.filter((post) => !existingIds.has(post.id));

        // Return the combined array maintaining order
        return [...prevPosts, ...newPosts];
      });

      setCurrentPage(data.pagination.currentPage);
      setHasNextPage(data.pagination.hasNextPage);
    } catch (error) {
      console.error("Error loading more posts:", error);
      setError("Failed to load more posts. Please try again.");
    } finally {
      setIsLoading(false);
      isLoadingRequestRef.current = false;
    }
  }, [currentPage, hasNextPage, isLoading, searchParams]);

  // Debounced loading function
  const debouncedLoadMore = useCallback(() => {
    // Clear any existing timeout
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
    }

    // Set a new timeout
    loadingTimeoutRef.current = setTimeout(() => {
      loadMorePosts();
    }, 300); // 300ms debounce
  }, [loadMorePosts]);

  // Intersection Observer for automatic loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const target = entries[0];
        if (
          target.isIntersecting &&
          hasNextPage &&
          !isLoading &&
          hasUserScrolledRef.current &&
          !isLoadingRequestRef.current
        ) {
          debouncedLoadMore();
        }
      },
      {
        threshold: 0.1,
        rootMargin: "100px", // Reduced margin - only load when very close to the loading element
      }
    );

    if (loadingRef.current) {
      observer.observe(loadingRef.current);
    }

    return () => {
      if (loadingRef.current) {
        observer.unobserve(loadingRef.current);
      }
    };
  }, [debouncedLoadMore, hasNextPage, isLoading]);

  // Additional scroll-based loading trigger for better UX
  useEffect(() => {
    const handleScroll = () => {
      // Mark that user has scrolled at least once
      if (!hasUserScrolledRef.current) {
        hasUserScrolledRef.current = true;
        return; // Don't load on first scroll detection
      }

      // Only trigger if we're not already loading and have more content
      if (isLoading || !hasNextPage || isLoadingRequestRef.current) return;

      const scrollTop =
        window.pageYOffset || document.documentElement.scrollTop;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;

      // Only trigger if there's actually scrollable content and user has scrolled meaningfully
      if (documentHeight <= windowHeight || scrollTop < 200) return;

      // Calculate how much content is left below the viewport
      const remainingContent = documentHeight - (scrollTop + windowHeight);

      // Only trigger when there's less than 300px of content remaining
      // This ensures loading happens near the actual bottom, not at 80% of a short page
      if (remainingContent < 300) {
        debouncedLoadMore();
      }
    };

    // Throttle scroll events for performance
    let ticking = false;
    const throttledScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    // Add a small delay before attaching scroll listener to prevent immediate firing
    const timer = setTimeout(() => {
      window.addEventListener("scroll", throttledScroll, { passive: true });
    }, 2000); // Increased delay to 2 seconds

    return () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", throttledScroll);
    };
  }, [debouncedLoadMore, hasNextPage, isLoading]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, []);

  // Memoize the posts array to prevent unnecessary re-renders
  const memoizedPosts = useMemo(() => posts, [posts]);

  return (
    <div className="space-y-6">
      {/* Posts Grid with stable key */}
      <div key={`posts-${searchParamsKey}`}>
        <PostMasonryGrid posts={memoizedPosts} />
      </div>

      {/* Loading indicator and load more button */}
      <div ref={loadingRef} className="flex flex-col items-center space-y-4">
        {isLoading && (
          <div className="flex items-center space-x-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-muted-foreground">Loading more posts...</span>
          </div>
        )}

        {error && (
          <div className="text-center space-y-2">
            <p className="text-destructive text-sm">{error}</p>
            <Button
              onClick={loadMorePosts}
              variant="outline"
              size="sm"
              disabled={isLoading || isLoadingRequestRef.current}
            >
              Try Again
            </Button>
          </div>
        )}

        {hasNextPage && !isLoading && !error && (
          <Button
            onClick={debouncedLoadMore}
            variant="outline"
            size="lg"
            disabled={isLoading || isLoadingRequestRef.current}
            className="min-w-[200px]"
          >
            Load More Posts
          </Button>
        )}

        {!hasNextPage && posts.length > 0 && (
          <div className="text-center py-6">
            <p className="text-muted-foreground">
              You&apos;ve reached the end! Showing all {posts.length} of{" "}
              {totalCount} posts.
            </p>
          </div>
        )}

        {posts.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No posts found.</p>
          </div>
        )}
      </div>
    </div>
  );
}
