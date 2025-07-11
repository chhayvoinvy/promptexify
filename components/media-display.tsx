"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { Play, Loader2 } from "@/components/ui/icons";

// Batched media resolver to reduce API calls
class BatchedMediaResolver {
  private static instance: BatchedMediaResolver;
  private pendingPaths: Set<string> = new Set();
  private resolvedUrls: Map<string, string> = new Map();
  private pendingCallbacks: Map<string, Array<(url: string) => void>> = new Map();
  private isProcessing = false;
  private batchTimeout: NodeJS.Timeout | null = null;

  static getInstance(): BatchedMediaResolver {
    if (!BatchedMediaResolver.instance) {
      BatchedMediaResolver.instance = new BatchedMediaResolver();
    }
    return BatchedMediaResolver.instance;
  }

  async resolveMediaUrl(path: string): Promise<string> {
    // If already resolved, return immediately
    if (this.resolvedUrls.has(path)) {
      return this.resolvedUrls.get(path)!;
    }

    // If it's already a full URL, return it as-is
    if (
      path.startsWith("http://") ||
      path.startsWith("https://") ||
      path.startsWith("blob:")
    ) {
      return path;
    }

    // Add to pending paths and set up callback
    this.pendingPaths.add(path);
    
    return new Promise((resolve) => {
      if (!this.pendingCallbacks.has(path)) {
        this.pendingCallbacks.set(path, []);
      }
      this.pendingCallbacks.get(path)!.push(resolve);

      // Schedule batch processing
      this.scheduleBatchProcessing();
    });
  }

  private scheduleBatchProcessing() {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
    }

    this.batchTimeout = setTimeout(() => {
      this.processBatch();
    }, 50); // 50ms debounce to collect multiple requests
  }

  private async processBatch() {
    if (this.isProcessing || this.pendingPaths.size === 0) {
      return;
    }

    this.isProcessing = true;
    const pathsToResolve = Array.from(this.pendingPaths);
    this.pendingPaths.clear();

    try {
      const response = await fetch("/api/media/resolve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ paths: pathsToResolve }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const resolvedUrls = data.urls || [];

      // Store resolved URLs and trigger callbacks
      pathsToResolve.forEach((path, index) => {
        const resolvedUrl = resolvedUrls[index] || path;
        this.resolvedUrls.set(path, resolvedUrl);

        // Trigger all callbacks for this path
        const callbacks = this.pendingCallbacks.get(path) || [];
        callbacks.forEach(callback => callback(resolvedUrl));
        this.pendingCallbacks.delete(path);
      });
    } catch (error) {
      console.error("Error resolving media URLs:", error);
      
      // On error, resolve with original paths
      pathsToResolve.forEach((path) => {
        this.resolvedUrls.set(path, path);
        const callbacks = this.pendingCallbacks.get(path) || [];
        callbacks.forEach(callback => callback(path));
        this.pendingCallbacks.delete(path);
      });
    } finally {
      this.isProcessing = false;
      
      // Process any new pending paths that accumulated during processing
      if (this.pendingPaths.size > 0) {
        this.scheduleBatchProcessing();
      }
    }
  }
}

// Legacy function for backward compatibility (now uses batched resolver)
async function resolveMediaUrl(path: string): Promise<string> {
  return BatchedMediaResolver.getInstance().resolveMediaUrl(path);
}

interface MediaImageProps {
  src: string; // Relative path like "images/user123-prompt-abc123.webp" or "preview/preview-user123-prompt-abc123.webp"
  alt: string;
  width?: number;
  height?: number;
  fill?: boolean;
  className?: string;
  loading?: "lazy" | "eager";
  sizes?: string;
  priority?: boolean;
  onLoad?: (event: React.SyntheticEvent<HTMLImageElement>) => void;
  blurDataURL?: string;
}

interface MediaVideoProps {
  src: string; // Relative path like "videos/user123-video-xyz789.mp4"
  className?: string;
  controls?: boolean;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  playsInline?: boolean;
  preload?: "none" | "metadata" | "auto";
  onLoadedMetadata?: (event: React.SyntheticEvent<HTMLVideoElement>) => void;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
}

interface MediaVideoLazyProps {
  src: string; // Video path like "videos/user123-video-xyz789.mp4"
  previewSrc?: string; // Preview image path like "preview/preview-user123-video-xyz789.webp"
  alt: string;
  className?: string;
  controls?: boolean;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  playsInline?: boolean;
  preload?: "none" | "metadata" | "auto";
  onLoadedMetadata?: (event: React.SyntheticEvent<HTMLVideoElement>) => void;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  blurDataURL?: string;
  width?: number;
  height?: number;
  fill?: boolean;
  sizes?: string;
  priority?: boolean;
  // Custom props for lazy loading behavior
  autoShowVideo?: boolean; // If true, show video immediately (useful for components that manage this externally)
  onVideoRequested?: () => void; // Callback when user clicks to load video
  loading?: "lazy" | "eager";
  showPlayButton?: boolean; // Whether to show the play button overlay
  playButtonClassName?: string; // Custom styling for play button
}

