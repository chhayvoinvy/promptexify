"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";

/**
 * Client-side URL resolver that calls the API endpoint
 */
async function resolveMediaUrl(path: string): Promise<string> {
  try {
    const response = await fetch("/api/media/resolve", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ paths: [path] }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.url || path;
  } catch (error) {
    console.error("Error resolving media URL:", error);
    return path; // Fallback to original path
  }
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

  if (isLoading) {
    return (
      <div
        className={`bg-muted animate-pulse ${className}`}
        style={{ width, height }}
      >
        <div className="flex items-center justify-center h-full text-muted-foreground">
          Loading...
        </div>
      </div>
    );
  }

  if (error || !resolvedUrl) {
    return (
      <div
        className={`bg-muted border-2 border-dashed border-muted-foreground/25 ${className}`}
        style={{ width, height }}
      >
        <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
          {error || "Image not available"}
        </div>
      </div>
    );
  }

  return (
    <Image
      src={resolvedUrl}
      alt={alt}
      width={width}
      height={height}
      fill={fill}
      className={className}
      loading={priority ? "eager" : loading}
      sizes={sizes}
      priority={priority}
      onLoad={onLoad}
      blurDataURL={blurDataURL}
    />
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
