import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

interface UsePrefetchPostsOptions {
  /**
   * How far before the element enters the viewport to start prefetching
   * @default "100px 0px 500px 0px"
   */
  rootMargin?: string;
  /**
   * Intersection threshold to trigger prefetching
   * @default 0.1
   */
  threshold?: number;
  /**
   * Whether to prefetch the API data as well as the route
   * @default true
   */
  prefetchData?: boolean;
  /**
   * Debounce delay for prefetch calls in milliseconds
   * @default 150
   */
  debounceMs?: number;
}

interface PostPrefetchInfo {
  id: string;
  isPrefetched: boolean;
  isPrefetching: boolean;
}

export function usePrefetchPosts(options: UsePrefetchPostsOptions = {}) {
  const {
    rootMargin = "100px 0px 800px 0px", // Prefetch when 500px away from viewport
    threshold = 0.1,
    prefetchData = true,
    debounceMs = 150,
  } = options;

  const router = useRouter();
  const observerRef = useRef<IntersectionObserver | null>(null);
  const prefetchedPostsRef = useRef<Map<string, PostPrefetchInfo>>(new Map());
  const debounceTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Function to prefetch a single post
  const prefetchPost = useCallback(
    async (postId: string) => {
      const prefetchInfo = prefetchedPostsRef.current.get(postId);
      
      // Skip if already prefetched or currently prefetching
      if (prefetchInfo?.isPrefetched || prefetchInfo?.isPrefetching) {
        return;
      }

      // Mark as prefetching
      prefetchedPostsRef.current.set(postId, {
        id: postId,
        isPrefetched: false,
        isPrefetching: true,
      });

      try {
        // Prefetch the route first (fast)
        router.prefetch(`/entry/${postId}`);

        // Optionally prefetch the API data (slower but instant modal)
        if (prefetchData) {
          const response = await fetch(`/api/posts/${postId}`, {
            method: "HEAD", // Use HEAD to just check if exists and warm cache
          });
          
          // If HEAD works, do a full GET to cache the data
          if (response.ok) {
            await fetch(`/api/posts/${postId}`, {
              cache: "force-cache", // Cache the result
            });
          } else {
            // Log specific error details for debugging
            console.warn(`Prefetch HEAD failed for post ${postId}:`, {
              status: response.status,
              statusText: response.statusText,
              url: response.url
            });
            
            // For non-critical errors (403, 401), don't throw - just skip prefetch
            if (response.status === 403 || response.status === 401) {
              console.debug(`Skipping prefetch for post ${postId} due to access restrictions`);
            } else if (response.status === 404) {
              console.debug(`Post ${postId} not found for prefetch`);
            } else {
              // For other errors, log but don't fail
              console.warn(`Unexpected prefetch error for post ${postId}:`, response.status);
            }
          }
        }

        // Mark as successfully prefetched
        prefetchedPostsRef.current.set(postId, {
          id: postId,
          isPrefetched: true,
          isPrefetching: false,
        });

        // console.log(`✅ Prefetched post: ${postId}`);
      } catch (error) {
        console.warn(`Failed to prefetch post ${postId}:`, error);
        
        // Reset prefetch state on error
        prefetchedPostsRef.current.set(postId, {
          id: postId,
          isPrefetched: false,
          isPrefetching: false,
        });
      }
    },
    [router, prefetchData]
  );

  // Debounced prefetch function
  const debouncedPrefetch = useCallback(
    (postId: string) => {
      // Clear existing timer for this post
      const existingTimer = debounceTimersRef.current.get(postId);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      // Set new timer
      const timer = setTimeout(() => {
        prefetchPost(postId);
        debounceTimersRef.current.delete(postId);
      }, debounceMs);

      debounceTimersRef.current.set(postId, timer);
    },
    [prefetchPost, debounceMs]
  );

  // Function to observe a post element
  const observePost = useCallback(
    (element: HTMLElement, postId: string) => {
      if (!observerRef.current) {
        // Create intersection observer
        observerRef.current = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                const elementPostId = entry.target.getAttribute("data-post-id");
                if (elementPostId) {
                  debouncedPrefetch(elementPostId);
                }
              }
            });
          },
          {
            rootMargin,
            threshold,
          }
        );
      }

      // Add data attribute and observe
      element.setAttribute("data-post-id", postId);
      observerRef.current.observe(element);

      return () => {
        if (observerRef.current && element) {
          observerRef.current.unobserve(element);
        }
      };
    },
    [debouncedPrefetch, rootMargin, threshold]
  );

  // Function to stop observing a post element
  const unobservePost = useCallback((element: HTMLElement) => {
    if (observerRef.current && element) {
      observerRef.current.unobserve(element);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clean up observer
      if (observerRef.current) {
        observerRef.current.disconnect();
      }

      // Clean up debounce timers
      debounceTimersRef.current.forEach((timer) => {
        clearTimeout(timer);
      });
      debounceTimersRef.current.clear();
    };
  }, []);

  // Get prefetch status for a post
  const getPrefetchStatus = useCallback((postId: string) => {
    return prefetchedPostsRef.current.get(postId) || {
      id: postId,
      isPrefetched: false,
      isPrefetching: false,
    };
  }, []);

  return {
    observePost,
    unobservePost,
    getPrefetchStatus,
    prefetchPost: debouncedPrefetch,
  };
} 