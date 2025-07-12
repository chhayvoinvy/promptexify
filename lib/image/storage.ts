import fs from "fs/promises";
import path from "path";
import { getStorageConfigAction } from "@/actions/settings";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  ServerSideEncryption,
  ObjectCannedACL,
} from "@aws-sdk/client-s3";
import { StorageType } from "@/app/generated/prisma";
import {
  generateImageFilename,
  generateVideoFilename,
  convertToWebp,
  validateImageFile,
  validateVideoFile,
  extractImageFilename,
} from "./s3";

// Re-export existing S3 utilities for backward compatibility
export {
  generateImageFilename,
  generateVideoFilename,
  convertToWebp,
  validateImageFile,
  validateVideoFile,
  extractImageFilename,
};

// Storage configuration interface
export interface StorageConfig {
  storageType: "S3" | "LOCAL" | "DOSPACE";
  s3BucketName?: string | null;
  s3Region?: string | null;
  s3AccessKeyId?: string | null;
  s3SecretKey?: string | null;
  s3CloudfrontUrl?: string | null;
  doSpaceName?: string | null;
  doRegion?: string | null;
  doAccessKeyId?: string | null;
  doSecretKey?: string | null;
  doCdnUrl?: string | null;
  localBasePath?: string | null;
  localBaseUrl?: string | null;
  maxImageSize: number;
  maxVideoSize: number;
  enableCompression: boolean;
  compressionQuality: number;
}

// NEW: Result type for uploads
export interface UploadResult {
  url: string;
  filename: string;
  relativePath: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  width?: number;
  height?: number;
  duration?: number;
  storageType: StorageType;
  blurDataUrl?: string; // Base64 blur placeholder for images
  previewPath?: string; // Path to preview image
}

// Cache for storage config to avoid repeated database calls
let cachedStorageConfig: StorageConfig | null = null;
let configCacheExpiry: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Get storage configuration with caching
 */
export async function getStorageConfig(): Promise<StorageConfig> {
  const now = Date.now();

  // Return cached config if still valid
  if (cachedStorageConfig && now < configCacheExpiry) {
    return cachedStorageConfig;
  }

  try {
    const result = await getStorageConfigAction();
    if (result.success && result.data) {
      cachedStorageConfig = result.data;
      configCacheExpiry = now + CACHE_DURATION;
      return cachedStorageConfig;
    }
  } catch (error) {
    console.error("Failed to fetch storage config:", error);
  }

  // Fallback to environment variables (existing S3 config)
  const fallbackConfig: StorageConfig = {
    storageType: "S3",
    s3BucketName: process.env.AWS_S3_BUCKET_NAME,
    s3Region: process.env.AWS_REGION || "us-east-1",
    s3AccessKeyId: process.env.AWS_ACCESS_KEY_ID,
    s3SecretKey: process.env.AWS_SECRET_ACCESS_KEY,
    s3CloudfrontUrl: process.env.AWS_CLOUDFRONT_URL,
    doSpaceName: process.env.DO_SPACE_NAME,
    doRegion: process.env.DO_REGION,
    doAccessKeyId: process.env.DO_ACCESS_KEY_ID,
    doSecretKey: process.env.DO_SECRET_KEY,
    doCdnUrl: process.env.DO_CDN_URL,
    localBasePath: "/uploads",
    localBaseUrl: "/uploads",
    maxImageSize: 2097152, // 2MB
    maxVideoSize: 10485760, // 10MB
    enableCompression: true,
    compressionQuality: 80,
  };

  cachedStorageConfig = fallbackConfig;
  configCacheExpiry = now + CACHE_DURATION;
  return fallbackConfig;
}

/**
 * Validate storage configuration for consistency
 * @param config - Storage configuration to validate
 * @returns Validation result with any issues found
 */
export function validateStorageConfig(config: StorageConfig): {
  isValid: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  switch (config.storageType) {
    case "S3":
      if (!config.s3BucketName) {
        issues.push("S3 bucket name is required");
      }
      if (!config.s3AccessKeyId || !config.s3SecretKey) {
        issues.push("S3 access credentials are required");
      }
      if (!config.s3CloudfrontUrl) {
        issues.push("S3 CloudFront URL is recommended for secure access");
      }
      break;

    case "DOSPACE":
      if (!config.doSpaceName) {
        issues.push("DigitalOcean Space name is required");
      }
      if (!config.doRegion) {
        issues.push("DigitalOcean region is required");
      }
      if (!config.doAccessKeyId || !config.doSecretKey) {
        issues.push("DigitalOcean access credentials are required");
      }
      break;

    case "LOCAL":
      if (!config.localBasePath) {
        issues.push("Local base path is required");
      }
      if (!config.localBaseUrl) {
        issues.push("Local base URL is required");
      }
      break;

    default:
      issues.push(`Unknown storage type: ${config.storageType}`);
  }

  return {
    isValid: issues.length === 0,
    issues,
  };
}

/**
 * Clear storage config cache (useful when settings are updated)
 */
export function clearStorageConfigCache(): void {
  cachedStorageConfig = null;
  configCacheExpiry = 0;
}

/**
 * NEW: Get public URL from a relative path
 * This function constructs the full public URL for a media file
 * based on the current storage configuration.
 * @param relativePath - The relative path of the file (e.g., "images/file.jpg")
 * @returns The full public URL
 */
