import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  ServerSideEncryption,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Initialize S3 client with secure configuration
const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME!;
const CDN_URL =
  process.env.AWS_CLOUDFRONT_URL || `https://${BUCKET_NAME}.s3.amazonaws.com`;

/**
 * Generates a secure random filename with specified format and user ID
 * @param originalFilename - The original filename from the uploaded file
 * @param userId - User's Supabase ID (optional, for path prefixing)
 * @returns string - Random filename in format: {fileName}-{userPrefix}{randomId5chars}.webp
 */
export function generateImageFilename(originalFilename: string, userId?: string): string {
  // Extract filename without extension
  const lastDotIndex = originalFilename.lastIndexOf(".");
  const nameWithoutExt = lastDotIndex === -1 ? originalFilename : originalFilename.substring(0, lastDotIndex);
  
  // Sanitize filename: lowercase, replace spaces/special chars with dashes, limit length
  const sanitizedName =
    nameWithoutExt
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .substring(0, 30) || "untitled";

  // Generate 5 random alphanumeric characters
  const randomId = Array.from(
    { length: 5 },
    () => "0123456789abcdefghijklmnopqrstuvwxyz"[Math.floor(Math.random() * 36)]
  ).join("");

  // Include user ID prefix if provided (take first 8 chars for brevity)
  const userPrefix = userId ? userId.substring(0, 8) : "admin";

  return `${sanitizedName}-${userPrefix}${randomId}.webp`;
}

/**
 * Converts image buffer to WebP format
 * @param imageBuffer - Input image buffer
 * @param quality - WebP quality (1-100), defaults to 80
 * @returns Promise<Buffer> - WebP formatted image buffer
 */
export async function convertToWebp(imageBuffer: Buffer, quality: number = 80): Promise<Buffer> {
  const sharp = (await import("sharp")).default;

  return await sharp(imageBuffer)
    .webp({
      quality,  // Use passed quality instead of hardcoded 80
      effort: 6, // Higher effort for better compression
    })
    .toBuffer();
}

/**
 * Validates image file type and size
 * @param file - File to validate
 * @returns boolean - true if valid
 */
export function validateImageFile(file: File): {
  isValid: boolean;
  error?: string;
} {
  const maxSize = 2 * 1024 * 1024; // 2MB limit
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
    return {
      isValid: false,
      error: "File size too large. Maximum size is 2MB.",
    };
  }

  return { isValid: true };
}

/**
 * Uploads image to S3 with secure configuration
 * @param imageBuffer - Processed image buffer (WebP format)
 * @param filename - Generated filename
 * @returns Promise<string> - Public URL of uploaded image
 */
export async function uploadImageToS3(
  imageBuffer: Buffer,
  filename: string
): Promise<string> {
  const key = `images/${filename}`;

  const uploadParams = {
    Bucket: BUCKET_NAME,
    Key: key,
    Body: imageBuffer,
    ContentType: "image/webp",
    // Security headers
    ACL: "private" as const,
    ServerSideEncryption: ServerSideEncryption.AES256,
    CacheControl: "public, max-age=31536000", // Cache for 1 year
    // Prevent hotlinking and ensure proper content handling
    ContentDisposition: "inline",
  };

  try {
    await s3Client.send(new PutObjectCommand(uploadParams));

    if (!CDN_URL) {
      console.error(
        "CDN_URL environment variable not set – secure access would fail due to private ACL."
      );
      throw new Error(
        "Image uploaded with private ACL but CDN_URL is missing. Configure CloudFront (or similar) and set AWS_CLOUDFRONT_URL env var."
      );
    }

    // Return CloudFront URL (bucket objects are private)
    return `${CDN_URL}/${key}`;
  } catch (error) {
    console.error("Error uploading to S3:", error);
    throw new Error("Failed to upload image to storage");
  }
}

/**
 * Generates a presigned URL for secure file upload (alternative approach)
 * @param filename - Target filename
 * @param contentType - File content type
 * @returns Promise<string> - Presigned upload URL
 */
