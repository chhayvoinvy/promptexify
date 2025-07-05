"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, X, Loader2 } from "lucide-react";
import { MediaImage, MediaVideo } from "@/components/ui/media-display";
import { cn } from "@/lib/utils";

interface MediaUploadProps {
  onMediaUploaded: (mediaUrl: string, mediaType: "image" | "video") => void;
  currentImageUrl?: string;
  currentVideoUrl?: string;
  title?: string;
  disabled?: boolean;
  className?: string;
}

interface UploadState {
  uploading: boolean;
  progress: number;
  error: string | null;
  success: boolean;
}

type MediaType = "image" | "video";

export function MediaUpload({
  onMediaUploaded,
  currentImageUrl,
  currentVideoUrl,
  title = "untitled",
  disabled = false,
  className,
}: MediaUploadProps) {
  const [dragOver, setDragOver] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(
    currentImageUrl || null
  );
  const [videoPreview, setVideoPreview] = useState<string | null>(
    currentVideoUrl || null
  );
  const [uploadState, setUploadState] = useState<UploadState>({
    uploading: false,
    progress: 0,
    error: null,
    success: false,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // Sync previews with props
  useEffect(() => {
    setImagePreview(currentImageUrl || null);
  }, [currentImageUrl]);

  useEffect(() => {
    setVideoPreview(currentVideoUrl || null);
  }, [currentVideoUrl]);

  // Storage configuration state
  const [storageConfig, setStorageConfig] = useState<{
    maxImageSize: number;
    maxVideoSize: number;
    storageType: string;
  } | null>(null);

  // Fetch storage configuration
  useEffect(() => {
    fetch("/api/storage-config")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setStorageConfig({
            maxImageSize: data.config.maxImageSize,
            maxVideoSize: data.config.maxVideoSize,
            storageType: data.config.storageType,
          });
        }
      })
      .catch((error) => {
        console.error("Failed to fetch storage config:", error);
        // Fallback to defaults
        setStorageConfig({
          maxImageSize: 2097152, // 2MB
          maxVideoSize: 10485760, // 10MB
          storageType: "S3",
        });
      });
  }, []);

  // File validation with dynamic limits
  const validateFile = useCallback(
    (file: File): { isValid: boolean; error?: string; type?: MediaType } => {
      const maxImageSize = storageConfig?.maxImageSize || 2097152; // Default 2MB
      const maxVideoSize = storageConfig?.maxVideoSize || 10485760; // Default 10MB

      const imageTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
        "image/avif",
      ];

      const videoTypes = [
        "video/mp4",
        "video/webm",
        "video/quicktime",
        "video/x-msvideo",
      ];

      const isImage = imageTypes.includes(file.type);
      const isVideo = videoTypes.includes(file.type);

      if (!isImage && !isVideo) {
        return {
          isValid: false,
          error:
            "Invalid file type. Only images (JPEG, PNG, WebP, AVIF) and videos (MP4, WebM, QuickTime, AVI) are allowed.",
        };
      }

      const maxSize = isImage ? maxImageSize : maxVideoSize;
      const fileTypeLabel = isImage ? "image" : "video";
      const maxSizeMB = Math.round(maxSize / (1024 * 1024));

      if (file.size > maxSize) {
        return {
          isValid: false,
          error: `File size too large. Maximum size for ${fileTypeLabel}s is ${maxSizeMB}MB.`,
        };
      }

      return { isValid: true, type: isImage ? "image" : "video" };
    },
    [storageConfig]
  );

  // Handle file upload
  const handleFileUpload = useCallback(
    async (file: File) => {
      if (disabled) return;

      // Validate file
      const validation = validateFile(file);
      if (!validation.isValid) {
        setUploadState({
          uploading: false,
          progress: 0,
          error: validation.error || "Invalid file",
          success: false,
        });
        return;
      }

      const mediaType = validation.type!;

      // Reset state
      setUploadState({
        uploading: true,
        progress: 0,
        error: null,
        success: false,
      });

      try {
        // Create preview
        const previewUrl = URL.createObjectURL(file);
        if (mediaType === "image") {
          setImagePreview(previewUrl);
          setVideoPreview(null); // Clear video when uploading image
        } else {
          setVideoPreview(previewUrl);
          setImagePreview(null); // Clear image when uploading video
        }

        // Prepare form data
        const formData = new FormData();
        formData.append(mediaType, file);
        formData.append("title", title);

        // Upload with progress simulation
        const progressInterval = setInterval(() => {
          setUploadState((prev) => ({
            ...prev,
            progress: Math.min(prev.progress + 10, 90),
          }));
        }, 200);

        // Upload to appropriate API endpoint
        const endpoint =
          mediaType === "image" ? "/api/upload/image" : "/api/upload/video";
        const response = await fetch(endpoint, {
          method: "POST",
          body: formData,
        });

        clearInterval(progressInterval);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Upload failed");
        }

        const result = await response.json();

        // Complete progress
        setUploadState({
          uploading: false,
          progress: 100,
          error: null,
          success: true,
        });

        // Clean up preview URL
        URL.revokeObjectURL(previewUrl);

        // Set final media URL
        const mediaUrl =
          mediaType === "image" ? result.imageUrl : result.videoUrl;
        if (mediaType === "image") {
          setImagePreview(mediaUrl);
        } else {
          setVideoPreview(mediaUrl);
        }

        onMediaUploaded(mediaUrl, mediaType);

        // Clear success message after 3 seconds
        setTimeout(() => {
          setUploadState((prev) => ({ ...prev, success: false }));
        }, 3000);
      } catch (error) {
        console.error("Upload error:", error);
        setUploadState({
          uploading: false,
          progress: 0,
          error: error instanceof Error ? error.message : "Upload failed",
          success: false,
        });
      }
    },
    [disabled, validateFile, title, onMediaUploaded]
  );

  // Handle remove media
  const handleRemoveMedia = (type: MediaType) => () => {
    if (type === "image") {
      setImagePreview(null);
      onMediaUploaded("", "image");
    } else {
      setVideoPreview(null);
      onMediaUploaded("", "video");
    }
    setUploadState({
      uploading: false,
      progress: 0,
      error: null,
      success: false,
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!disabled) {
      setDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!disabled) {
      setDragOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!disabled) {
      setDragOver(false);
    }
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const renderPreview = () => {
    if (!imagePreview && !videoPreview) return null;

    return (
      <div className="absolute inset-0 p-2">
        <div className="relative w-full h-full">
          {imagePreview ? (
            <MediaImage
              src={imagePreview}
              alt="Image preview"
              fill
              className="object-contain rounded-lg"
            />
          ) : videoPreview ? (
            <MediaVideo
              src={videoPreview}
              className="w-full h-full object-contain rounded-lg"
              autoPlay
              muted
              loop
              playsInline
            />
          ) : null}

          {!disabled && (
            <Button
              variant="destructive"
              size="icon"
              className="absolute top-1 right-1 h-7 w-7 z-10"
              onClick={handleRemoveMedia(imagePreview ? "image" : "video")}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={cn("space-y-4", className)}>
      <Label htmlFor="media-upload">Featured Media</Label>
      <div
        ref={dropZoneRef}
        className={cn(
          "relative flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer bg-muted/50 hover:bg-muted/75 transition-colors",
          {
            "border-primary": dragOver,
            "border-destructive": uploadState.error,
            "border-green-500": uploadState.success,
          }
        )}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        {uploadState.uploading ? (
          <div className="flex flex-col items-center justify-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Uploading...</p>
            <Progress value={uploadState.progress} className="w-48" />
          </div>
        ) : (
          <>
            {renderPreview()}
            <div
              className={cn("flex flex-col items-center justify-center", {
                "opacity-0 hover:opacity-100 transition-opacity absolute inset-0 bg-black/90":
                  imagePreview || videoPreview,
              })}
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
                <Upload
                  className="w-8 h-8 mb-4 text-muted-foreground"
                  aria-hidden="true"
                />
                <p className="mb-2 text-sm text-muted-foreground">
                  <span className="font-semibold">Click to upload</span> or drag
                  and drop
                </p>
                <p className="text-xs text-muted-foreground">
                  Image (AVIF, PNG, JPG) or Video (MP4, WebM)
                </p>
                {storageConfig && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Max size: {storageConfig.maxImageSize / (1024 * 1024)}MB
                    (img), {storageConfig.maxVideoSize / (1024 * 1024)}MB (vid)
                  </p>
                )}
              </div>
              <Input
                id="media-upload"
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileSelect}
                accept="image/*,video/*"
                disabled={disabled}
              />
            </div>
          </>
        )}
      </div>
      {uploadState.error && (
        <Alert variant="destructive">
          <AlertDescription>{uploadState.error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