/**
 * MediaImage - Automatically resolves relative paths to full URLs
 * Usage: <MediaImage src="images/user123-prompt-abc123.webp" alt="Prompt" />
 */
export function MediaImage({
  src,
  alt,
  width,
  height,
  fill = false,
  className,
  loading = "lazy",
  sizes,
  priority = false,
  onLoad,
  blurDataURL,
}: MediaImageProps) {
  const [resolvedUrl, setResolvedUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    if (!src) {
      setIsLoading(false);
      return;
    }

    // If src is already a full URL or a blob URL, use it directly
    if (
      src.startsWith("http://") ||
      src.startsWith("https://") ||
      src.startsWith("blob:")
    ) {
      setResolvedUrl(src);
      setIsLoading(false);
      return;
    }

    // Handle preview paths differently - they should go through the preview API
    if (src.startsWith("preview/")) {
      // For preview images, use the preview API route
      const previewUrl = `/api/media/preview/${src.replace("preview/", "")}`;
      console.log("Using preview API for:", src, "→", previewUrl);
      setResolvedUrl(previewUrl);
      setIsLoading(false);
      return;
    }

    // Resolve relative path to full URL for regular media
    resolveMediaUrl(src)
      .then((url: string) => {
        // Validate the resolved URL before setting it
        if (url && url.trim() !== '') {
          setResolvedUrl(url);
        } else {
          setError("Invalid resolved URL");
        }
        setIsLoading(false);
      })
      .catch((err: Error) => {
        console.error("Error resolving image URL:", err);
        setError("Failed to load image");
        setIsLoading(false);
      });
  }, [src]);

  if (error) {
    return (
      <div
        className={`bg-muted border-2 border-dashed border-muted-foreground/25 ${className}`}
        style={{ width, height }}
      >
        <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
          {error}
        </div>
      </div>
    );
  }

  // Loading state - always show blur image if available, otherwise show loading placeholder
  if (isLoading) {
    // When using fill, ensure proper container styling during loading
    const loadingContainerStyle = fill 
      ? { 
          width: width || "100%", 
          height: height || "100%",
          minHeight: height || "200px",
          position: "relative" as const
        }
      : { width, height };

    const loadingContainerClassName = fill 
      ? `relative overflow-hidden ${className || ""}` + (
          (!height && !className?.includes('h-')) ? ' min-h-[200px]' : ''
        )
      : `relative overflow-hidden ${className || ""}`;

    if (blurDataURL) {
      return (
        <div className={loadingContainerClassName} style={loadingContainerStyle}>
          <Image
            src={blurDataURL}
            alt={alt}
            width={!fill ? width : undefined}
            height={!fill ? height : undefined}
            fill={fill}
            className="object-cover"
            placeholder="blur"
            blurDataURL={blurDataURL}
            loading="eager"
            priority={true}
          />
          {/* Subtle loading indicator overlay */}
          <div className="absolute inset-0 bg-background/10 animate-pulse" />
        </div>
      );
    } else {
      // Fallback loading state when no blur data available
      return (
        <div
          className={`bg-muted animate-pulse ${loadingContainerClassName}`}
          style={loadingContainerStyle}
        >
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Loading...
          </div>
        </div>
      );
    }
  }

  if (!resolvedUrl || resolvedUrl.trim() === '') {
    return (
      <div
        className={`bg-muted border-2 border-dashed border-muted-foreground/25 ${className}`}
        style={{ width, height }}
      >
        <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
          Image not available
        </div>
      </div>
    );
  }

  // Additional validation to ensure we have a valid URL format
  let validUrl: string;
  try {
    // For blob URLs, relative URLs, and absolute URLs, validate differently
    if (resolvedUrl.startsWith('blob:') || resolvedUrl.startsWith('http://') || resolvedUrl.startsWith('https://')) {
      // Test if it's a valid URL
      new URL(resolvedUrl);
      validUrl = resolvedUrl;
    } else if (resolvedUrl.startsWith('/')) {
      // Relative URL starting with /
      validUrl = resolvedUrl;
    } else {
      // Fallback for other relative paths
      validUrl = `/${resolvedUrl}`;
    }
  } catch {
    // If URL parsing fails, show error state
    return (
      <div
        className={`bg-muted border-2 border-dashed border-muted-foreground/25 ${className}`}
        style={{ width, height }}
      >
        <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
          Invalid image URL
        </div>
      </div>
    );
  }

  // Enhanced image loading with proper blur-to-sharp transition
  const handleImageLoad = (event: React.SyntheticEvent<HTMLImageElement>) => {
    setImageLoaded(true);
    onLoad?.(event);
  };

  // When using fill, ensure the container has proper styling and minimum dimensions
  const containerStyle = fill 
    ? { 
        width: width || "100%", 
        height: height || "100%",
        minHeight: height || "200px", // Ensure minimum height when using fill
        position: "relative" as const
      }
    : { width, height };

  const containerClassName = fill 
    ? `relative overflow-hidden ${className || ""}` + (
        // Add min-height class if no explicit height is provided
        (!height && !className?.includes('h-')) ? ' min-h-[200px]' : ''
      )
    : `relative overflow-hidden ${className || ""}`;

  return (
    <div className={containerClassName} style={containerStyle}>
      {/* Blur placeholder that stays visible until the sharp image loads */}
      {blurDataURL && (
        <Image
          src={blurDataURL}
          alt={alt}
          width={!fill ? width : undefined}
          height={!fill ? height : undefined}
          fill={fill}
          className={`absolute inset-0 object-cover transition-opacity duration-300 ${
            imageLoaded ? "opacity-0" : "opacity-100"
          }`}
          placeholder="blur"
          blurDataURL={blurDataURL}
          loading="eager"
          priority={true}
        />
      )}
      
      {/* Main image with smooth fade-in */}
      <Image
        src={validUrl}
        alt={alt}
        width={!fill ? width : undefined}
        height={!fill ? height : undefined}
        fill={fill}
        className={`object-cover transition-opacity duration-300 ${
          imageLoaded ? "opacity-100" : "opacity-0"
        }`}
        loading={priority ? "eager" : loading}
        sizes={sizes}
        priority={priority}
        onLoad={handleImageLoad}
        placeholder="empty"
        blurDataURL={undefined}
      />
    </div>
  );
}

