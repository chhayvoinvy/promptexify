import sharp from "sharp";

/**
 * Blur Placeholder Generation Service
 * Creates tiny, blurred, base64-encoded images for LQIP (Low Quality Image Placeholders)
 * Similar to Unsplash's blur-up technique
 */

interface BlurOptions {
  width?: number;
  height?: number;
  quality?: number;
  blur?: number;
  format?: "jpeg" | "webp";
  enableCompression?: boolean;  // New parameter to control compression
}

/**
 * Generate a base64 blur placeholder from an image buffer
 * @param imageBuffer - The source image buffer
 * @param options - Configuration options for blur generation
 * @returns Promise<string> - Base64 data URL (e.g., "data:image/jpeg;base64,...")
 */
export async function generateBlurPlaceholder(
  imageBuffer: Buffer,
  options: BlurOptions = {}
): Promise<string> {
  const {
    width = 10,
    height = 10,
    quality = 20,
    blur = 3,
    format = "webp",  // Default to webp for better compression
    enableCompression = true,  // Default to true for backward compatibility
  } = options;

  try {
    // Input validation
    if (!imageBuffer || imageBuffer.length === 0) {
      throw new Error("Invalid image buffer provided");
    }

    // Calculate blur quality (20-30% of dashboard setting if compression is enabled)
    const blurQuality = enableCompression ? Math.round(Math.max(20, Math.min(30, quality * 0.25))) : 100;

    // Create a tiny, blurred version of the image
    const tinyBuffer = await sharp(imageBuffer)
      .resize(width, height, {
        fit: "inside", // Maintain aspect ratio without cropping
        position: "center",
        withoutEnlargement: true, // Don't upscale small images
      })
      .blur(blur)
      .modulate({
        brightness: 1,
        saturation: 1.2, // Slightly increase saturation for better visual effect
      })[format]({
        quality: blurQuality,
        ...(format === "jpeg" && { progressive: true }),
        ...(format === "webp" && { effort: 6 }),
      })
      .toBuffer();

    // Convert to base64 data URL
    const base64 = tinyBuffer.toString("base64");
    const mimeType = format === "jpeg" ? "image/jpeg" : "image/webp";
    
    return `data:${mimeType};base64,${base64}`;
  } catch (error) {
    console.error("Error generating blur placeholder:", error);
    throw new Error("Failed to generate blur placeholder");
  }
}

/**
 * Generate a blur placeholder optimized for different image types
 * 
 * IMPORTANT: This function preserves the original image aspect ratio to prevent
 * layout mismatch between blur placeholders and actual images. The blur dimensions
 * are calculated proportionally to maintain the same visual proportions as the
 * final rendered image.
 * 
 * @param imageBuffer - The source image buffer  
 * @param originalMimeType - The original image MIME type
 * @param compressionOptions - Optional compression settings
 * @returns Promise<string> - Base64 data URL
 */
export async function generateOptimizedBlurPlaceholder(
  imageBuffer: Buffer,
  originalMimeType?: string,
  compressionOptions?: {
    enableCompression?: boolean;
    quality?: number;
  }
): Promise<string> {
  // Get original image metadata to preserve aspect ratio
  const sharp = (await import("sharp")).default;
  const metadata = await sharp(imageBuffer).metadata();
  const { width: originalWidth, height: originalHeight } = metadata;

  if (!originalWidth || !originalHeight) {
    throw new Error("Unable to determine image dimensions for blur generation");
  }

  // Calculate blur dimensions while preserving aspect ratio
  const maxBlurSize = 16; // Maximum dimension for blur placeholder
  const aspectRatio = originalWidth / originalHeight;
  
  let blurWidth: number;
  let blurHeight: number;
  
  if (aspectRatio > 1) {
    // Landscape: limit width, calculate height
    blurWidth = maxBlurSize;
    blurHeight = Math.round(maxBlurSize / aspectRatio);
  } else {
    // Portrait or square: limit height, calculate width
    blurHeight = maxBlurSize;
    blurWidth = Math.round(maxBlurSize * aspectRatio);
  }

  // Ensure minimum dimensions
  blurWidth = Math.max(blurWidth, 4);
  blurHeight = Math.max(blurHeight, 4);

  // Debug: Log blur generation info
  console.log(`Blur generation: Original ${originalWidth}x${originalHeight} (ratio: ${aspectRatio.toFixed(3)}) → Blur ${blurWidth}x${blurHeight} (ratio: ${(blurWidth/blurHeight).toFixed(3)})`);

  // Choose optimal settings based on original image type
  const isPhoto = originalMimeType?.includes("jpeg") || originalMimeType?.includes("jpg");
  
  const options: BlurOptions = {
    width: blurWidth,
    height: blurHeight,
    quality: compressionOptions?.quality ? Math.round(compressionOptions.quality) : (isPhoto ? 25 : 15),
    blur: isPhoto ? 2.5 : 3,
    format: "webp", // WebP for better compression
    enableCompression: compressionOptions?.enableCompression ?? true,
  };

  return generateBlurPlaceholder(imageBuffer, options);
}

/**
 * Generate multiple blur placeholder variants
 * Useful for A/B testing or different use cases
 * @param imageBuffer - The source image buffer
 * @returns Promise<Record<string, string>> - Object with different blur variants
 */
export async function generateBlurVariants(
  imageBuffer: Buffer
): Promise<Record<string, string>> {
  const variants = await Promise.all([
    generateBlurPlaceholder(imageBuffer, { 
      width: 8, height: 8, quality: 15, blur: 3 
    }),
    generateBlurPlaceholder(imageBuffer, { 
      width: 12, height: 12, quality: 20, blur: 2.5 
    }),
    generateBlurPlaceholder(imageBuffer, { 
      width: 16, height: 16, quality: 25, blur: 2 
    }),
  ]);

  return {
    tiny: variants[0],    // 8x8, very small file size
    small: variants[1],   // 12x12, balanced
    medium: variants[2],  // 16x16, better quality
  };
}

/**
 * Validate if a string is a valid blur placeholder
 * @param blurData - The blur data string to validate
 * @returns boolean - True if valid blur placeholder
 */
export function isValidBlurPlaceholder(blurData: string): boolean {
  if (!blurData || typeof blurData !== "string") {
    return false;
  }

  // Check if it's a valid data URL
  const dataUrlRegex = /^data:image\/(jpeg|jpg|png|webp);base64,([A-Za-z0-9+/=]+)$/;
  return dataUrlRegex.test(blurData);
}

/**
 * Get the estimated file size of a blur placeholder
 * @param blurData - The base64 blur data
 * @returns number - Estimated size in bytes
 */
export function getBlurPlaceholderSize(blurData: string): number {
  if (!isValidBlurPlaceholder(blurData)) {
    return 0;
  }

  // Extract base64 part and calculate size
  const base64Part = blurData.split(",")[1];
  return Math.round((base64Part.length * 3) / 4);
} 