export async function generatePresignedUploadUrl(
  filename: string,
  contentType: string
): Promise<string> {
  const key = `images/${filename}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: contentType,
    ACL: "private" as const,
    ServerSideEncryption: ServerSideEncryption.AES256,
  });

  // URL expires in 5 minutes for security
  return await getSignedUrl(s3Client, command, { expiresIn: 300 });
}

/**
 * Complete image processing and upload pipeline
 * @param file - Input image file
 * @param userId - User's Supabase ID for path organization (optional)
 * @returns Promise<string> - Public URL of uploaded image
 */
export async function processAndUploadImage(
  file: File,
  userId?: string
): Promise<string> {
  // Validate input
  const validation = validateImageFile(file);
  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  try {
    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);

    // Convert to WebP format
    const webpBuffer = await convertToWebp(imageBuffer);

    // Generate secure filename with user ID
    const filename = generateImageFilename(file.name, userId);

    // Upload to S3
    const imageUrl = await uploadImageToS3(webpBuffer, filename);

    return imageUrl;
  } catch (error) {
    console.error("Error processing image:", error);
    throw new Error("Failed to process and upload image");
  }
}

/**
 * Deletes an image from S3
 * @param imageUrl - Full URL of the image to delete
 * @returns Promise<boolean> - true if deleted successfully
 */
export async function deleteImageFromS3(imageUrl: string): Promise<boolean> {
  try {
    // Extract the key from the URL
    const url = new URL(imageUrl);
    const key = url.pathname.startsWith("/")
      ? url.pathname.slice(1)
      : url.pathname;

    // Ensure the key starts with 'images/' for security
    if (!key.startsWith("images/")) {
      console.warn("Attempted to delete non-image file:", key);
      return false;
    }

    const deleteParams = {
      Bucket: BUCKET_NAME,
      Key: key,
    };

    await s3Client.send(new DeleteObjectCommand(deleteParams));
    console.log("Successfully deleted image:", key);
    return true;
  } catch (error) {
    console.error("Error deleting image from S3:", error);
    // Don't throw here - image deletion failure shouldn't break the main operation
    return false;
  }
}

/**
 * Extracts image filename from URL for comparison
 * @param imageUrl - Full URL of the image
 * @returns string - filename or empty string if invalid
 */
export function extractImageFilename(imageUrl: string): string {
  try {
    if (!imageUrl) return "";

    const url = new URL(imageUrl);
    const pathname = url.pathname;
    const filename = pathname.split("/").pop() || "";

    // Only return if it's a WebP file in the images directory
    if (pathname.includes("/images/") && filename.endsWith(".webp")) {
      return filename;
    }

    return "";
  } catch (error) {
    console.error("Error extracting filename from URL:", error);
    return "";
  }
}

/**
 * Generates a secure random filename with specified format for videos and user ID
 * @param originalFilename - The original filename from the uploaded file
 * @param userId - User's Supabase ID (optional, for path prefixing)
 * @returns string - Random filename in format: {fileName}-{userPrefix}{randomId5chars}.mp4
 */
export function generateVideoFilename(originalFilename: string, userId?: string): string {
  // Extract filename without extension
  const lastDotIndex = originalFilename.lastIndexOf(".");
  const nameWithoutExt = lastDotIndex === -1 ? originalFilename : originalFilename.substring(0, lastDotIndex);
  
  // Sanitize filename: lowercase, replace spaces/special chars with dashes, limit length
  const sanitizedName =
    nameWithoutExt
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .substring(0, 30) || "untitled";

  // Generate 5 random alphanumeric characters
  const randomId = Array.from(
    { length: 5 },
    () => "0123456789abcdefghijklmnopqrstuvwxyz"[Math.floor(Math.random() * 36)]
  ).join("");

  // Include user ID prefix if provided (take first 8 chars for brevity)
  const userPrefix = userId ? userId.substring(0, 8) : "admin";

  return `${sanitizedName}-${userPrefix}${randomId}.mp4`;
}

/**
 * Validates video file type and size
 * @param file - File to validate
 * @returns boolean - true if valid
 */
export function validateVideoFile(file: File): {
  isValid: boolean;
  error?: string;
} {
  const maxSize = 10 * 1024 * 1024; // 10MB limit for videos
  const allowedTypes = [
    "video/mp4",
    "video/webm",
    "video/quicktime",
    "video/x-msvideo", // .avi
  ];

  if (!allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error:
        "Invalid file type. Only MP4, WebM, QuickTime, and AVI videos are allowed.",
    };
  }

  if (file.size > maxSize) {
    return {
      isValid: false,
      error: "File size too large. Maximum size is 10MB.",
    };
  }

  return { isValid: true };
}

/**
 * Uploads video to S3 with secure configuration
 * @param videoBuffer - Video file buffer
 * @param filename - Generated filename
 * @returns Promise<string> - Public URL of uploaded video
 */
export async function uploadVideoToS3(
  videoBuffer: Buffer,
  filename: string
): Promise<string> {
  const key = `videos/${filename}`;

  const uploadParams = {
    Bucket: BUCKET_NAME,
    Key: key,
    Body: videoBuffer,
    ContentType: "video/mp4",
    // Security headers
    ACL: "private" as const,
    ServerSideEncryption: ServerSideEncryption.AES256,
    CacheControl: "public, max-age=31536000", // Cache for 1 year
    // Prevent hotlinking and ensure proper content handling
    ContentDisposition: "inline",
  };

  try {
    await s3Client.send(new PutObjectCommand(uploadParams));

    if (!CDN_URL) {
      console.error(
        "CDN_URL environment variable not set – secure access would fail due to private ACL."
      );
      throw new Error(
        "Video uploaded with private ACL but CDN_URL is missing. Configure CloudFront (or similar) and set AWS_CLOUDFRONT_URL env var."
      );
    }

    return `${CDN_URL}/${key}`;
  } catch (error) {
    console.error("Error uploading video to S3:", error);
    throw new Error("Failed to upload video to storage");
  }
}

/**
 * Complete video processing and upload pipeline
 * @param file - Input video file
 * @param userId - User's Supabase ID for path organization (optional)
 * @returns Promise<string> - Public URL of uploaded video
 */
export async function processAndUploadVideo(
  file: File,
  userId?: string
): Promise<string> {
  // Validate input
  const validation = validateVideoFile(file);
  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  try {
    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const videoBuffer = Buffer.from(arrayBuffer);

    // Generate secure filename with user ID
    const filename = generateVideoFilename(file.name, userId);

    // Upload to S3
    const videoUrl = await uploadVideoToS3(videoBuffer, filename);

    return videoUrl;
  } catch (error) {
    console.error("Error processing video:", error);
    throw new Error("Failed to process and upload video");
  }
}

/**
 * Deletes a video from S3
 * @param videoUrl - Full URL of the video to delete
 * @returns Promise<boolean> - true if deleted successfully
 */
export async function deleteVideoFromS3(videoUrl: string): Promise<boolean> {
  try {
    // Extract the key from the URL
    const url = new URL(videoUrl);
    const key = url.pathname.substring(1); // Remove leading slash

    const deleteParams = {
      Bucket: BUCKET_NAME,
      Key: key,
    };

    await s3Client.send(new DeleteObjectCommand(deleteParams));
    return true;
  } catch (error) {
    console.error("Error deleting video from S3:", error);
    return false;
  }
}
