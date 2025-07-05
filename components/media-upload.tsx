"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Upload,
  X,
  Image as ImageIcon,
  Video,
  Loader2,
  Play,
} from "lucide-react";
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

  // Handle drag events
  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!disabled) {
        setDragOver(true);
      }
    },
    [disabled]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);

      if (disabled) return;

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        handleFileUpload(files[0]);
      }
    },
    [disabled, handleFileUpload]
  );

  // Handle file input change
  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFileUpload(files[0]);
      }
    },
    [handleFileUpload]
  );

  // Handle remove media
  const handleRemoveMedia = useCallback(() => {
    setImagePreview(null);
    setVideoPreview(null);
    setUploadState({
      uploading: false,
      progress: 0,
      error: null,
      success: false,
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const currentMedia = imagePreview || videoPreview;
  const currentMediaType = imagePreview ? "image" : "video";

  return (
    <div className={cn("space-y-4", className)}>
      <Label>Featured Media (Image or Video)</Label>

      {/* Upload Area */}
      <div
        ref={dropZoneRef}
        className={cn(
          "relative rounded-lg border-2 border-dashed p-6 text-center transition-colors",
          dragOver
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-muted-foreground/50",
          disabled && "opacity-50 cursor-not-allowed",
          currentMedia && "border-solid"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Preview */}
        {currentMedia && (
          <div className="relative mb-4">
            {currentMediaType === "image" ? (
              <img
                src={currentMedia}
                alt="Preview"
                className="max-h-48 mx-auto rounded-lg object-cover"
              />
            ) : (
              <div className="relative max-h-48 mx-auto">
                <video
                  src={currentMedia}
                  className="max-h-48 mx-auto rounded-lg object-cover"
                  controls
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <Play className="w-12 h-12 text-white/80 bg-black/50 rounded-full p-2" />
                </div>
              </div>
            )}

            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="absolute -top-2 -right-2"
              onClick={handleRemoveMedia}
              disabled={disabled || uploadState.uploading}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Upload UI */}
        {!currentMedia && (
          <>
            <div className="flex justify-center mb-4">
              <div className="flex space-x-2">
                <ImageIcon className="w-8 h-8 text-muted-foreground" />
                <Video className="w-8 h-8 text-muted-foreground" />
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Drop your image or video here, or click to browse
              </p>
              <p className="text-xs text-muted-foreground">
                Images: JPEG, PNG, WebP, AVIF (max{" "}
                {storageConfig
                  ? Math.round(storageConfig.maxImageSize / (1024 * 1024))
                  : 2}
                MB)
                <br />
                Videos: MP4, WebM, QuickTime, AVI (max{" "}
                {storageConfig
                  ? Math.round(storageConfig.maxVideoSize / (1024 * 1024))
                  : 10}
                MB)
                {storageConfig?.storageType === "LOCAL" && (
                  <>
                    <br />
                    <span className="text-orange-600">
                      Files stored locally on server
                    </span>
                  </>
                )}
                {storageConfig?.storageType === "DOSPACE" && (
                  <>
                    <br />
                    <span className="text-blue-600">
                      Files stored in DigitalOcean Spaces
                    </span>
                  </>
                )}
                {storageConfig?.storageType === "S3" && (
                  <>
                    <br />
                    <span className="text-green-600">
                      Files stored in Amazon S3
                    </span>
                  </>
                )}
              </p>
            </div>
          </>
        )}

        {/* Upload Progress */}
        {uploadState.uploading && (
          <div className="space-y-2">
            <div className="flex items-center justify-center space-x-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm text-muted-foreground">
                Uploading...
              </span>
            </div>
            <Progress value={uploadState.progress} className="w-full" />
          </div>
        )}

        {/* Hidden file input */}
        <Input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          onChange={handleFileChange}
          className="absolute inset-0 opacity-0 cursor-pointer"
          disabled={disabled || uploadState.uploading}
        />
      </div>

      {/* Browse Button */}
      {!currentMedia && !uploadState.uploading && (
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          className="w-full"
        >
          <Upload className="w-4 h-4 mr-2" />
          Browse Files
        </Button>
      )}

      {/* Error Alert */}
      {uploadState.error && (
        <Alert variant="destructive">
          <AlertDescription>{uploadState.error}</AlertDescription>
        </Alert>
      )}

      {/* Success Alert */}
      {uploadState.success && (
        <Alert>
          <AlertDescription>
            {currentMediaType === "image" ? "Image" : "Video"} uploaded
            successfully!
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
