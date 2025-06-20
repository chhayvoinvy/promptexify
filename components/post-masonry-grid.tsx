"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import { PostWithInteractions } from "@/lib/content";
import { PostModal } from "@/components/post-modal";
import { BookmarkButton } from "@/components/bookmark-button";
import { FavoriteButton } from "@/components/favorite-button";
import { LockIcon } from "lucide-react";

interface PostMasonryGridProps {
  posts: PostWithInteractions[];
  userType?: "FREE" | "PREMIUM" | null;
}

interface PostPosition {
  id: string;
  x: number;
  y: number;
  height: number;
}

export function PostMasonryGrid({ posts, userType }: PostMasonryGridProps) {
  const [selectedPost, setSelectedPost] = useState<PostWithInteractions | null>(
    null
  );
  const [postPositions, setPostPositions] = useState<PostPosition[]>([]);
  const [containerHeight, setContainerHeight] = useState(0);
  const [columnWidth, setColumnWidth] = useState(0);
  const [columnCount, setColumnCount] = useState(1);
  const [previousPostCount, setPreviousPostCount] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const postRefs = useRef<Record<string, HTMLDivElement>>({});
  const [imageDimensions, setImageDimensions] = useState<
    Record<string, { width: number; height: number }>
  >({});

  const handleViewPost = (post: PostWithInteractions) => {
    setSelectedPost(post);

    // Update URL for shareable links while keeping modal open
    window.history.pushState(null, "", `/entry/${post.id}?modal=true`);
  };

  const handleCloseModal = () => {
    setSelectedPost(null);
    // Go back in history to remove modal URL
    window.history.back();
  };

  // const getDisplayViewCount = (post: PostWithInteractions) => {
  //   return viewCounts[post.id] || post.viewCount;
  // };

  // Function to handle image load and calculate aspect ratio
  const handleImageLoad = (
    postId: string,
    event: React.SyntheticEvent<HTMLImageElement>
  ) => {
    const img = event.currentTarget;
    setImageDimensions((prev) => ({
      ...prev,
      [postId]: {
        width: img.naturalWidth,
        height: img.naturalHeight,
      },
    }));
  };

  // Function to get dynamic aspect ratio style based on actual image dimensions
  const getDynamicAspectRatio = (postId: string) => {
    const dimensions = imageDimensions[postId];
    if (!dimensions) {
      // Generate a pseudo-random but consistent aspect ratio for each post while loading
      const hash = postId.split("").reduce((a, b) => {
        a = (a << 5) - a + b.charCodeAt(0);
        return a & a;
      }, 0);
      const normalized = Math.abs(hash) / 2147483648;
      const aspectRatio = 0.67 + normalized * 1.13;
      const width = Math.round(aspectRatio * 100);
      return { aspectRatio: `${width} / 100` };
    }

    const naturalRatio = dimensions.width / dimensions.height;
    const cappedRatio = naturalRatio < 0.67 ? 0.67 : naturalRatio;
    const width = Math.round(cappedRatio * 100);
    return { aspectRatio: `${width} / 100` };
  };

  // Calculate responsive column count and width
  const calculateLayout = useCallback(() => {
    if (!containerRef.current) return;

    const containerWidth = containerRef.current.offsetWidth;
    const gap = 24; // 1.5rem = 24px
    let cols = 1;

    // Responsive breakpoints matching CSS
    if (containerWidth >= 1280) cols = 4;
    else if (containerWidth >= 1024) cols = 3;
    else if (containerWidth >= 640) cols = 2;
    else cols = 1;

    const width = (containerWidth - gap * (cols - 1)) / cols;

    setColumnCount(cols);
    setColumnWidth(width);
  }, []);

  // Calculate masonry positions
  const calculatePositions = useCallback(() => {
    if (columnWidth === 0 || posts.length === 0) return;

    const gap = 24;
    const columnHeights = new Array(columnCount).fill(0);
    const positions: PostPosition[] = [];

    posts.forEach((post) => {
      const postElement = postRefs.current[post.id];
      if (!postElement) return;

      // Find the shortest column
      const shortestColumnIndex = columnHeights.indexOf(
        Math.min(...columnHeights)
      );
      const x = shortestColumnIndex * (columnWidth + gap);
      const y = columnHeights[shortestColumnIndex];

      // Get the actual height of the post element
      const height = postElement.offsetHeight;

      positions.push({
        id: post.id,
        x,
        y,
        height,
      });

      // Update column height
      columnHeights[shortestColumnIndex] += height + gap;
    });

    setPostPositions(positions);
    setContainerHeight(Math.max(...columnHeights) - gap);
  }, [posts, columnWidth, columnCount]);

  // Handle window resize
  useEffect(() => {
    calculateLayout();

    const handleResize = () => {
      calculateLayout();
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [calculateLayout]);

  // Recalculate positions when layout changes or posts change
  useEffect(() => {
    // Small delay to ensure DOM elements are rendered
    const timer = setTimeout(() => {
      calculatePositions();
    }, 100);

    return () => clearTimeout(timer);
  }, [calculatePositions, posts.length, imageDimensions]);

  // Initialize visibility for initial posts and animate new ones
  useEffect(() => {
    if (posts.length === 0) return;

    // If this is the initial load, show all posts immediately
    if (previousPostCount === 0) {
      setPreviousPostCount(posts.length);
    } else {
      // If posts were added, animate them
      const newPosts = posts.slice(previousPostCount);
      if (newPosts.length > 0) {
        // Immediately add them to visible posts (they'll be positioned correctly but scaled/faded)

        // Animate them in with stagger
        newPosts.forEach((post, index) => {
          setTimeout(() => {}, index * 150); // 150ms delay between each post
        });

        setPreviousPostCount(posts.length);
      }
    }
  }, [posts.length, previousPostCount]);

  // Observer for image loads to trigger recalculation
  useEffect(() => {
    const observer = new MutationObserver(() => {
      calculatePositions();
    });

    if (containerRef.current) {
      observer.observe(containerRef.current, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["style"],
      });
    }

    return () => observer.disconnect();
  }, [calculatePositions]);

  return (
    <>
      <div
        ref={containerRef}
        className="relative w-full"
        style={{ height: containerHeight }}
      >
        {posts.map((post) => {
          const position = postPositions.find((p) => p.id === post.id);

          return (
            <div
              key={post.id}
              ref={(el) => {
                if (el) postRefs.current[post.id] = el;
              }}
              className="absolute"
              style={{
                width: columnWidth,
                left: position?.x || 0,
                top: position?.y || 0,
              }}
            >
              <Card
                className="overflow-hidden hover:shadow-lg cursor-pointer py-0 shadow-lg"
                onClick={() => handleViewPost(post)}
              >
                {post.featuredImage && (
                  <div
                    className="relative"
                    style={getDynamicAspectRatio(post.id)}
                  >
                    <Image
                      src={post.featuredImage}
                      alt={post.title}
                      fill
                      className="object-cover rounded-b-lg absolute"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      onLoad={(e) => handleImageLoad(post.id, e)}
                    />

                    {post.isPremium && (
                      <div className="absolute top-2 right-2 flex items-center gap-2 z-10">
                        <Badge className="text-foreground bg-gradient-to-r from-teal-500 to-sky-500">
                          <LockIcon className="w-4 h-4" />
                          Premium
                        </Badge>
                      </div>
                    )}
                    {/* Action buttons overlay */}
                    <div className="absolute bottom-3 left-0 right-0 px-3 flex gap-2 items-end justify-between">
                      <div
                        className="flex items-bottom justify-end gap-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <FavoriteButton
                          postId={post.id}
                          className="border-1 border-white/20 backdrop-blur-lg bg-background"
                          initialFavorited={post.isFavorited || false}
                        />
                        <BookmarkButton
                          postId={post.id}
                          className="border-1 border-white/20 backdrop-blur-lg bg-background"
                          initialBookmarked={post.isBookmarked || false}
                        />
                      </div>
                      <div className="flex items-bottom gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {post.category.parent?.name || post.category.name}
                        </Badge>
                        {post.category.parent && (
                          <Badge variant="secondary" className="text-xs">
                            {post.category.name}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </Card>

              {/* Content overlay positioned outside the Card */}
              <div className="z-10 mx-3 border border-t-0 rounded-b-lg border-white/20">
                <div className="bg-black/70 backdrop-blur-sm rounded-b-lg px-4 py-2 text-xs text-muted-foreground">
                  <span className="line-clamp-2">
                    <span className="font-medium">Prompt: </span>

                    {post.content
                      ? post.content
                          .replace(/^# .+\n\n/, "")
                          .replace(/\n+/g, " ")
                          .substring(0, 100) +
                        (post.content.length > 100 ? "..." : "")
                      : post.description}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {selectedPost && (
        <PostModal
          post={selectedPost}
          userType={userType}
          onClose={handleCloseModal}
        />
      )}
    </>
  );
}
