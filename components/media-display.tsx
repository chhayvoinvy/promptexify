"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";

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
  src: string; // Relative path like "images/user123-prompt-abc123.avif"
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

/**
 * MediaImage - Automatically resolves relative paths to full URLs
 * Usage: <MediaImage src="images/user123-prompt-abc123.avif" alt="Prompt" />
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

    // Resolve relative path to full URL
    resolveMediaUrl(src)
      .then((url: string) => {
        setResolvedUrl(url);
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

  if (!resolvedUrl) {
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
        src={resolvedUrl}
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