export async function getPublicUrl(
  relativePath: string | null | undefined
): Promise<string> {
  if (!relativePath) {
    return "";
  }

  // If the path is already a full URL, return it directly
  if (relativePath.startsWith("http")) {
    return relativePath;
  }

  const config = await getStorageConfig();

  switch (config.storageType) {
    case "S3":
      if (config.s3CloudfrontUrl) {
        return `${config.s3CloudfrontUrl.replace(/\/$/, "")}/${relativePath.replace(
          /^\//,
          ""
        )}`;
      }
      // Fallback to direct S3 URL if CloudFront is not configured
      return `https://${config.s3BucketName}.s3.${config.s3Region || "us-east-1"}.amazonaws.com/${relativePath}`;

    case "DOSPACE":
      if (config.doCdnUrl) {
        return `${config.doCdnUrl.replace(/\/$/, "")}/${relativePath.replace(
          /^\//,
          ""
        )}`;
      }
      // Fallback to direct DO Spaces URL
      return `https://${config.doSpaceName}.${config.doRegion}.digitaloceanspaces.com/${relativePath}`;

    case "LOCAL":
      return `${(config.localBaseUrl || "/uploads").replace(
        /\/$/,
        ""
      )}/${relativePath.replace(/^\//, "")}`;

    default:
      return "";
  }
}

// Local storage functions
/**
 * Ensure upload directory exists
 */
