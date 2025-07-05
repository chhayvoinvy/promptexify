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

// Re-export existing S3 utilities for backward compatibility
export {
  generateImageFilename,
  generateVideoFilename,
  convertToAvif,
  validateImageFile,
  validateVideoFile,
  extractImageFilename,
} from "./s3";

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
 * Clear storage config cache (useful when settings are updated)
 */
export function clearStorageConfigCache(): void {
  cachedStorageConfig = null;
  configCacheExpiry = 0;
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

    // Return public URL
    return `${basePath}/images/${filename}`;
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

    // Return public URL
    return `${basePath}/videos/${filename}`;
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

    // Delete file
    await fs.unlink(filePath);
    console.log("Successfully deleted local video:", filename);
    return true;
  } catch (error) {
    console.error("Error deleting video from local storage:", error);
    return false;
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
    ContentType: "image/avif",
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

    if (!key.startsWith("images/")) {
      console.warn("Attempted to delete non-image file:", key);
      return false;
    }

    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: config.s3BucketName!,
        Key: key,
      })
    );

    console.log("Successfully deleted S3 image:", key);
    return true;
  } catch (error) {
    console.error("Error deleting image from S3:", error);
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

    if (!key.startsWith("videos/")) {
      console.warn("Attempted to delete non-video file:", key);
      return false;
    }

    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: config.s3BucketName!,
        Key: key,
      })
    );

    console.log("Successfully deleted S3 video:", key);
    return true;
  } catch (error) {
    console.error("Error deleting video from S3:", error);
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
    ContentType: "image/avif",
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

    if (!key.startsWith("images/")) {
      console.warn("Attempted to delete non-image file:", key);
      return false;
    }

    await doClient.send(
      new DeleteObjectCommand({
        Bucket: config.doSpaceName!,
        Key: key,
      })
    );

    console.log("Successfully deleted DigitalOcean Spaces image:", key);
    return true;
  } catch (error) {
    console.error("Error deleting image from DigitalOcean Spaces:", error);
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

    if (!key.startsWith("videos/")) {
      console.warn("Attempted to delete non-video file:", key);
      return false;
    }

    await doClient.send(
      new DeleteObjectCommand({
        Bucket: config.doSpaceName!,
        Key: key,
      })
    );

    console.log("Successfully deleted DigitalOcean Spaces video:", key);
    return true;
  } catch (error) {
    console.error("Error deleting video from DigitalOcean Spaces:", error);
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
 */
export async function deleteImage(imageUrl: string): Promise<boolean> {
  const config = await getStorageConfig();

  if (config.storageType === "LOCAL") {
    return deleteImageFromLocal(imageUrl);
  } else if (config.storageType === "DOSPACE") {
    return deleteImageFromDOSpacesWithConfig(imageUrl, config);
  } else {
    return deleteImageFromS3WithConfig(imageUrl, config);
  }
}

/**
 * Delete video using configured storage method
 */
export async function deleteVideo(videoUrl: string): Promise<boolean> {
  const config = await getStorageConfig();

  if (config.storageType === "LOCAL") {
    return deleteVideoFromLocal(videoUrl);
  } else if (config.storageType === "DOSPACE") {
    return deleteVideoFromDOSpacesWithConfig(videoUrl, config);
  } else {
    return deleteVideoFromS3WithConfig(videoUrl, config);
  }
}

/**
 * Complete image processing and upload pipeline
 */
export async function processAndUploadImageWithConfig(
  file: File,
  title: string,
  userId?: string
): Promise<string> {
  const config = await getStorageConfig();

  // Import functions dynamically to avoid circular dependencies
  const { validateImageFile, convertToAvif, generateImageFilename } =
    await import("./s3");

  // Validate input
  const validation = validateImageFile(file);
  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  // Check file size against configuration
  if (file.size > config.maxImageSize) {
    throw new Error(
      `File size too large. Maximum size is ${Math.round(
        config.maxImageSize / (1024 * 1024)
      )}MB`
    );
  }

  try {
    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);

    // Convert to AVIF format if compression is enabled
    const processedBuffer = config.enableCompression
      ? await convertToAvif(imageBuffer)
      : imageBuffer;

    // Generate secure filename
    const filename = generateImageFilename(title, userId);

    // Upload using configured storage
    return await uploadImage(processedBuffer, filename);
  } catch (error) {
    console.error("Error processing image:", error);
    throw new Error("Failed to process and upload image");
  }
}

/**
 * Complete video processing and upload pipeline
 */
export async function processAndUploadVideoWithConfig(
  file: File,
  title: string,
  userId?: string
): Promise<string> {
  const config = await getStorageConfig();

  // Import functions dynamically to avoid circular dependencies
  const { validateVideoFile, generateVideoFilename } = await import("./s3");

  // Validate input
  const validation = validateVideoFile(file);
  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  // Check file size against configuration
  if (file.size > config.maxVideoSize) {
    throw new Error(
      `File size too large. Maximum size is ${Math.round(
        config.maxVideoSize / (1024 * 1024)
      )}MB`
    );
  }

  try {
    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const videoBuffer = Buffer.from(arrayBuffer);

    // Generate secure filename
    const filename = generateVideoFilename(title, userId);

    // Upload using configured storage
    return await uploadVideo(videoBuffer, filename);
  } catch (error) {
    console.error("Error processing video:", error);
    throw new Error("Failed to process and upload video");
  }
}
