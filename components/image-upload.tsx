"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, X, Image as ImageIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  onImageUploaded: (imageUrl: string) => void;
  currentImageUrl?: string;
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

export function ImageUpload({
  onImageUploaded,
  currentImageUrl,
  title = "untitled",
  disabled = false,
  className,
}: ImageUploadProps) {
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<string | null>(
    currentImageUrl || null
  );
  const [uploadState, setUploadState] = useState<UploadState>({
    uploading: false,
    progress: 0,
    error: null,
    success: false,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // Sync preview with currentImageUrl prop
  useEffect(() => {
    setPreview(currentImageUrl || null);
  }, [currentImageUrl]);

  // Storage configuration state
  const [storageConfig, setStorageConfig] = useState<{
    maxImageSize: number;
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
            storageType: data.config.storageType,
          });
        }
      })
      .catch((error) => {
        console.error("Failed to fetch storage config:", error);
        // Fallback to defaults
        setStorageConfig({
          maxImageSize: 2097152, // 2MB
          storageType: "S3",
        });
      });
  }, []);

  // File validation with dynamic limits
  const validateFile = useCallback(
    (file: File): { isValid: boolean; error?: string } => {
      const maxSize = storageConfig?.maxImageSize || 2097152; // Default 2MB
      const allowedTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
        "image/avif",
      ];

      if (!allowedTypes.includes(file.type)) {
        return {
          isValid: false,
          error:
            "Invalid file type. Only JPEG, PNG, WebP, and AVIF images are allowed.",
        };
      }

      if (file.size > maxSize) {
        const maxSizeMB = Math.round(maxSize / (1024 * 1024));
        return {
          isValid: false,
          error: `File size too large. Maximum size is ${maxSizeMB}MB.`,
        };
      }

      return { isValid: true };
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
        setPreview(previewUrl);

        // Prepare form data
        const formData = new FormData();
        formData.append("image", file);
        formData.append("title", title);

        // Upload with progress simulation (since we can't track real progress with FormData)
        const progressInterval = setInterval(() => {
          setUploadState((prev) => ({
            ...prev,
            progress: Math.min(prev.progress + 10, 90),
          }));
        }, 200);

        // Upload to API
        const response = await fetch("/api/upload/image", {
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

        // Set final image URL
        setPreview(result.imageUrl);
        onImageUploaded(result.imageUrl);

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
    [disabled, validateFile, title, onImageUploaded]
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
  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFileUpload(files[0]);
      }
    },
    [handleFileUpload]
  );

  // Handle click to open file dialog
  const handleUploadClick = useCallback(() => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  }, [disabled]);

  // Remove current image
  const handleRemoveImage = useCallback(() => {
    if (disabled) return;

    setPreview(null);
    onImageUploaded("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [disabled, onImageUploaded]);

  return (
    <div className={cn("space-y-4", className)}>
      <div className="space-y-2">
        <Label htmlFor="image-upload">Featured Image</Label>
        <p className="text-sm text-muted-foreground">
          Upload an image (JPEG, PNG, WebP, or AVIF, max{" "}
          {storageConfig
            ? Math.round(storageConfig.maxImageSize / (1024 * 1024))
            : 2}
          MB).{" "}
          {storageConfig?.storageType === "S3" &&
            "It will be automatically converted to AVIF format."}
          {storageConfig?.storageType === "LOCAL" &&
            "Files will be stored locally on the server."}
        </p>
      </div>

      {/* Upload Area */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {preview ? (
            // Preview Area
            <div className="relative group">
              <div className="aspect-video bg-muted flex items-center justify-center overflow-hidden">
                <img
                  src={preview}
                  alt="Preview"
                  className="max-w-full max-h-full object-contain"
                />
              </div>
              {!disabled && (
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={handleUploadClick}
                      disabled={uploadState.uploading}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Replace
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={handleRemoveImage}
                      disabled={uploadState.uploading}
                    >
                      <X className="w-4 h-4 mr-2" />
                      Remove
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            // Drop Zone
            <div
              ref={dropZoneRef}
              className={cn(
                "border-2 border-dashed border-border hover:border-primary/50 transition-colors duration-200 cursor-pointer",
                "aspect-video flex flex-col items-center justify-center p-8 text-center",
                dragOver && "border-primary bg-primary/5",
                disabled && "cursor-not-allowed opacity-50"
              )}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={handleUploadClick}
            >
              {uploadState.uploading ? (
                <div className="flex flex-col items-center space-y-4">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <div className="space-y-2 w-full max-w-xs">
                    <p className="text-sm text-muted-foreground">
                      Uploading and processing...
                    </p>
                    <Progress value={uploadState.progress} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                      {uploadState.progress}%
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center space-y-4">
                  <ImageIcon className="w-12 h-12 text-muted-foreground" />
                  <div className="space-y-2">
                    <p className="text-sm font-medium">
                      Drop your image here, or click to browse
                    </p>
                    <p className="text-xs text-muted-foreground">
                      JPEG, PNG, WebP, or AVIF up to{" "}
                      {storageConfig
                        ? Math.round(storageConfig.maxImageSize / (1024 * 1024))
                        : 2}
                      MB
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp,image/avif"
        onChange={handleFileInputChange}
        className="hidden"
        disabled={disabled}
      />

      {/* Status Messages */}
      {uploadState.error && (
        <Alert variant="destructive">
          <AlertDescription>{uploadState.error}</AlertDescription>
        </Alert>
      )}

      {uploadState.success && (
        <Alert>
          <AlertDescription>Image uploaded successfully!</AlertDescription>
        </Alert>
      )}

      {/* Hidden input for form submission */}
      <Input type="hidden" name="featuredImage" value={preview || ""} />
    </div>
  );
}