async function ensureUploadDirectory(basePath: string): Promise<void> {
  const fullPath = path.join(
    process.cwd(),
    "public",
    basePath.replace(/^\//, "")
  );

  try {
    await fs.access(fullPath);
  } catch {
    // Directory doesn't exist, create it
    await fs.mkdir(fullPath, { recursive: true });
  }
}

/**
 * Upload image to local storage
 */
export async function uploadImageToLocal(
  imageBuffer: Buffer,
  filename: string,
  basePath: string = "/uploads"
): Promise<string> {
  try {
    // Ensure directory exists
    await ensureUploadDirectory(basePath);

    // Full file path
    const filePath = path.join(
      process.cwd(),
      "public",
      basePath.replace(/^\//, ""),
      "images",
      filename
    );

    // Ensure images subdirectory exists
    await fs.mkdir(path.dirname(filePath), { recursive: true });

    // Write file
    await fs.writeFile(filePath, imageBuffer);

    // Return relative path instead of full URL for storage independence
    return `images/${filename}`;
  } catch (error) {
    console.error("Error uploading image to local storage:", error);
    throw new Error("Failed to upload image to local storage");
  }
}

/**
 * Upload video to local storage
 */
export async function uploadVideoToLocal(
  videoBuffer: Buffer,
  filename: string,
  basePath: string = "/uploads"
): Promise<string> {
  try {
    // Ensure directory exists
    await ensureUploadDirectory(basePath);

    // Full file path
    const filePath = path.join(
      process.cwd(),
      "public",
      basePath.replace(/^\//, ""),
      "videos",
      filename
    );

    // Ensure videos subdirectory exists
    await fs.mkdir(path.dirname(filePath), { recursive: true });

    // Write file
    await fs.writeFile(filePath, videoBuffer);

    // Return relative path instead of full URL for storage independence
    return `videos/${filename}`;
  } catch (error) {
    console.error("Error uploading video to local storage:", error);
    throw new Error("Failed to upload video to local storage");
  }
}

/**
 * Delete image from local storage
 */
export async function deleteImageFromLocal(imageUrl: string): Promise<boolean> {
  try {
    // Extract filename from URL
    const urlParts = imageUrl.split("/");
    const filename = urlParts[urlParts.length - 1];

    if (!filename || !filename.includes(".")) {
      console.warn("Invalid image URL for local deletion:", imageUrl);
      return false;
    }

    // Construct file path
    const filePath = path.join(
      process.cwd(),
      "public",
      imageUrl.replace(/^\//, "")
    );

    // Check if file exists before attempting deletion
    try {
      await fs.access(filePath);
    } catch {
      console.log(`File not found, skipping deletion: ${filePath}`);
      return true; // Consider this a success since the file is already gone
    }

    // Delete file
    await fs.unlink(filePath);
    console.log("Successfully deleted local image:", filename);
    return true;
  } catch (error) {
    console.error("Error deleting image from local storage:", error);
    return false;
  }
}

/**
 * Delete video from local storage
 */
export async function deleteVideoFromLocal(videoUrl: string): Promise<boolean> {
  try {
    // Extract filename from URL
    const urlParts = videoUrl.split("/");
    const filename = urlParts[urlParts.length - 1];

    if (!filename || !filename.includes(".")) {
      console.warn("Invalid video URL for local deletion:", videoUrl);
      return false;
    }

    // Construct file path
    const filePath = path.join(
      process.cwd(),
      "public",
      videoUrl.replace(/^\//, "")
    );

    // Check if file exists before attempting deletion
    try {
      await fs.access(filePath);
    } catch {
      console.log(`File not found, skipping deletion: ${filePath}`);
      return true; // Consider this a success since the file is already gone
    }

    // Delete file
    await fs.unlink(filePath);
    console.log("Successfully deleted local video:", filename);
    return true;
  } catch (error) {
    console.error("Error deleting video from local storage:", error);
    return false;
  }
}

// Add preview upload functions for different storage types
export async function uploadPreviewToS3WithConfig(
  previewBuffer: Buffer,
  previewFilename: string,
  config: StorageConfig
): Promise<string> {
  const s3Client = await createS3Client(config);
  if (!s3Client) {
    throw new Error("Failed to create S3 client");
  }

  const key = `preview/${previewFilename}`;

  const uploadParams = {
    Bucket: config.s3BucketName!,
    Key: key,
    Body: previewBuffer,
    ContentType: "image/webp",
    ACL: "private" as const,
    ServerSideEncryption: ServerSideEncryption.AES256,
    CacheControl: "public, max-age=31536000", // Cache for 1 year
    ContentDisposition: "inline",
  };

  try {
    await s3Client.send(new PutObjectCommand(uploadParams));

    if (!config.s3CloudfrontUrl) {
      throw new Error("S3 CloudFront URL is required for secure access");
    }

    return `${config.s3CloudfrontUrl}/${key}`;
  } catch (error) {
    console.error("Error uploading preview to S3:", error);
    throw new Error("Failed to upload preview to S3");
  }
}

export async function uploadPreviewToDOSpacesWithConfig(
  previewBuffer: Buffer,
  previewFilename: string,
  config: StorageConfig
): Promise<string> {
  const doClient = await createDOSpacesClient(config);
  if (!doClient) {
    throw new Error("Failed to create DigitalOcean Spaces client");
  }

  const key = `preview/${previewFilename}`;

  const uploadParams = {
    Bucket: config.doSpaceName!,
    Key: key,
    Body: previewBuffer,
    ContentType: "image/avif",
    ACL: ObjectCannedACL.public_read,
    CacheControl: "public, max-age=31536000",
    ContentDisposition: "inline",
  };

  try {
    await doClient.send(new PutObjectCommand(uploadParams));

    if (!config.doCdnUrl) {
      return `https://${config.doSpaceName}.${config.doRegion}.digitaloceanspaces.com/${key}`;
    }

    return `${config.doCdnUrl}/${key}`;
  } catch (error) {
    console.error("Error uploading preview to DigitalOcean Spaces:", error);
    throw new Error("Failed to upload preview to DigitalOcean Spaces");
  }
}

export async function uploadPreviewToLocal(
  previewBuffer: Buffer,
  previewFilename: string,
  basePath: string = "/uploads"
): Promise<string> {
  try {
    // Ensure base directory exists first
    await ensureUploadDirectory(basePath);

    // Full file path - follow same pattern as other local upload functions
    const filePath = path.join(
      process.cwd(),
      "public",
      basePath.replace(/^\//, ""),
      "preview",
      previewFilename
    );

    // Ensure preview subdirectory exists
    await fs.mkdir(path.dirname(filePath), { recursive: true });

    // Write file
    await fs.writeFile(filePath, previewBuffer);

    // Return relative path for consistency
    return `preview/${previewFilename}`;
  } catch (error) {
    console.error("Error uploading preview to local storage:", error);
    throw new Error("Failed to upload preview to local storage");
  }
}

// S3 storage functions (using existing logic)
async function createS3Client(config: StorageConfig): Promise<S3Client | null> {
  if (!config.s3AccessKeyId || !config.s3SecretKey || !config.s3BucketName) {
    console.error("S3 configuration incomplete");
    return null;
  }

  return new S3Client({
    region: config.s3Region || "us-east-1",
    credentials: {
      accessKeyId: config.s3AccessKeyId,
      secretAccessKey: config.s3SecretKey,
    },
  });
}

// DigitalOcean Spaces functions (S3-compatible)
async function createDOSpacesClient(
  config: StorageConfig
): Promise<S3Client | null> {
  if (
    !config.doAccessKeyId ||
    !config.doSecretKey ||
    !config.doSpaceName ||
    !config.doRegion
  ) {
    console.error("DigitalOcean Spaces configuration incomplete");
    return null;
  }

  return new S3Client({
    endpoint: `https://${config.doRegion}.digitaloceanspaces.com`,
    region: config.doRegion,
    credentials: {
      accessKeyId: config.doAccessKeyId,
      secretAccessKey: config.doSecretKey,
    },
    forcePathStyle: false, // Use virtual hosted-style requests
  });
}

/**
 * Upload image to S3 using configuration
 */
export async function uploadImageToS3WithConfig(
  imageBuffer: Buffer,
  filename: string,
  config: StorageConfig
): Promise<string> {
  const s3Client = await createS3Client(config);
  if (!s3Client) {
    throw new Error("Failed to create S3 client");
  }

  const key = `images/${filename}`;
  const uploadParams = {
    Bucket: config.s3BucketName!,
    Key: key,
    Body: imageBuffer,
    ContentType: "image/webp",
    ServerSideEncryption: ServerSideEncryption.AES256,
    CacheControl: "public, max-age=31536000",
    ContentDisposition: "inline",
  };

  try {
    await s3Client.send(new PutObjectCommand(uploadParams));

    // Return CDN URL if available, otherwise S3 URL
    const baseUrl =
      config.s3CloudfrontUrl ||
      `https://${config.s3BucketName}.s3.amazonaws.com`;
    return `${baseUrl}/${key}`;
  } catch (error) {
    console.error("Error uploading to S3:", error);
    throw new Error("Failed to upload image to S3");
  }
}

/**
 * Upload video to S3 using configuration
 */
export async function uploadVideoToS3WithConfig(
  videoBuffer: Buffer,
  filename: string,
  config: StorageConfig
): Promise<string> {
  const s3Client = await createS3Client(config);
  if (!s3Client) {
    throw new Error("Failed to create S3 client");
  }

  const key = `videos/${filename}`;
  const uploadParams = {
    Bucket: config.s3BucketName!,
    Key: key,
    Body: videoBuffer,
    ContentType: "video/mp4",
    ServerSideEncryption: ServerSideEncryption.AES256,
    CacheControl: "public, max-age=31536000",
    ContentDisposition: "inline",
  };

  try {
    await s3Client.send(new PutObjectCommand(uploadParams));

    // Return CDN URL if available, otherwise S3 URL
    const baseUrl =
      config.s3CloudfrontUrl ||
      `https://${config.s3BucketName}.s3.amazonaws.com`;
    return `${baseUrl}/${key}`;
  } catch (error) {
    console.error("Error uploading video to S3:", error);
    throw new Error("Failed to upload video to S3");
  }
}

/**
 * Delete image from S3 using configuration
 */
export async function deleteImageFromS3WithConfig(
  imageUrl: string,
  config: StorageConfig
): Promise<boolean> {
  const s3Client = await createS3Client(config);
  if (!s3Client) {
    return false;
  }

  try {
    const url = new URL(imageUrl);
    const key = url.pathname.startsWith("/")
      ? url.pathname.slice(1)
      : url.pathname;

    // Allow deletion of images from both images/ and preview/ directories
    if (!key.startsWith("images/") && !key.startsWith("preview/")) {
      console.warn("Attempted to delete file from unauthorized directory:", key);
      return false;
    }

    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: config.s3BucketName!,
        Key: key,
      })
    );

    console.log("Successfully deleted S3 file:", key);
    return true;
  } catch (error) {
    console.error("Error deleting file from S3:", error);
    return false;
  }
}

/**
 * Delete video from S3 using configuration
 */
export async function deleteVideoFromS3WithConfig(
  videoUrl: string,
  config: StorageConfig
): Promise<boolean> {
  const s3Client = await createS3Client(config);
  if (!s3Client) {
    return false;
  }

  try {
    const url = new URL(videoUrl);
    const key = url.pathname.startsWith("/")
      ? url.pathname.slice(1)
      : url.pathname;

    // Allow deletion of videos from both videos/ and preview/ directories (for thumbnails)
    if (!key.startsWith("videos/") && !key.startsWith("preview/")) {
      console.warn("Attempted to delete file from unauthorized directory:", key);
      return false;
    }

    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: config.s3BucketName!,
        Key: key,
      })
    );

    console.log("Successfully deleted S3 file:", key);
    return true;
  } catch (error) {
    console.error("Error deleting file from S3:", error);
    return false;
  }
}

