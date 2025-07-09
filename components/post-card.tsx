"use client";

import { useState, useRef, useCallback, useEffect } from "react";
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

interface PostCardProps {
  post: PostWithInteractions;
  userType?: "FREE" | "PREMIUM" | null;
  width: number;
  onVideoStateChange?: (postId: string, isPlaying: boolean) => void;
  isVideoMuted?: boolean;
  onVideoMuteChange?: (postId: string, isMuted: boolean) => void;
  playingVideo?: string | null;
  // Prefetch utilities
  observePost?: (element: HTMLElement, postId: string) => void;
  unobservePost?: (element: HTMLElement) => void;
  getPrefetchStatus?: (postId: string) => {
    isPrefetching: boolean;
    isPrefetched: boolean;
  };
}

export function PostCard({
  post,
  userType,
  width,
  onVideoStateChange,
  isVideoMuted = true,
  onVideoMuteChange,
  playingVideo,
  observePost,
  unobservePost,
  getPrefetchStatus,
}: PostCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [imageDimensions, setImageDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);

  // Handle video play/pause
  const handleVideoPlay = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      event.preventDefault();
      const video = videoRef.current;
      if (!video) return;

      const isPlaying = playingVideo === post.id;
      onVideoStateChange?.(post.id, !isPlaying);
    },
    [post.id, playingVideo, onVideoStateChange]
  );

  // Handle video mute/unmute
  const handleVideoMute = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      event.preventDefault();
      const video = videoRef.current;
      if (!video) return;

      onVideoMuteChange?.(post.id, !isVideoMuted);
    },
    [post.id, isVideoMuted, onVideoMuteChange]
  );

  // Handle media load and calculate aspect ratio
  const handleMediaLoad = useCallback(
    (event: React.SyntheticEvent<HTMLImageElement | HTMLVideoElement>) => {
      const media = event.currentTarget;
      let mediaWidth: number, mediaHeight: number;

      if (media instanceof HTMLImageElement) {
        mediaWidth = media.naturalWidth;
        mediaHeight = media.naturalHeight;
      } else if (media instanceof HTMLVideoElement) {
        mediaWidth = media.videoWidth;
        mediaHeight = media.videoHeight;
      } else {
        return;
      }

      setImageDimensions({ width: mediaWidth, height: mediaHeight });
    },
    []
  );

  // Function to get dynamic aspect ratio style based on actual media dimensions
  const getDynamicAspectRatio = () => {
    if (!imageDimensions) {
      // Generate a pseudo-random but consistent aspect ratio for each post while loading
      const hash = post.id.split("").reduce((a, b) => {
        a = (a << 5) - a + b.charCodeAt(0);
        return a & a;
      }, 0);
      const normalized = Math.abs(hash) / 2147483648;
      const aspectRatio = 0.67 + normalized * 1.13;
      const calculatedWidth = Math.round(aspectRatio * 100);
      return { aspectRatio: `${calculatedWidth} / 100` };
    }

    const naturalRatio = imageDimensions.width / imageDimensions.height;
    const cappedRatio = naturalRatio < 0.67 ? 0.67 : naturalRatio;
    const calculatedWidth = Math.round(cappedRatio * 100);
    return { aspectRatio: `${calculatedWidth} / 100` };
  };

  // Handle video ended
  const handleVideoEnded = useCallback(() => {
    if (playingVideo === post.id) {
      onVideoStateChange?.(post.id, false);
    }
  }, [post.id, playingVideo, onVideoStateChange]);

  // Set up prefetch observer
  useEffect(() => {
    const element = containerRef.current;
    if (element && observePost) {
      observePost(element, post.id);
      return () => {
        if (unobservePost) {
          unobservePost(element);
        }
      };
    }
  }, [post.id, observePost, unobservePost]);

  // Update video play/pause state
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (playingVideo === post.id) {
      video.play();
    } else {
      video.pause();
    }
  }, [playingVideo, post.id]);

  // Update video mute state
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.muted = isVideoMuted;
    }
  }, [isVideoMuted]);

  return (
    <div ref={containerRef} style={{ width }}>
      <Link 
        href={`/entry/${post.id}`} 
        scroll={false}
        prefetch={true}
      >
        <Card className="overflow-hidden hover:shadow-lg cursor-zoom-in py-0 shadow-lg">
          <div
            className="relative"
            style={
              post.featuredImage || post.featuredVideo
                ? getDynamicAspectRatio()
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
                blurDataURL={post.featuredImageBlur || undefined}
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                onLoad={handleMediaLoad}
              />
            ) : post.featuredVideo ? (
              <>
                <MediaVideo
                  ref={videoRef}
                  src={post.featuredVideo}
                  className="w-full h-full object-cover rounded-b-lg absolute scale-150"
                  muted={isVideoMuted}
                  loop
                  playsInline
                  onLoadedMetadata={handleMediaLoad}
                  onEnded={handleVideoEnded}
                />

                {/* Video controls */}
                <div className="absolute inset-0 top-3 left-3 pointer-events-none z-10">
                  <div className="flex gap-2">
                    {/* Play/pause button */}
                    <button
                      className="bg-background/90 hover:bg-background rounded-full p-1.5 transition-colors pointer-events-auto"
                      onClick={handleVideoPlay}
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
                      onClick={handleVideoMute}
                    >
                      {isVideoMuted ? (
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
} 