"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye } from "lucide-react";
import Image from "next/image";
import { PostWithInteractions } from "@/lib/content";
import { PostModal } from "@/components/post-modal";
import { BookmarkButton } from "@/components/bookmark-button";
import { FavoriteButton } from "@/components/favorite-button";

interface PostMasonryGridProps {
  posts: PostWithInteractions[];
}

interface PostPosition {
  id: string;
  x: number;
  y: number;
  height: number;
}

export function PostMasonryGrid({ posts }: PostMasonryGridProps) {
  const [selectedPost, setSelectedPost] = useState<PostWithInteractions | null>(
    null
  );
  const [viewCounts, setViewCounts] = useState<Record<string, number>>({});
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
    // Optimistically update view count
    setViewCounts((prev) => ({
      ...prev,
      [post.id]: (prev[post.id] || post.viewCount) + 1,
    }));

    // Update URL for shareable links while keeping modal open
    window.history.pushState(null, "", `/entry/${post.id}?modal=true`);
  };

  const handleCloseModal = () => {
    setSelectedPost(null);
    // Go back in history to remove modal URL
    window.history.back();
  };

  const getDisplayViewCount = (post: PostWithInteractions) => {
    return viewCounts[post.id] || post.viewCount;
  };

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
            <Card
              key={post.id}
              ref={(el) => {
                if (el) postRefs.current[post.id] = el;
              }}
              className="absolute overflow-hidden hover:shadow-lg cursor-pointer"
              style={{
                width: columnWidth,
                left: position?.x || 0,
                top: position?.y || 0,
              }}
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
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    onLoad={(e) => handleImageLoad(post.id, e)}
                  />
                  {post.isPremium && (
                    <Badge className="absolute top-2 right-2 bg-gradient-to-r from-purple-500 to-pink-500">
                      Premium
                    </Badge>
                  )}
                </div>
              )}
              <CardHeader className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary" className="text-xs">
                    {post.category.parent?.name || post.category.name}
                  </Badge>
                  {post.category.parent && (
                    <Badge variant="outline" className="text-xs">
                      {post.category.name}
                    </Badge>
                  )}
                </div>
                <CardTitle className="line-clamp-2 text-lg">
                  {post.title}
                </CardTitle>
                {post.description && (
                  <CardDescription className="line-clamp-3 text-sm">
                    {post.description}
                  </CardDescription>
                )}
              </CardHeader>

              <CardFooter className="p-4 pt-0 flex items-center justify-between text-sm text-muted-foreground">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    <span>{getDisplayViewCount(post)}</span>
                  </div>
                </div>
                <div
                  className="flex items-center gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <FavoriteButton
                    postId={post.id}
                    initialFavorited={post.isFavorited || false}
                  />
                  <BookmarkButton
                    postId={post.id}
                    initialBookmarked={post.isBookmarked || false}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewPost(post);
                    }}
                  >
                    View
                  </Button>
                </div>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {selectedPost && (
        <PostModal post={selectedPost} onClose={handleCloseModal} />
      )}
    </>
  );
}