/**
 * Upload image to DigitalOcean Spaces using configuration
 */
export async function uploadImageToDOSpacesWithConfig(
  imageBuffer: Buffer,
  filename: string,
  config: StorageConfig
): Promise<string> {
  const doClient = await createDOSpacesClient(config);
  if (!doClient) {
    throw new Error("Failed to create DigitalOcean Spaces client");
  }

  const key = `images/${filename}`;
  const uploadParams = {
    Bucket: config.doSpaceName!,
    Key: key,
    Body: imageBuffer,
    ContentType: "image/webp",
    CacheControl: "public, max-age=31536000",
    ContentDisposition: "inline",
    ACL: ObjectCannedACL.public_read, // DigitalOcean Spaces requires explicit ACL
  };

  try {
    await doClient.send(new PutObjectCommand(uploadParams));

    // Return CDN URL if available, otherwise Spaces URL
    const baseUrl =
      config.doCdnUrl ||
      `https://${config.doSpaceName}.${config.doRegion}.digitaloceanspaces.com`;
    return `${baseUrl}/${key}`;
  } catch (error) {
    console.error("Error uploading to DigitalOcean Spaces:", error);
    throw new Error("Failed to upload image to DigitalOcean Spaces");
  }
}

/**
 * Upload video to DigitalOcean Spaces using configuration
 */
export async function uploadVideoToDOSpacesWithConfig(
  videoBuffer: Buffer,
  filename: string,
  config: StorageConfig
): Promise<string> {
  const doClient = await createDOSpacesClient(config);
  if (!doClient) {
    throw new Error("Failed to create DigitalOcean Spaces client");
  }

  const key = `videos/${filename}`;
  const uploadParams = {
    Bucket: config.doSpaceName!,
    Key: key,
    Body: videoBuffer,
    ContentType: "video/mp4",
    CacheControl: "public, max-age=31536000",
    ContentDisposition: "inline",
    ACL: ObjectCannedACL.public_read, // DigitalOcean Spaces requires explicit ACL
  };

  try {
    await doClient.send(new PutObjectCommand(uploadParams));

    // Return CDN URL if available, otherwise Spaces URL
    const baseUrl =
      config.doCdnUrl ||
      `https://${config.doSpaceName}.${config.doRegion}.digitaloceanspaces.com`;
    return `${baseUrl}/${key}`;
  } catch (error) {
    console.error("Error uploading video to DigitalOcean Spaces:", error);
    throw new Error("Failed to upload video to DigitalOcean Spaces");
  }
}

/**
 * Delete image from DigitalOcean Spaces using configuration
 */
export async function deleteImageFromDOSpacesWithConfig(
  imageUrl: string,
  config: StorageConfig
): Promise<boolean> {
  const doClient = await createDOSpacesClient(config);
  if (!doClient) {
    return false;
  }

  try {
    const url = new URL(imageUrl);
    const key = url.pathname.startsWith("/")
      ? url.pathname.slice(1)
      : url.pathname;

    // Allow deletion of images from both images/ and preview/ directories
    if (!key.startsWith("images/") && !key.startsWith("preview/")) {
      console.warn("Attempted to delete file from unauthorized directory:", key);
      return false;
    }

    await doClient.send(
      new DeleteObjectCommand({
        Bucket: config.doSpaceName!,
        Key: key,
      })
    );

    console.log("Successfully deleted DigitalOcean Spaces file:", key);
    return true;
  } catch (error) {
    console.error("Error deleting file from DigitalOcean Spaces:", error);
    return false;
  }
}

