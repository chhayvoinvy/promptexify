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
 * Generates a secure random filename with specified format
 * @param title - The title to use in filename (will be slugified)
 * @returns string - Random filename in format: image-title-sample-XXXXXXXX.avif
 */
export function generateImageFilename(title: string): string {
  // Slugify title: lowercase, replace spaces/special chars with dashes, limit length
  const slugTitle =
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .substring(0, 30) || "untitled";

  // Generate 8 random alphanumeric characters
  const randomId = Array.from(
    { length: 8 },
    () => "0123456789abcdefghijklmnopqrstuvwxyz"[Math.floor(Math.random() * 36)]
  ).join("");

  return `image-${slugTitle}-${randomId}.avif`;
}

/**
 * Converts image buffer to AVIF format
 * @param imageBuffer - Input image buffer
 * @returns Promise<Buffer> - AVIF formatted image buffer
 */
export async function convertToAvif(imageBuffer: Buffer): Promise<Buffer> {
  const sharp = (await import("sharp")).default;

  return await sharp(imageBuffer)
    .avif({
      quality: 80,
      effort: 4, // Higher effort for better compression
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
  const maxSize = 10 * 1024 * 1024; // 10MB limit
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
      error: "File size too large. Maximum size is 10MB.",
    };
  }

  return { isValid: true };
}

/**
 * Uploads image to S3 with secure configuration
 * @param imageBuffer - Processed image buffer (AVIF format)
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
    ContentType: "image/avif",
    // Security headers
    ServerSideEncryption: ServerSideEncryption.AES256,
    CacheControl: "public, max-age=31536000", // Cache for 1 year
    // Prevent hotlinking and ensure proper content handling
    ContentDisposition: "inline",
  };

  try {
    await s3Client.send(new PutObjectCommand(uploadParams));

    // Return CDN URL if available, otherwise S3 URL
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
    ServerSideEncryption: ServerSideEncryption.AES256,
  });

  // URL expires in 5 minutes for security
  return await getSignedUrl(s3Client, command, { expiresIn: 300 });
}

/**
 * Complete image processing and upload pipeline
 * @param file - Input image file
 * @param title - Title for filename generation
 * @returns Promise<string> - Public URL of uploaded image
 */
export async function processAndUploadImage(
  file: File,
  title: string
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

    // Convert to AVIF format
    const avifBuffer = await convertToAvif(imageBuffer);

    // Generate secure filename
    const filename = generateImageFilename(title);

    // Upload to S3
    const imageUrl = await uploadImageToS3(avifBuffer, filename);

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

    // Only return if it's an AVIF file in the images directory
    if (pathname.includes("/images/") && filename.endsWith(".avif")) {
      return filename;
    }

    return "";
  } catch (error) {
    console.error("Error extracting filename from URL:", error);
    return "";
  }
}