/**
 * MediaVideo - Automatically resolves relative paths to full URLs
 * Usage: <MediaVideo src="videos/user123-video-xyz789.mp4" controls />
 */
export const MediaVideo = React.forwardRef<HTMLVideoElement, MediaVideoProps>(
  function MediaVideo(
    {
      src,
      className,
      controls = false,
      autoPlay = false,
      loop = false,
      muted = false,
      playsInline = false,
      preload = "metadata",
      onLoadedMetadata,
      onPlay,
      onPause,
      onEnded,
    },
    ref
  ) {
    const [resolvedUrl, setResolvedUrl] = useState<string>("");
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
      if (!src) {
        setIsLoading(false);
        return;
      }

      // If src is already a full URL or a blob URL, use it directly
      if (
        src.startsWith("http://") ||
        src.startsWith("https://") ||
        src.startsWith("blob:")
      ) {
        setResolvedUrl(src);
        setIsLoading(false);
        return;
      }

      // Resolve relative path to full URL
      resolveMediaUrl(src)
        .then((url: string) => {
          setResolvedUrl(url);
          setIsLoading(false);
        })
        .catch((err: Error) => {
          console.error("Error resolving video URL:", err);
          setError("Failed to load video");
          setIsLoading(false);
        });
    }, [src]);

    if (isLoading) {
      return (
        <div className={`bg-muted animate-pulse ${className}`}>
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Loading video...
          </div>
        </div>
      );
    }

    if (error || !resolvedUrl) {
      return (
        <div
          className={`bg-muted border-2 border-dashed border-muted-foreground/25 ${className}`}
        >
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            {error || "Video not available"}
          </div>
        </div>
      );
    }

    return (
      <video
        ref={ref}
        src={resolvedUrl}
        className={className}
        controls={controls}
        autoPlay={autoPlay}
        loop={loop}
        muted={muted}
        playsInline={playsInline}
        preload={preload}
        onLoadedMetadata={onLoadedMetadata}
        onPlay={onPlay}
        onPause={onPause}
        onEnded={onEnded}
      >
        Your browser does not support the video tag.
      </video>
    );
  }
);

/**
 * MediaVideoLazy - Shows preview image first, loads video only on demand
 * This significantly reduces bandwidth by only loading videos when users actually want to watch them
 * 
 * Usage: 
 * <MediaVideoLazy 
 *   src="videos/user123-video-xyz789.mp4" 
 *   previewSrc="preview/preview-user123-video-xyz789.webp"
 *   alt="Video description"
 *   controls
 * />
 */