/**
 * Delete video from DigitalOcean Spaces using configuration
 */
export async function deleteVideoFromDOSpacesWithConfig(
  videoUrl: string,
  config: StorageConfig
): Promise<boolean> {
  const doClient = await createDOSpacesClient(config);
  if (!doClient) {
    return false;
  }

  try {
    const url = new URL(videoUrl);
    const key = url.pathname.startsWith("/")
      ? url.pathname.slice(1)
      : url.pathname;

    // Allow deletion of videos from both videos/ and preview/ directories (for thumbnails)
    if (!key.startsWith("videos/") && !key.startsWith("preview/")) {
      console.warn("Attempted to delete file from unauthorized directory:", key);
      return false;
    }

    await doClient.send(
      new DeleteObjectCommand({
        Bucket: config.doSpaceName!,
        Key: key,
      })
    );

    console.log("Successfully deleted DigitalOcean Spaces file:", key);
    return true;
  } catch (error) {
    console.error("Error deleting file from DigitalOcean Spaces:", error);
    return false;
  }
}

// Unified storage interface
/**
 * Upload image using configured storage method
 * UPDATED: Returns relative path instead of full URL for storage independence
 */
export async function uploadImage(
  imageBuffer: Buffer,
  filename: string
): Promise<string> {
  const config = await getStorageConfig();

  // Upload to the configured storage provider
  if (config.storageType === "LOCAL") {
    await uploadImageToLocal(
      imageBuffer,
      filename,
      config.localBasePath || "/uploads"
    );
  } else if (config.storageType === "DOSPACE") {
    await uploadImageToDOSpacesWithConfig(imageBuffer, filename, config);
  } else {
    await uploadImageToS3WithConfig(imageBuffer, filename, config);
  }

  // Return relative path instead of full URL for storage independence
  return `images/${filename}`;
}

/**
 * Upload video using configured storage method
 * UPDATED: Returns relative path instead of full URL for storage independence
 */
export async function uploadVideo(
  videoBuffer: Buffer,
  filename: string
): Promise<string> {
  const config = await getStorageConfig();

  // Upload to the configured storage provider
  if (config.storageType === "LOCAL") {
    await uploadVideoToLocal(
      videoBuffer,
      filename,
      config.localBasePath || "/uploads"
    );
  } else if (config.storageType === "DOSPACE") {
    await uploadVideoToDOSpacesWithConfig(videoBuffer, filename, config);
  } else {
    await uploadVideoToS3WithConfig(videoBuffer, filename, config);
  }

  // Return relative path instead of full URL for storage independence
  return `videos/${filename}`;
}

/**
 * Delete image using configured storage method
 * Also deletes associated preview file if it exists
 */
export async function deleteImage(imageUrl: string): Promise<boolean> {
  const config = await getStorageConfig();

  // First, try to delete the main image file
  let mainFileDeleted = false;
  if (config.storageType === "LOCAL") {
    mainFileDeleted = await deleteImageFromLocal(imageUrl);
  } else if (config.storageType === "DOSPACE") {
    mainFileDeleted = await deleteImageFromDOSpacesWithConfig(imageUrl, config);
  } else {
    mainFileDeleted = await deleteImageFromS3WithConfig(imageUrl, config);
  }

  // If main file deletion succeeded, also try to delete the associated preview file
  if (mainFileDeleted) {
    try {
      // Extract filename from the main image URL to generate preview filename
      const urlParts = imageUrl.split("/");
      const mainFilename = urlParts[urlParts.length - 1];
      
      // Only attempt preview deletion for main image files (not already preview files)
      if (mainFilename && !mainFilename.startsWith("preview-")) {
        // Generate preview filename using the same logic as upload
        const { generatePreviewFilename } = await import("./preview");
        const previewFilename = generatePreviewFilename(mainFilename);
        
        // Construct preview URL based on storage type
        let previewUrl: string;
        if (config.storageType === "LOCAL") {
          // For local storage, replace the path segment
          previewUrl = imageUrl.replace(/\/images\/[^/]+$/, `/preview/${previewFilename}`);
        } else {
          // For cloud storage, replace the key in the URL
          previewUrl = imageUrl.replace(/\/images\/[^/]+$/, `/preview/${previewFilename}`);
        }
        
        // Attempt to delete preview file (don't fail if it doesn't exist)
        if (config.storageType === "LOCAL") {
          const previewDeleted = await deleteImageFromLocal(previewUrl);
          if (!previewDeleted) {
            console.log("Preview file not found or already deleted:", previewUrl);
          }
        } else if (config.storageType === "DOSPACE") {
          const previewDeleted = await deleteImageFromDOSpacesWithConfig(previewUrl, config);
          if (!previewDeleted) {
            console.log("Preview file not found or already deleted:", previewUrl);
          }
        } else {
          const previewDeleted = await deleteImageFromS3WithConfig(previewUrl, config);
          if (!previewDeleted) {
            console.log("Preview file not found or already deleted:", previewUrl);
          }
        }
        
        console.log("Attempted to delete associated preview file:", previewUrl);
      }
    } catch (error) {
      console.warn("Failed to delete associated preview file:", error);
      // Don't fail the main operation if preview deletion fails
    }
  }

  return mainFileDeleted;
}

/**
 * Delete video using configured storage method
 * Also deletes associated preview file (thumbnail) if it exists
 */
