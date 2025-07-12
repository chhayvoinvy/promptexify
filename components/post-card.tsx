"use client";

import { useRef, useCallback, useEffect } from "react";
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
}: PostCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // We now directly use previewPath for images, no need for the hook

  // Calculate aspect ratio based on media type and dimensions
  const getDynamicAspectRatio = () => {
    if (post.uploadPath) {
      // Default aspect ratio calculation based on width
      const baseRatio = width < 300 ? 0.75 : width < 400 ? 0.8 : 0.85;
      const randomOffset = (parseFloat(post.id.slice(-3)) / 1000) * 0.3;
      const aspectRatio = baseRatio + randomOffset;

      return { aspectRatio };
    }
    return { aspectRatio: 0.75 };
  };

  // Handle media load for dimensions tracking
  const handleMediaLoad = useCallback(() => {
    // Media loaded successfully - could track dimensions here if needed
  }, []);

  // Handle video play/pause
  const handleVideoPlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (playingVideo === post.id) {
      video.pause();
      onVideoStateChange?.(post.id, false);
    } else {
      video.play();
      onVideoStateChange?.(post.id, true);
    }
  }, [post.id, playingVideo, onVideoStateChange]);

  // Handle video ended
  const handleVideoEnded = useCallback(() => {
    if (playingVideo === post.id) {
      onVideoStateChange?.(post.id, false);
    }
  }, [post.id, playingVideo, onVideoStateChange]);

  // Handle video loaded metadata
  const handleVideoLoadedMetadata = useCallback(() => {
    handleMediaLoad();
    
    // Auto-play if this video should be playing
    if (playingVideo === post.id) {
      const video = videoRef.current;
      if (video) {
        video.play();
      }
    }
  }, [playingVideo, post.id, handleMediaLoad]);

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

  // Update video play/pause state when external playingVideo changes
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
              post.uploadPath
                ? getDynamicAspectRatio()
                : { height: "auto", minHeight: "120px" }
            }
          >
            {post.previewPath ? (
              post.uploadFileType === "IMAGE" ? (
                <MediaImage
                  src={post.previewPath}
                  alt={post.title}
                  fill
                  className="object-cover rounded-b-lg absolute"
                  loading="lazy"
                  blurDataURL={post.blurData || undefined}
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  onLoad={() => handleMediaLoad()}
                />
              ) : (
                <MediaVideo
                  ref={videoRef}
                  src={post.previewVideoPath || ""}
                  previewSrc={post.previewPath || undefined}
                  previewVideoSrc={post.previewVideoPath || undefined}
                  alt={post.title}
                  fill
                  className="rounded-b-lg"
                  muted={isVideoMuted}
                  loop
                  playsInline
                  preload="metadata"
                  onLoadedMetadata={() => handleVideoLoadedMetadata()}
                  onPlay={handleVideoPlay}
                  onEnded={handleVideoEnded}
                  blurDataURL={post.blurData || undefined}
                  usePreviewVideo={true}
                  fallbackToOriginal={false}
                />
              )
            ) : (
              <PostTextBaseCard
                title={post.title}
                className="min-h-[120px]"
              />
            )}

            {/* Custom video controls overlay for videos */}
            {post.uploadFileType === "VIDEO" && (
              <div className="absolute inset-0 top-3 left-3 pointer-events-none z-10">
                <div className="flex gap-2">
                  {/* Play/pause button */}
                  <button
                    className="bg-background/90 hover:bg-background rounded-full p-1.5 transition-colors pointer-events-auto"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleVideoPlay();
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
                      e.preventDefault();
                      e.stopPropagation();
                      onVideoMuteChange?.(post.id, !isVideoMuted);
                    }}
                  >
                    {isVideoMuted ? (
                      <VolumeX className="w-5 h-5 text-foreground" />
                    ) : (
                      <Volume2 className="w-5 h-5 text-foreground" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Premium badge */}
            {post.isPremium && (
              <div className="absolute top-3 right-3 z-10">
                <Badge variant="secondary" className="text-xs">
                  <LockIcon className="w-3 h-3 mr-1" />
                  Premium
                </Badge>
              </div>
            )}
          </div>

          <div className="p-4">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold text-sm line-clamp-2 leading-tight">
                {post.title}
              </h3>
            </div>

            {post.description && (
              <p className="text-muted-foreground text-xs mb-3 line-clamp-2">
                {post.description}
              </p>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {post.category?.name}
                </Badge>
                {userType !== "FREE" && !post.isPremium && (
                  <Badge variant="outline" className="text-xs">
                    <UnlockIcon className="w-3 h-3 mr-1" />
                    Free
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-1">
                <BookmarkButton
                  postId={post.id}
                  initialBookmarked={post.isBookmarked}
                  size="sm"
                />
                <FavoriteButton
                  postId={post.id}
                  initialFavorited={post.isFavorited}
                  size="sm"
                />
              </div>
            </div>
          </div>
        </Card>
      </Link>
    </div>
  );
} 