export const MediaVideoLazy = React.forwardRef<HTMLVideoElement, MediaVideoLazyProps>(
  function MediaVideoLazy(
    {
      src,
      previewSrc,
      alt,
      className,
      controls = false,
      autoPlay = false,
      loop = false,
      muted = false,
      playsInline = false,
      preload = "metadata",
      onLoadedMetadata,
      onPlay,
      onPause,
      onEnded,
      blurDataURL,
      width,
      height,
      fill = false,
      sizes,
      priority = false,
      autoShowVideo = false,
      onVideoRequested,
      loading = "lazy",
      showPlayButton = true,
      playButtonClassName,
    },
    ref
  ) {
    const [showVideo, setShowVideo] = useState(autoShowVideo);
    const [videoLoaded, setVideoLoaded] = useState(false);
    const [isLoadingVideo, setIsLoadingVideo] = useState(false);

    // Handle play button click - this loads the video for the first time
    const handlePlayButtonClick = (event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      
      if (!showVideo) {
        setIsLoadingVideo(true);
        setShowVideo(true);
        onVideoRequested?.();
      }
    };

    // Handle video loaded metadata
    const handleVideoLoadedMetadata = (event: React.SyntheticEvent<HTMLVideoElement>) => {
      setVideoLoaded(true);
      setIsLoadingVideo(false);
      onLoadedMetadata?.(event);
      
      // Auto-play if requested
      if (autoPlay) {
        const video = event.currentTarget as HTMLVideoElement;
        video.play();
      }
    };

    // Update showVideo when autoShowVideo prop changes
    useEffect(() => {
      if (autoShowVideo && !showVideo) {
        setIsLoadingVideo(true);
        setShowVideo(true);
      }
    }, [autoShowVideo, showVideo]);

    // Container styling for consistent dimensions
    const containerStyle = fill 
      ? { 
          width: width || "100%", 
          height: height || "100%",
          minHeight: height || "200px",
          position: "relative" as const
        }
      : { width, height };

    const containerClassName = fill 
      ? `relative overflow-hidden ${className || ""}` + (
          (!height && !className?.includes('h-')) ? ' min-h-[200px]' : ''
        )
      : `relative overflow-hidden ${className || ""}`;

    return (
      <div className={containerClassName} style={containerStyle}>
        {/* Preview Image - Always shown initially, fades out when video loads */}
        {previewSrc && (
          <MediaImage
            src={previewSrc}
            alt={alt}
            width={!fill ? width : undefined}
            height={!fill ? height : undefined}
            fill={fill}
            className={`object-cover transition-opacity duration-300 ${
              showVideo && videoLoaded ? "opacity-0" : "opacity-100"
            } ${fill ? "absolute inset-0" : ""}`}
            loading={loading}
            sizes={sizes}
            priority={priority}
            blurDataURL={blurDataURL}
          />
        )}

        {/* Video Element - Only rendered when user requests it */}
        {showVideo && (
          <MediaVideo
            ref={ref}
            src={src}
            className={`transition-opacity duration-300 ${
              videoLoaded ? "opacity-100" : "opacity-0"
            } ${fill ? "absolute inset-0 w-full h-full object-cover" : ""}`}
            controls={controls}
            autoPlay={autoPlay}
            loop={loop}
            muted={muted}
            playsInline={playsInline}
            preload={preload}
            onLoadedMetadata={handleVideoLoadedMetadata}
            onPlay={onPlay}
            onPause={onPause}
            onEnded={onEnded}
          />
        )}

        {/* Play Button Overlay - Only shown when video is not loaded */}
        {showPlayButton && !showVideo && previewSrc && (
          <div className="absolute inset-0 flex items-center justify-center">
            <button
              className={`bg-black/50 hover:bg-black/70 text-white rounded-full p-3 transition-all duration-200 hover:scale-110 ${playButtonClassName || ""}`}
              onClick={handlePlayButtonClick}
              aria-label="Play video"
            >
              <Play className="w-6 h-6" />
            </button>
          </div>
        )}

        {/* Loading Indicator - Shown while video is loading */}
        {isLoadingVideo && !videoLoaded && (
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center z-10">
            <div className="bg-white/90 rounded-full p-3">
              <Loader2 className="w-6 h-6 text-gray-600 animate-spin" />
            </div>
          </div>
        )}

        {/* Fallback when no preview is available */}
        {!previewSrc && !showVideo && (
          <div className="absolute inset-0 bg-muted flex items-center justify-center">
            <button
              className={`bg-primary text-primary-foreground rounded-full p-4 transition-all duration-200 hover:scale-110 ${playButtonClassName || ""}`}
              onClick={handlePlayButtonClick}
              aria-label="Load and play video"
            >
              <Play className="w-8 h-8" />
            </button>
          </div>
        )}
      </div>
    );
  }
);