export async function deleteVideo(videoUrl: string): Promise<boolean> {
  const config = await getStorageConfig();

  // First, try to delete the main video file
  let mainFileDeleted = false;
  if (config.storageType === "LOCAL") {
    mainFileDeleted = await deleteVideoFromLocal(videoUrl);
  } else if (config.storageType === "DOSPACE") {
    mainFileDeleted = await deleteVideoFromDOSpacesWithConfig(videoUrl, config);
  } else {
    mainFileDeleted = await deleteVideoFromS3WithConfig(videoUrl, config);
  }

  // If main file deletion succeeded, also try to delete the associated preview file (thumbnail)
  if (mainFileDeleted) {
    try {
      // Extract filename from the main video URL to generate preview filename
      const urlParts = videoUrl.split("/");
      const mainFilename = urlParts[urlParts.length - 1];
      
      // Only attempt preview deletion for main video files (not already preview files)
      if (mainFilename && !mainFilename.startsWith("preview-")) {
        // Generate preview filename using the same logic as upload
        const { generatePreviewFilename } = await import("./preview");
        const previewFilename = generatePreviewFilename(mainFilename);
        
        // Construct preview URL based on storage type
        let previewUrl: string;
        if (config.storageType === "LOCAL") {
          // For local storage, replace the path segment
          previewUrl = videoUrl.replace(/\/videos\/[^/]+$/, `/preview/${previewFilename}`);
        } else {
          // For cloud storage, replace the key in the URL
          previewUrl = videoUrl.replace(/\/videos\/[^/]+$/, `/preview/${previewFilename}`);
        }
        
        // Attempt to delete preview file (don't fail if it doesn't exist)
        // Note: We use image deletion functions since video previews are images
        if (config.storageType === "LOCAL") {
          const previewDeleted = await deleteImageFromLocal(previewUrl);
          if (!previewDeleted) {
            console.log("Preview file not found or already deleted:", previewUrl);
          }
        } else if (config.storageType === "DOSPACE") {
          const previewDeleted = await deleteImageFromDOSpacesWithConfig(previewUrl, config);
          if (!previewDeleted) {
            console.log("Preview file not found or already deleted:", previewUrl);
          }
        } else {
          const previewDeleted = await deleteImageFromS3WithConfig(previewUrl, config);
          if (!previewDeleted) {
            console.log("Preview file not found or already deleted:", previewUrl);
          }
        }
        
        console.log("Attempted to delete associated preview file:", previewUrl);
      }
    } catch (error) {
      console.warn("Failed to delete associated preview file:", error);
      // Don't fail the main operation if preview deletion fails
    }
  }

  return mainFileDeleted;
}

/**
 * Complete image processing and upload pipeline
 */
export async function processAndUploadImageWithConfig(
  file: File,
  userId?: string
): Promise<UploadResult> {
  // Get storage configuration
  const config = await getStorageConfig();
  const { storageType } = config;

  // Import functions dynamically to avoid circular dependencies
  const { convertToWebp, generateImageFilename } = await import("./s3");
  const { generateOptimizedBlurPlaceholder } = await import("./blur");
  const { generateImagePreview, generatePreviewFilename } = await import("./preview");

  // Generate filename
  const filename = generateImageFilename(file.name, userId);
  const relativePath = `images/${filename}`;

  // Process the image
  const sharp = (await import("sharp")).default;
  const buffer: Buffer = Buffer.from(new Uint8Array(await file.arrayBuffer()));
  let imageBuffer: Buffer = buffer;
  let finalMimeType = file.type;

  const image = sharp(buffer);
  const metadata = await image.metadata();
  const { width, height } = metadata;

  // Generate blur placeholder from original buffer (before compression)
  let blurDataUrl: string | undefined;
  try {
    blurDataUrl = await generateOptimizedBlurPlaceholder(buffer, file.type);
  } catch (error) {
    console.error("Failed to generate blur placeholder:", error);
  }

  // Generate preview image
  let previewPath: string | undefined;
  try {
    const previewBuffer = await generateImagePreview(buffer, {
      maxWidth: 1280,
      maxHeight: 720,
      quality: 80,
      format: "webp",
    });

    const previewFilename = generatePreviewFilename(filename);
    previewPath = `preview/${previewFilename}`;

    // Upload preview based on storage type
    switch (storageType) {
      case "S3":
        await uploadPreviewToS3WithConfig(
          previewBuffer,
          previewFilename,
          config
        );
        break;
      case "DOSPACE":
        await uploadPreviewToDOSpacesWithConfig(
          previewBuffer,
          previewFilename,
          config
        );
        break;
      case "LOCAL": {
        const uploadedPreviewPath = await uploadPreviewToLocal(
          previewBuffer,
          previewFilename,
          config.localBasePath || "/uploads"
        );
        previewPath = uploadedPreviewPath;
        break;
      }
    }
  } catch (error) {
    console.error("Failed to generate and upload preview:", error);
    // Continue without preview - it's not critical
  }

  // Convert to WebP if enabled and not already WebP
  if (config.enableCompression && file.type !== "image/webp") {
    imageBuffer = await convertToWebp(buffer);
    finalMimeType = "image/webp";
  }

  let uploadedPath: string;

  // Upload original image based on storage type
  switch (storageType) {
    case "S3": {
      uploadedPath = await uploadImageToS3WithConfig(
        imageBuffer,
        filename,
        config
      );
      break;
    }
    case "DOSPACE": {
      uploadedPath = await uploadImageToDOSpacesWithConfig(
        imageBuffer,
        filename,
        config
      );
      break;
    }
    case "LOCAL": {
      uploadedPath = await uploadImageToLocal(
        imageBuffer,
        filename,
        config.localBasePath || "/uploads"
      );
      break;
    }
    default:
      throw new Error(`Unsupported storage type: ${storageType}`);
  }

  // For local storage, uploadedPath is already a relative path
  // For S3/DOSPACE, uploadedPath is a full URL
  const publicUrl = storageType === "LOCAL" 
    ? await getPublicUrl(uploadedPath)
    : uploadedPath;

  return {
    url: publicUrl,
    filename,
    relativePath: storageType === "LOCAL" ? uploadedPath : relativePath,
    originalName: file.name,
    mimeType: finalMimeType,
    fileSize: imageBuffer.length,
    width,
    height,
    storageType: storageType as StorageType,
    blurDataUrl,
    previewPath,
  };
}

