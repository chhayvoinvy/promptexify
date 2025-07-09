"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PostWithInteractions } from "@/lib/content";
import { BookmarkButton } from "@/components/bookmark-button";
import { FavoriteButton } from "@/components/favorite-button";
import { MediaImage, MediaVideo } from "@/components/media-display";
import {
  LockIcon,
  UnlockIcon,
  Play,
  Pause,
  Volume2,
  VolumeX,
} from "@/components/ui/icons";
import { PostTextBaseCard } from "@/components/post-text-base-card";
import { usePrefetchPosts } from "@/hooks/use-prefetch-posts";

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
    new Set(posts.filter((post) => post.uploadPath && post.uploadFileType === "VIDEO").map((post) => post.id))
  );
  
  // State to track which videos should be loaded and their loading status
  const [videosToShow, setVideosToShow] = useState<Set<string>>(new Set());
  const [videosLoaded, setVideosLoaded] = useState<Set<string>>(new Set());

  const containerRef = useRef<HTMLDivElement>(null);
  const postRefs = useRef<Record<string, HTMLDivElement>>({});
  const videoRefs = useRef<Record<string, HTMLVideoElement>>({});
  const [imageDimensions, setImageDimensions] = useState<
    Record<string, { width: number; height: number }>
  >({});

  // Initialize prefetch hook for viewport-based prefetching
  const { observePost, unobservePost, getPrefetchStatus } = usePrefetchPosts({
    rootMargin: "0px 0px 800px 0px", // Start prefetching 800px before entering viewport
    threshold: 0.1,
    prefetchData: true, // Prefetch both route and API data
    debounceMs: 100, // Quick response for better UX
  });

  // Get all video post IDs for video state management
  const videoPostIds = useMemo(
    () =>
      new Set(posts.filter((post) => post.uploadPath && post.uploadFileType === "VIDEO").map((post) => post.id)),
    [posts]
  );

  // Handle video play/pause
  const handleVideoPlay = useCallback(
    (postId: string, event: React.MouseEvent) => {
      event.stopPropagation();
      event.preventDefault();
      
      if (!videosToShow.has(postId)) {
        // First click: show video and start loading
        setVideosToShow(prev => new Set([...prev, postId]));
        return;
      }

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
    [playingVideo, videosToShow]
  );

  // Handle video mute/unmute
  const handleVideoMute = useCallback(
    (postId: string, event: React.MouseEvent) => {
      event.stopPropagation();
      event.preventDefault();
      setMutedVideos((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(postId)) {
          newSet.delete(postId);
        } else {
          newSet.add(postId);
        }
        return newSet;
      });
    },
    []
  );

  // Handle video ended
  const handleVideoEnded = useCallback((postId: string) => {
    if (playingVideo === postId) {
      setPlayingVideo(null);
    }
  }, [playingVideo]);

  // Handle media load and calculate aspect ratio
  const handleMediaLoad = useCallback(
    (
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
    },
    []
  );

  // Handle video loaded metadata
  const handleVideoLoadedMetadata = useCallback(
    (postId: string, event: React.SyntheticEvent<HTMLVideoElement>) => {
      setVideosLoaded(prev => new Set([...prev, postId]));
      handleMediaLoad(postId, event);
      
      // Auto-play if this video should be playing
      if (playingVideo === postId) {
        const video = videoRefs.current[postId];
        if (video) {
          video.play();
        }
      }
    },
    [playingVideo, handleMediaLoad]
  );

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

  // Calculate positions for masonry layout
  const calculatePositions = useCallback(() => {
    if (!containerRef.current || columnWidth === 0 || posts.length === 0) {
      return;
    }

    const gap = 24;
    const columnHeights = new Array(columnCount).fill(0);
    const newPositions: PostPosition[] = [];

    posts.forEach((post) => {
      const postElement = postRefs.current[post.id];
      if (!postElement) return;

      // Find shortest column
      const shortestColumnIndex = columnHeights.indexOf(
        Math.min(...columnHeights)
      );

      const x = shortestColumnIndex * (columnWidth + gap);
      const y = columnHeights[shortestColumnIndex];
      const height = postElement.offsetHeight;

      newPositions.push({
        id: post.id,
        x,
        y,
        height,
      });

      columnHeights[shortestColumnIndex] += height + gap;
    });

    setPostPositions(newPositions);
    setContainerHeight(Math.max(...columnHeights) - gap);
  }, [posts, columnWidth, columnCount]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      calculateLayout();
    };

    calculateLayout();
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
          .filter((post) => post.uploadPath && post.uploadFileType === "VIDEO")
          .map((post) => post.id);

        if (newVideoPostIds.length > 0) {
          setMutedVideos((prev) => new Set([...prev, ...newVideoPostIds]));
        }

        // Animate them in with stagger
        newPosts.forEach((_, index) => {
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

  // Reset video states when playingVideo changes
  useEffect(() => {
    // Clean up video states for posts that are no longer playing
    posts.forEach(post => {
      if (playingVideo !== post.id) {
        setVideosToShow(prev => {
          const newSet = new Set(prev);
          if (newSet.has(post.id)) {
            // Keep video loaded but not playing
          }
          return newSet;
        });
      }
    });
  }, [playingVideo, posts]);

  return (
    <>
      <div
        ref={containerRef}
        className="relative w-full"
        style={{ height: containerHeight }}
      >
        {posts.map((post) => {
          const position = postPositions.find((p) => p.id === post.id);
          const videoPreviewUrl = post.uploadPath && post.uploadFileType === "VIDEO"
            ? post.media?.find(m => m.relativePath === post.uploadPath)?.previewUrl 
            : null;
          const videoPreviewBlurData = post.uploadPath && post.uploadFileType === "VIDEO"
            ? post.media?.find(m => m.relativePath === post.uploadPath)?.blurDataUrl
            : null;
          const shouldShowVideo = videosToShow.has(post.id);
          const isVideoLoaded = videosLoaded.has(post.id);

          return (
            <div
              key={post.id}
              ref={(el) => {
                if (el) {
                  postRefs.current[post.id] = el;
                  // Start observing this post for prefetching
                  observePost(el, post.id);
                } else {
                  // Clean up observer when element is unmounted
                  const existingEl = postRefs.current[post.id];
                  if (existingEl) {
                    unobservePost(existingEl);
                    delete postRefs.current[post.id];
                  }
                }
              }}
              className="absolute"
              style={{
                width: columnWidth,
                left: position?.x || 0,
                top: position?.y || 0,
              }}
            >
              <Link 
                href={`/entry/${post.id}`} 
                scroll={false}
                prefetch={true} // Enable automatic Next.js prefetching
              >
                <Card className="overflow-hidden hover:shadow-lg cursor-zoom-in py-0 shadow-lg">
                  <div
                    className="relative"
                                          style={
                        post.uploadPath
                           ? getDynamicAspectRatio(post.id)
                           : { height: "auto", minHeight: "120px" }
                      }
                  >
                    {post.uploadPath && post.uploadFileType === "IMAGE" ? (
                      <MediaImage
                        src={post.uploadPath}
                        alt={post.title}
                        fill
                        className="object-cover rounded-b-lg absolute"
                        loading="lazy"
                        blurDataURL={post.blurData || undefined}
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        onLoad={(e) => handleMediaLoad(post.id, e)}
                        previewUrl={post.media?.find(m => m.relativePath === post.uploadPath)?.previewUrl || undefined}
                      />
                    ) : post.uploadPath && post.uploadFileType === "VIDEO" ? (
                      <>
                        {/* Always show video preview image initially */}
                        {videoPreviewUrl && (
                          <MediaImage
                            src={post.uploadPath}
                            alt={post.title}
                            fill
                            className={`object-cover rounded-b-lg absolute transition-opacity duration-300 ${
                              shouldShowVideo && isVideoLoaded ? "opacity-0" : "opacity-100"
                            }`}
                            loading="lazy"
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                            onLoad={(e) => handleMediaLoad(post.id, e)}
                            previewUrl={videoPreviewUrl}
                            blurDataURL={videoPreviewBlurData || undefined}
                          />
                        )}
                        
                        {/* Load and show video only when user requests it */}
                        {shouldShowVideo && (
                          <MediaVideo
                            ref={(el) => {
                              if (el) videoRefs.current[post.id] = el;
                            }}
                            src={post.uploadPath}
                            className={`w-full h-full object-cover rounded-b-lg absolute scale-150 transition-opacity duration-300 ${
                              isVideoLoaded ? "opacity-100" : "opacity-0"
                            }`}
                            muted={mutedVideos.has(post.id)}
                            loop
                            playsInline
                            preload="metadata"
                            onLoadedMetadata={(e) => handleVideoLoadedMetadata(post.id, e)}
                            onEnded={() => handleVideoEnded(post.id)}
                          />
                        )}

                        {/* Video controls */}
                        <div className="absolute inset-0 top-3 left-3 pointer-events-none z-10">
                          <div className="flex gap-2">
                            {/* Play/pause button */}
                            <button
                              className="bg-background/90 hover:bg-background rounded-full p-1.5 transition-colors pointer-events-auto"
                              onClick={(e) => {
                                handleVideoPlay(post.id, e);
                              }}
                            >
                              {playingVideo === post.id && isVideoLoaded ? (
                                <Pause className="w-5 h-5 text-foreground" />
                              ) : (
                                <Play className="w-5 h-5 text-foreground" />
                              )}
                            </button>

                            {/* Mute/unmute button - only show when video is loaded */}
                            {shouldShowVideo && isVideoLoaded && (
                              <button
                                className="bg-background/90 hover:bg-background rounded-full p-1.5 transition-colors pointer-events-auto"
                                onClick={(e) => {
                                  handleVideoMute(post.id, e);
                                }}
                              >
                                {mutedVideos.has(post.id) ? (
                                  <VolumeX className="w-5 h-5 text-foreground" />
                                ) : (
                                  <Volume2 className="w-5 h-5 text-foreground" />
                                )}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Loading indicator when video is being loaded */}
                        {shouldShowVideo && !isVideoLoaded && (
                          <div className="absolute inset-0 bg-black/20 flex items-center justify-center z-5">
                            <div className="bg-background/90 rounded-full p-2">
                              <div className="w-4 h-4 border-2 border-foreground border-t-transparent rounded-full animate-spin"></div>
                            </div>
                          </div>
                        )}
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

                    {/* Prefetch status indicator (development only) */}
                    {process.env.NODE_ENV === "development" && getPrefetchStatus && (() => {
                      const prefetchStatus = getPrefetchStatus(post.id);
                      return prefetchStatus.isPrefetching ? (
                        <div className="absolute top-3 left-3 z-20">
                          <Badge variant="outline" className="text-xs bg-blue-500/90 text-white border-blue-400">
                            ⚡ Prefetching...
                          </Badge>
                        </div>
                      ) : prefetchStatus.isPrefetched ? (
                        <div className="absolute top-3 left-3 z-20">
                          <Badge variant="outline" className="text-xs bg-green-500/90 text-white border-green-400">
                            ✅ Ready
                          </Badge>
                        </div>
                      ) : null;
                    })()}

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
