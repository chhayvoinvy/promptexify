"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PostWithInteractions } from "@/lib/content";
import { BookmarkButton } from "@/components/bookmark-button";
import { FavoriteButton } from "@/components/favorite-button";
import { MediaImage, MediaVideo } from "@/components/ui/media-display";
import {
  LockIcon,
  UnlockIcon,
  Play,
  Pause,
  Volume2,
  VolumeX,
} from "@/components/ui/icons";
import { PostTextBaseCard } from "@/components/post-text-base-card";

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
  const [postPositions, setPostPositions] = useState<PostPosition[]>([]);
  const [containerHeight, setContainerHeight] = useState(0);
  const [columnWidth, setColumnWidth] = useState(0);
  const [columnCount, setColumnCount] = useState(1);
  const [previousPostCount, setPreviousPostCount] = useState(0);
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);
  const [mutedVideos, setMutedVideos] = useState<Set<string>>(
    new Set(posts.filter((post) => post.featuredVideo).map((post) => post.id))
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const postRefs = useRef<Record<string, HTMLDivElement>>({});
  const videoRefs = useRef<Record<string, HTMLVideoElement>>({});
  const [imageDimensions, setImageDimensions] = useState<
    Record<string, { width: number; height: number }>
  >({});

  // Handle video play/pause
  const handleVideoPlay = useCallback(
    (postId: string, event: React.MouseEvent) => {
      event.stopPropagation();
      const video = videoRefs.current[postId];
      if (!video) return;

      if (playingVideo === postId) {
        video.pause();
        setPlayingVideo(null);
      } else {
        // Pause any currently playing video
        if (playingVideo) {
          const currentVideo = videoRefs.current[playingVideo];
          if (currentVideo) {
            currentVideo.pause();
          }
        }
        video.play();
        setPlayingVideo(postId);
      }
    },
    [playingVideo]
  );

  // Handle video ended
  const handleVideoEnded = useCallback(
    (postId: string) => {
      if (playingVideo === postId) {
        setPlayingVideo(null);
      }
    },
    [playingVideo]
  );

  // Handle video mute/unmute
  const handleVideoMute = useCallback(
    (postId: string, event: React.MouseEvent) => {
      event.stopPropagation();
      const video = videoRefs.current[postId];
      if (!video) return;

      const isMuted = mutedVideos.has(postId);
      video.muted = !isMuted;

      setMutedVideos((prev) => {
        const newSet = new Set(prev);
        if (isMuted) {
          newSet.delete(postId);
        } else {
          newSet.add(postId);
        }
        return newSet;
      });
    },
    [mutedVideos]
  );

  // Function to handle image/video load and calculate aspect ratio
  const handleMediaLoad = (
    postId: string,
    event: React.SyntheticEvent<HTMLImageElement | HTMLVideoElement>
  ) => {
    const media = event.currentTarget;
    let width: number, height: number;

    if (media instanceof HTMLImageElement) {
      width = media.naturalWidth;
      height = media.naturalHeight;
    } else if (media instanceof HTMLVideoElement) {
      width = media.videoWidth;
      height = media.videoHeight;
    } else {
      return;
    }

    setImageDimensions((prev) => ({
      ...prev,
      [postId]: { width, height },
    }));
  };

  // Function to get dynamic aspect ratio style based on actual media dimensions
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
        // Add new videos to muted list by default
        const newVideoPostIds = newPosts
          .filter((post) => post.featuredVideo)
          .map((post) => post.id);

        if (newVideoPostIds.length > 0) {
          setMutedVideos((prev) => new Set([...prev, ...newVideoPostIds]));
        }

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
              <Link href={`/entry/${post.id}`} scroll={false}>
                <Card className="overflow-hidden hover:shadow-lg cursor-zoom-in py-0 shadow-lg">
                  <div
                    className="relative"
                    style={
                      post.featuredImage || post.featuredVideo
                        ? getDynamicAspectRatio(post.id)
                        : { height: "auto", minHeight: "120px" }
                    }
                  >
                    {post.featuredImage ? (
                      <MediaImage
                        src={post.featuredImage}
                        alt={post.title}
                        fill
                        className="object-cover rounded-b-lg absolute"
                        loading="lazy"
                        blurDataURL={post.featuredImage}
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        onLoad={(e) => handleMediaLoad(post.id, e)}
                      />
                    ) : post.featuredVideo ? (
                      <>
                        <MediaVideo
                          ref={(el) => {
                            if (el) videoRefs.current[post.id] = el;
                          }}
                          src={post.featuredVideo}
                          className="w-full h-full object-cover rounded-b-lg absolute scale-150"
                          muted={mutedVideos.has(post.id)}
                          loop
                          playsInline
                          onLoadedMetadata={(e) => handleMediaLoad(post.id, e)}
                          onEnded={() => handleVideoEnded(post.id)}
                        />

                        {/* Video controls */}
                        <div className="absolute inset-0 top-3 left-3 pointer-events-none z-10">
                          <div className="flex gap-2">
                            {/* Play/pause button */}
                            <button
                              className="bg-background/90 hover:bg-background rounded-full p-1.5 transition-colors pointer-events-auto"
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                handleVideoPlay(post.id, e);
                              }}
                            >
                              {playingVideo === post.id ? (
                                <Pause className="w-5 h-5 text-foreground" />
                              ) : (
                                <Play className="w-5 h-5 text-foreground" />
                              )}
                            </button>

                            {/* Mute/unmute button */}
                            <button
                              className="bg-background/90 hover:bg-background rounded-full p-1.5 transition-colors pointer-events-auto"
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                handleVideoMute(post.id, e);
                              }}
                            >
                              {mutedVideos.has(post.id) ? (
                                <VolumeX className="w-5 h-5 text-foreground" />
                              ) : (
                                <Volume2 className="w-5 h-5 text-foreground" />
                              )}
                            </button>
                          </div>
                        </div>
                      </>
                    ) : (
                      // Text base post with shiny hover effect
                      <PostTextBaseCard title={post.title} />
                    )}

                    {post.isPremium && (
                      <div className="absolute top-3 right-3 flex items-center gap-2 z-20">
                        <Badge className="text-foreground bg-gradient-to-r from-teal-500 to-sky-300 dark:from-teal-400 dark:to-sky-300 border border-black/20 dark:border-white/20">
                          {userType === "PREMIUM" ? (
                            <UnlockIcon className="w-4 h-4" />
                          ) : (
                            <LockIcon className="w-4 h-4" />
                          )}
                          Premium
                        </Badge>
                      </div>
                    )}

                    {/* Action buttons overlay */}
                    <div className="absolute bottom-3 left-0 right-0 px-3 flex gap-2 items-end justify-between z-20">
                      <div
                        className="flex items-bottom justify-end gap-2"
                        onClick={(e) => e.stopPropagation()}
                        onTouchStart={(e) => e.stopPropagation()}
                        onTouchEnd={(e) => e.stopPropagation()}
                      >
                        <FavoriteButton
                          postId={post.id}
                          className="border-1 border-black/20 dark:border-white/20 backdrop-blur-lg bg-background"
                          initialFavorited={post.isFavorited || false}
                        />
                        <BookmarkButton
                          postId={post.id}
                          className="border-1 border-black/20 dark:border-white/20 backdrop-blur-lg bg-background"
                          initialBookmarked={post.isBookmarked || false}
                        />
                      </div>
                      <div className="flex items-end justify-end gap-1 flex-col flex-wrap">
                        <div className="flex items-center gap-1">
                          <Badge
                            variant="outline"
                            className="text-xs bg-background"
                          >
                            {post.category.parent?.name || post.category.name}
                          </Badge>
                        </div>
                        <div className="flex items-end gap-1">
                          {/* Show up to 2 tags */}
                          {post.tags &&
                            post.tags.slice(0, 2).map((tag) => (
                              <Badge
                                key={tag.id}
                                variant="outline"
                                className="text-xs bg-background"
                              >
                                {tag.name}
                              </Badge>
                            ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>

              {/* Content overlay positioned outside the Card */}
              <div className="z-10 mx-3 border border-t-0 rounded-b-lg border-black/20 dark:border-white/20">
                <div className="bg-background-muted backdrop-blur-sm rounded-b-lg px-4 py-2 text-xs text-muted-foreground">
                  <span className="line-clamp-2">
                    <span className="font-medium">Prompt: </span>

                    {post.content
                      ? post.content
                          .replace(/^# .+\n\n/, "")
                          .replace(/\n+/g, " ")
                          .substring(0, 100) +
                        (post.content.length > 100 ? "..." : "")
                      : "Something went wrong"}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