/**
 * Complete video processing and upload pipeline
 */
export async function processAndUploadVideoWithConfig(
  file: File,
  userId?: string
): Promise<UploadResult> {
  // Get storage configuration
  const config = await getStorageConfig();
  const { storageType } = config;

  // Import functions dynamically to avoid circular dependencies
  const { generateVideoFilename } = await import("./s3");
  const { generateVideoThumbnail, generatePreviewFilename, extractVideoMetadata } = await import("./preview");

  // Generate filename
  const filename = generateVideoFilename(file.name, userId);
  const relativePath = `videos/${filename}`;
  const videoBuffer = Buffer.from(new Uint8Array(await file.arrayBuffer()));

  // Extract video metadata
  let videoMetadata: { width?: number; height?: number; duration?: number } = {};
  try {
    const metadata = await extractVideoMetadata(videoBuffer);
    videoMetadata = {
      width: metadata.width,
      height: metadata.height,
      duration: metadata.duration,
    };
  } catch (error) {
    console.error("Failed to extract video metadata:", error);
    // Continue without metadata - it's not critical
  }

  // Generate video thumbnail
  let previewPath: string | undefined;
  let blurDataUrl: string | undefined;
  
  try {
    const thumbnailBuffer = await generateVideoThumbnail(videoBuffer, {
      time: "00:00:01",
      width: 1280,
      height: 720,
      quality: 80,
    });

    const previewFilename = generatePreviewFilename(filename);
    previewPath = `preview/${previewFilename}`;

    // Upload thumbnail based on storage type
    switch (storageType) {
      case "S3": {
        await uploadPreviewToS3WithConfig(
          thumbnailBuffer,
          previewFilename,
          config
        );
        break;
      }
      case "DOSPACE": {
        await uploadPreviewToDOSpacesWithConfig(
          thumbnailBuffer,
          previewFilename,
          config
        );
        break;
      }
      case "LOCAL": {
        const uploadedPreviewPath = await uploadPreviewToLocal(
          thumbnailBuffer,
          previewFilename,
          config.localBasePath || "/uploads"
        );
        previewPath = uploadedPreviewPath;
        break;
      }
    }

    // Generate blur placeholder from thumbnail
    try {
      const { generateOptimizedBlurPlaceholder } = await import("./blur");
      blurDataUrl = await generateOptimizedBlurPlaceholder(thumbnailBuffer, "image/webp");
    } catch (error) {
      console.error("Failed to generate blur placeholder for video thumbnail:", error);
    }
  } catch (error) {
    console.error("Failed to generate and upload video thumbnail:", error);
    // Continue without thumbnail - it's not critical
  }

  let uploadedPath: string;

  // Upload original video based on storage type
  switch (storageType) {
    case "S3": {
      uploadedPath = await uploadVideoToS3WithConfig(
        videoBuffer,
        filename,
        config
      );
      break;
    }
    case "DOSPACE": {
      uploadedPath = await uploadVideoToDOSpacesWithConfig(
        videoBuffer,
        filename,
        config
      );
      break;
    }
    case "LOCAL": {
      uploadedPath = await uploadVideoToLocal(
        videoBuffer,
        filename,
        config.localBasePath || "/uploads"
      );
      break;
    }
    default:
      throw new Error(`Unsupported storage type: ${storageType}`);
  }

  // For local storage, uploadedPath is already a relative path
  // For S3/DOSPACE, uploadedPath is a full URL
  const publicUrl = storageType === "LOCAL" 
    ? await getPublicUrl(uploadedPath)
    : uploadedPath;

  return {
    url: publicUrl,
    filename,
    relativePath: storageType === "LOCAL" ? uploadedPath : relativePath,
    originalName: file.name,
    mimeType: file.type,
    fileSize: file.size,
    width: videoMetadata.width,
    height: videoMetadata.height,
    duration: videoMetadata.duration,
    storageType: storageType as StorageType,
    previewPath,
    blurDataUrl,
  };
}

/**
 * Test storage configuration and URL generation for all storage types
 * This function helps verify that the storage system works correctly
 * @returns Test results for each storage type
 */
