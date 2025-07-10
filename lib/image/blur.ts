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
    format = "jpeg",
  } = options;

  try {
    // Input validation
    if (!imageBuffer || imageBuffer.length === 0) {
      throw new Error("Invalid image buffer provided");
    }

    // Create a tiny, blurred version of the image
    const tinyBuffer = await sharp(imageBuffer)
      .resize(width, height, {
        fit: "cover", // Maintain aspect ratio while filling dimensions
        position: "center",
      })
      .blur(blur)
      .modulate({
        brightness: 1,
        saturation: 1.2, // Slightly increase saturation for better visual effect
      })
      [format]({
        quality,
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
 * @param imageBuffer - The source image buffer  
 * @param originalMimeType - The original image MIME type
 * @returns Promise<string> - Base64 data URL
 */
export async function generateOptimizedBlurPlaceholder(
  imageBuffer: Buffer,
  originalMimeType?: string
): Promise<string> {
  // Choose optimal settings based on original image type
  const isPhoto = originalMimeType?.includes("jpeg") || originalMimeType?.includes("jpg");
  
  const options: BlurOptions = {
    width: isPhoto ? 12 : 8, // Slightly larger for photos
    height: isPhoto ? 12 : 8,
    quality: isPhoto ? 25 : 15,
    blur: isPhoto ? 2.5 : 3,
    format: "jpeg", // JPEG is more efficient for blur placeholders
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