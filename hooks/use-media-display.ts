import { useState, useEffect } from "react";

interface MediaDisplayOptions {
  preferPreview?: boolean;
  fallbackToOriginal?: boolean;
}

interface MediaDisplayResult {
  displayUrl: string;
  isPreview: boolean;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook for handling media display with preview path prioritization
 * @param originalPath - Original media path (e.g., "images/file.jpg")
 * @param previewPath - Preview path (e.g., "preview/file.webp")
 * @param options - Display options
 * @returns MediaDisplayResult with resolved URL and metadata
 */
export function useMediaDisplay(
  originalPath: string | null | undefined,
  previewPath: string | null | undefined,
  options: MediaDisplayOptions = {}
): MediaDisplayResult {
  const { preferPreview = true, fallbackToOriginal = false } = options;
  const [displayUrl, setDisplayUrl] = useState<string>("");
  const [isPreview, setIsPreview] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!previewPath) {
      setDisplayUrl("");
      setIsLoading(false);
      setError("No preview path available");
      return;
    }

    // Always use preview path if available
    const pathToUse = previewPath;
    const shouldUsePreview = true;

    // If it's already a full URL, use it directly
    if (
      pathToUse.startsWith("http://") ||
      pathToUse.startsWith("https://") ||
      pathToUse.startsWith("blob:")
    ) {
      setDisplayUrl(pathToUse);
      setIsPreview(shouldUsePreview);
      setIsLoading(false);
      setError(null);
      return;
    }

    // Handle preview paths - use API route for proper serving
    if (pathToUse.startsWith("preview/")) {
      // Use API route for preview media to ensure proper content-type and security
      const previewApiUrl = `/api/media/preview/${pathToUse.replace("preview/", "")}`;
      setDisplayUrl(previewApiUrl);
      setIsPreview(true);
      setIsLoading(false);
      setError(null);
      return;
    }

    // For regular media paths, resolve to full URL
    // This would typically use your existing resolveMediaUrl function
    // For now, we'll set it directly and let the MediaImage component handle resolution
    setDisplayUrl(pathToUse);
    setIsPreview(shouldUsePreview);
    setIsLoading(false);
    setError(null);
  }, [previewPath, preferPreview, fallbackToOriginal]);

  return {
    displayUrl,
    isPreview,
    isLoading,
    error,
  };
}

/**
 * Hook for image-specific media display
 */
export function useImageDisplay(
  originalPath: string | null | undefined,
  previewPath: string | null | undefined,
  options: MediaDisplayOptions = {}
): MediaDisplayResult {
  return useMediaDisplay(originalPath, previewPath, options);
}

/**
 * Hook for video-specific media display with preview video support
 */
export function useVideoDisplay(
  originalPath: string | null | undefined,
  previewPath: string | null | undefined,
  previewVideoPath: string | null | undefined,
  options: MediaDisplayOptions & {
    usePreviewVideo?: boolean;
  } = {}
): MediaDisplayResult & {
  previewVideoUrl: string | null;
} {
  const { usePreviewVideo = true, ...mediaOptions } = options;
  
  // For videos, use preview video for playback if available
  const videoPath = usePreviewVideo && previewVideoPath ? previewVideoPath : previewPath;
  
  const result = useMediaDisplay(originalPath, videoPath, mediaOptions);
  
  return {
    ...result,
    previewVideoUrl: previewVideoPath ? `/api/media/preview/${previewVideoPath.replace("preview/", "")}` : null,
  };
} 