export async function testStorageConfiguration(): Promise<{
  [key: string]: {
    isValid: boolean;
    testUrl: string;
    issues: string[];
  };
}> {
  const testPath = "images/test-image.webp";
  const results: { [key: string]: {
    isValid: boolean;
    testUrl: string;
    issues: string[];
    storageType?: StorageConfig["storageType"];
  } } = {};

  // Test current configuration
  const currentConfig = await getStorageConfig();
  const validation = validateStorageConfig(currentConfig);
  
  results.current = {
    isValid: validation.isValid,
    testUrl: await getPublicUrl(testPath),
    issues: validation.issues,
    storageType: currentConfig.storageType,
  };

  // Test S3 configuration
  const s3Config: StorageConfig = {
    ...currentConfig,
    storageType: "S3",
    s3BucketName: "test-bucket",
    s3Region: "us-east-1",
    s3CloudfrontUrl: "https://cdn.example.com",
  };
  
  results.s3 = {
    isValid: validateStorageConfig(s3Config).isValid,
    testUrl: constructFullUrl(testPath, s3Config),
    issues: validateStorageConfig(s3Config).issues,
  };

  // Test DigitalOcean Spaces configuration
  const doConfig: StorageConfig = {
    ...currentConfig,
    storageType: "DOSPACE",
    doSpaceName: "test-space",
    doRegion: "nyc3",
    doCdnUrl: "https://cdn.digitalocean.com",
  };
  
  results.dospace = {
    isValid: validateStorageConfig(doConfig).isValid,
    testUrl: constructFullUrl(testPath, doConfig),
    issues: validateStorageConfig(doConfig).issues,
  };

  // Test Local configuration
  const localConfig: StorageConfig = {
    ...currentConfig,
    storageType: "LOCAL",
    localBasePath: "/uploads",
    localBaseUrl: "/uploads",
  };
  
  results.local = {
    isValid: validateStorageConfig(localConfig).isValid,
    testUrl: constructFullUrl(testPath, localConfig),
    issues: validateStorageConfig(localConfig).issues,
  };

  return results;
}

// Helper function for URL construction (used by test function)
function constructFullUrl(relativePath: string, config: StorageConfig): string {
  const cleanPath = relativePath.startsWith("/") ? relativePath.slice(1) : relativePath;
  
  switch (config.storageType) {
    case "S3":
      if (config.s3CloudfrontUrl) {
        return `${config.s3CloudfrontUrl.replace(/\/$/, "")}/${cleanPath}`;
      }
      return `https://${config.s3BucketName}.s3.${config.s3Region || "us-east-1"}.amazonaws.com/${cleanPath}`;
      
    case "DOSPACE":
      if (config.doCdnUrl) {
        return `${config.doCdnUrl.replace(/\/$/, "")}/${cleanPath}`;
      }
      return `https://${config.doSpaceName}.${config.doRegion}.digitaloceanspaces.com/${cleanPath}`;
      
    case "LOCAL":
      return `${(config.localBaseUrl || "/uploads").replace(/\/$/, "")}/${cleanPath}`;
      
    default:
      return `/${cleanPath}`;
  }
}

/**
 * Delete multiple media files associated with a post
 * @param mediaRecords - Array of media records with relativePath and mimeType
 * @returns Promise with deletion results
 */
export async function deletePostMedia(
  mediaRecords: Array<{
    relativePath: string;
    mimeType: string;
  }>
): Promise<{
  successCount: number;
  failureCount: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let successCount = 0;
  let failureCount = 0;

  for (const media of mediaRecords) {
    try {
      const fullUrl = await getPublicUrl(media.relativePath);
      let deleteResult = false;

      if (media.mimeType.startsWith("image/")) {
        deleteResult = await deleteImage(fullUrl);
      } else if (media.mimeType.startsWith("video/")) {
        deleteResult = await deleteVideo(fullUrl);
      } else {
        errors.push(`Unsupported media type: ${media.mimeType} for ${media.relativePath}`);
        failureCount++;
        continue;
      }

      if (deleteResult) {
        successCount++;
      } else {
        failureCount++;
        errors.push(`Failed to delete ${media.relativePath}`);
      }
    } catch (error) {
      failureCount++;
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      errors.push(`Error deleting ${media.relativePath}: ${errorMessage}`);
    }
  }

  return { successCount, failureCount, errors };
}

/**
 * Clean up orphaned media files that are not associated with any post
 * This function should be run periodically as a maintenance task
 * @param dryRun - If true, only returns what would be deleted without actually deleting
 * @returns Promise with cleanup results
 */
export async function cleanupOrphanedMedia(dryRun: boolean = true): Promise<{
  orphanedCount: number;
  deletedCount: number;
  errors: string[];
  orphanedFiles: Array<{
    id: string;
    relativePath: string;
    mimeType: string;
    uploadedBy: string;
    createdAt: Date;
  }>;
}> {
  const { prisma } = await import("@/lib/prisma");
  const errors: string[] = [];
  let deletedCount = 0;

  // Find media records that are not associated with any post
  // and are older than 24 hours (to avoid deleting recently uploaded files)
  const orphanedMedia = await prisma.media.findMany({
    where: {
      postId: null,
      createdAt: {
        lt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
      },
    },
    select: {
      id: true,
      relativePath: true,
      mimeType: true,
      uploadedBy: true,
      createdAt: true,
    },
  });

  if (dryRun) {
    return {
      orphanedCount: orphanedMedia.length,
      deletedCount: 0,
      errors: [],
      orphanedFiles: orphanedMedia,
    };
  }

  // Delete orphaned files from storage and database
  for (const media of orphanedMedia) {
    try {
      const fullUrl = await getPublicUrl(media.relativePath);
      let deleteResult = false;

      if (media.mimeType.startsWith("image/")) {
        deleteResult = await deleteImage(fullUrl);
      } else if (media.mimeType.startsWith("video/")) {
        deleteResult = await deleteVideo(fullUrl);
      }

      if (deleteResult) {
        // Delete from database only if file deletion succeeded
        await prisma.media.delete({
          where: { id: media.id },
        });
        deletedCount++;
      } else {
        errors.push(`Failed to delete file: ${media.relativePath}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      errors.push(`Error processing ${media.relativePath}: ${errorMessage}`);
    }
  }

  return {
    orphanedCount: orphanedMedia.length,
    deletedCount,
    errors,
    orphanedFiles: orphanedMedia,
  };
}
