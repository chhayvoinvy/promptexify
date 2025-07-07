"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, X, Loader2, Trash } from "@/components/ui/icons";
import { MediaImage, MediaVideo } from "@/components/ui/media-display";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { useCSRFForm } from "@/hooks/use-csrf";
import { toast } from "sonner";

// Local type definition for the upload result to avoid direct dependency on backend types
interface UploadResult {
  id: string;
  url: string;
  filename: string;
  relativePath: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  width?: number;
  height?: number;
  storageType: "S3" | "LOCAL" | "DOSPACE";
}

interface MediaUploadProps {
  onMediaUploaded?: (result: UploadResult | null) => void;
  currentImageUrl?: string;
  currentVideoUrl?: string;
  currentImageId?: string;
  currentVideoId?: string;
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

interface DeletionState {
  deleting: boolean;
  showConfirmDialog: boolean;
  pendingDeletionType: MediaType | null;
}

type MediaType = "image" | "video";

export function MediaUpload({
  onMediaUploaded,
  currentImageUrl,
  currentVideoUrl,
  currentImageId,
  currentVideoId,
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
  const [deletionState, setDeletionState] = useState<DeletionState>({
    deleting: false,
    showConfirmDialog: false,
    pendingDeletionType: null,
  });

  const { token, getHeadersWithCSRF } = useCSRFForm();
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
        formData.append("csrf_token", token || "");

        // Upload file
        const endpoint = `/api/upload/${mediaType}`;
        const response = await fetch(endpoint, {
          method: "POST",
          body: formData,
          credentials: "same-origin",
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({
            error: "Upload failed",
          }));
          throw new Error(errorData.error || "Upload failed");
        }

        const result = await response.json();

        setUploadState({
          uploading: false,
          progress: 100,
          error: null,
          success: true,
        });

        // Notify parent component
        if (onMediaUploaded) {
          onMediaUploaded(result);
        }

        // Clean up preview URL
        URL.revokeObjectURL(previewUrl);

        // Set final media URL
        const mediaUrl = result.url;
        if (mediaType === "image") {
          setImagePreview(mediaUrl);
        } else {
          setVideoPreview(mediaUrl);
        }

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
    [disabled, validateFile, title, onMediaUploaded, token]
  );

  // Handle file deletion from storage
  const handleDeleteFile = async (type: MediaType, url: string) => {
    setDeletionState((prev) => ({ ...prev, deleting: true }));

    try {
      const headers = await getHeadersWithCSRF({
        "Content-Type": "application/json",
      });

      const endpoint = `/api/upload/${type}/delete`;
      const response = await fetch(endpoint, {
        method: "DELETE",
        headers,
        body: JSON.stringify({
          [`${type}Url`]: url,
        }),
        credentials: "same-origin",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          error: "Deletion failed",
        }));
        throw new Error(errorData.error || "Failed to delete file");
      }

      const result = await response.json();
      if (result.success) {
        toast.success(result.message || "File deleted successfully");
        return true;
      } else {
        throw new Error(result.error || "Failed to delete file");
      }
    } catch (error) {
      console.error("Deletion error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to delete file";
      toast.error(errorMessage);
      return false;
    } finally {
      setDeletionState((prev) => ({ ...prev, deleting: false }));
    }
  };

  // Handle remove media with confirmation
  const handleRemoveMedia = (type: MediaType) => () => {
    if (disabled || deletionState.deleting) return;

    setDeletionState({
      deleting: false,
      showConfirmDialog: true,
      pendingDeletionType: type,
    });
  };

  // Handle confirmation dialog actions
  const handleConfirmDeletion = async () => {
    const { pendingDeletionType } = deletionState;
    if (!pendingDeletionType) return;

    setDeletionState((prev) => ({
      ...prev,
      showConfirmDialog: false,
      pendingDeletionType: null,
    }));

    // Get the current URL for the media type
    const currentUrl =
      pendingDeletionType === "image" ? imagePreview : videoPreview;

    // If there's a current URL, attempt to delete it from storage
    let deletionSuccess = true;
    if (currentUrl && (currentImageId || currentVideoId)) {
      deletionSuccess = await handleDeleteFile(pendingDeletionType, currentUrl);
    }

    // Always clear the preview locally (even if deletion fails, we don't want to show it)
    if (pendingDeletionType === "image") {
      setImagePreview(null);
    } else {
      setVideoPreview(null);
    }

    // Reset upload state
    setUploadState({
      uploading: false,
      progress: 0,
      error: null,
      success: false,
    });

    // Notify parent component
    if (onMediaUploaded) {
      onMediaUploaded(null);
    }

    // Show appropriate message
    if (!currentUrl) {
      toast.success("Media removed successfully");
    } else if (!deletionSuccess) {
      toast.error(
        "Media removed from preview, but deletion from storage failed"
      );
    }
  };

  const handleCancelDeletion = () => {
    setDeletionState({
      deleting: false,
      showConfirmDialog: false,
      pendingDeletionType: null,
    });
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

    const isDeleting = deletionState.deleting;

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
              muted
              loop
              playsInline
            />
          ) : null}

          {!disabled && (
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute top-1 right-1 h-7 w-7 z-10"
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveMedia(imagePreview ? "image" : "video")();
              }}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <X className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
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
                    <span className="font-semibold">Click to upload</span> or
                    drag and drop
                  </p>
                  {storageConfig && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Max size:{" "}
                      {Math.round(storageConfig.maxImageSize / (1024 * 1024))}
                      MB (image),{" "}
                      {Math.round(storageConfig.maxVideoSize / (1024 * 1024))}
                      MB (video)
                    </p>
                  )}

                  <p className="text-xs text-muted-foreground">
                    Allowed: Image (AVIF, PNG, JPG) or Video (MP4)
                  </p>
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

      {/* Confirmation Dialog */}
      <AlertDialog
        open={deletionState.showConfirmDialog}
        onOpenChange={() => {}}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Media File</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this{" "}
              {deletionState.pendingDeletionType}? This action cannot be undone
              and will permanently remove the file from storage.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelDeletion} type="button">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeletion}
              type="button"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <Trash className="w-4 h-4 mr-2" />
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
