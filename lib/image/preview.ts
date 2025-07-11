import sharp from "sharp";
import { spawn } from "child_process";
import { promisify } from "util";
import { writeFile, unlink } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";

/**
 * Preview Generation Service
 * Creates optimized preview images for grid displays and video thumbnails
 */

interface PreviewOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: "avif" | "webp" | "jpeg";
}

interface VideoThumbnailOptions {
  time?: string; // Time position for thumbnail (e.g., "00:00:01")
  width?: number;
  height?: number;
  quality?: number;
}

/**
 * Generate a preview image from an image buffer
 * Maintains aspect ratio while fitting within max dimensions
 * @param imageBuffer - The source image buffer
 * @param options - Configuration options for preview generation
 * @returns Promise<Buffer> - Preview image buffer
 */
export async function generateImagePreview(
  imageBuffer: Buffer,
  options: PreviewOptions = {}
): Promise<Buffer> {
  const {
    maxWidth = 1280,
    maxHeight = 720,
    quality = 80,
    format = "webp",
  } = options;

  try {
    // Get original image metadata
    const metadata = await sharp(imageBuffer).metadata();
    const { width: originalWidth, height: originalHeight } = metadata;

    if (!originalWidth || !originalHeight) {
      throw new Error("Unable to determine image dimensions");
    }

    // Calculate new dimensions maintaining aspect ratio
    const { width, height } = calculateAspectRatioFit(
      originalWidth,
      originalHeight,
      maxWidth,
      maxHeight
    );

    // Generate preview
    const previewBuffer = await sharp(imageBuffer)
      .resize(width, height, {
        fit: "inside", // Maintain aspect ratio, don't crop
        withoutEnlargement: true, // Don't upscale if image is smaller
      })
      [format]({
        quality,
        ...(format === "avif" && { effort: 4 }),
        ...(format === "webp" && { effort: 6 }),
        ...(format === "jpeg" && { progressive: true }),
      })
      .toBuffer();

    return previewBuffer;
  } catch (error) {
    console.error("Error generating image preview:", error);
    throw new Error("Failed to generate image preview");
  }
}

/**
 * Generate a video thumbnail using FFmpeg
 * @param videoBuffer - The source video buffer
 * @param options - Configuration options for thumbnail generation
 * @returns Promise<Buffer> - Thumbnail image buffer
 */
export async function generateVideoThumbnail(
  videoBuffer: Buffer,
  options: VideoThumbnailOptions = {}
): Promise<Buffer> {
  const {
    time = "00:00:01",
    width = 1280,
    height = 720,
    quality = 80,
  } = options;

  try {
    // Create temporary files
    const tempDir = tmpdir();
    const videoPath = join(tempDir, `temp-video-${Date.now()}.mp4`);
    const thumbnailPath = join(tempDir, `temp-thumbnail-${Date.now()}.jpg`);

    // Write video buffer to temporary file
    await writeFile(videoPath, videoBuffer);

    // Generate thumbnail using FFmpeg
    await generateThumbnailWithFFmpeg(videoPath, thumbnailPath, {
      time,
      width,
      height,
      quality,
    });

    // Read thumbnail file
    const thumbnailBuffer = await sharp(thumbnailPath)
      .webp({ quality, effort: 6 })
      .toBuffer();

    // Clean up temporary files
    await Promise.all([
      unlink(videoPath).catch(() => {}),
      unlink(thumbnailPath).catch(() => {}),
    ]);

    return thumbnailBuffer;
  } catch (error) {
    console.error("Error generating video thumbnail:", error);
    throw new Error("Failed to generate video thumbnail");
  }
}

/**
 * Generate preview filename with random pattern
 * @param originalFilename - The original filename (used to extract userPrefix)
 * @returns string - Preview filename in format: {userPrefix}{randomId15chars}.webp
 */
export function generatePreviewFilename(originalFilename: string): string {
  // Extract userPrefix from original filename
  // Format is expected to be: {title}-{userPrefix}{randomId5digits}.{ext}
  const lastDotIndex = originalFilename.lastIndexOf(".");
  const nameWithoutExt = lastDotIndex === -1 ? originalFilename : originalFilename.substring(0, lastDotIndex);
  
  // Find the last dash to locate userPrefix
  const lastDashIndex = nameWithoutExt.lastIndexOf("-");
  let userPrefix = "admin";
  
  if (lastDashIndex !== -1) {
    // Extract the part after the last dash (userPrefix + 5 digit randomId)
    const userPrefixAndId = nameWithoutExt.substring(lastDashIndex + 1);
    // Take first 8 chars as userPrefix (matching the logic in filename generation)
    if (userPrefixAndId.length >= 8) {
      userPrefix = userPrefixAndId.substring(0, 8);
    }
  }

  // Generate 15 random alphanumeric characters
  const randomId = Array.from(
    { length: 15 },
    () => "0123456789abcdefghijklmnopqrstuvwxyz"[Math.floor(Math.random() * 36)]
  ).join("");

  return `${userPrefix}${randomId}.webp`;
}

/**
 * Calculate dimensions that fit within max bounds while maintaining aspect ratio
 * @param originalWidth - Original image width
 * @param originalHeight - Original image height
 * @param maxWidth - Maximum allowed width
 * @param maxHeight - Maximum allowed height
 * @returns Object with new width and height
 */
function calculateAspectRatioFit(
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  const aspectRatio = originalWidth / originalHeight;
  const maxAspectRatio = maxWidth / maxHeight;

  let width: number;
  let height: number;

  if (aspectRatio > maxAspectRatio) {
    // Image is wider than max bounds
    width = maxWidth;
    height = Math.round(maxWidth / aspectRatio);
  } else {
    // Image is taller than max bounds
    height = maxHeight;
    width = Math.round(maxHeight * aspectRatio);
  }

  return { width, height };
}

/**
 * Generate thumbnail using FFmpeg
 * @param inputPath - Path to input video file
 * @param outputPath - Path to output thumbnail file
 * @param options - Thumbnail generation options
 * @returns Promise<void>
 */
async function generateThumbnailWithFFmpeg(
  inputPath: string,
  outputPath: string,
  options: VideoThumbnailOptions
): Promise<void> {
  const { time = "00:00:01", width = 1280, height = 720, quality = 80 } = options;

  return new Promise((resolve, reject) => {
    const ffmpeg = spawn("ffmpeg", [
      "-i", inputPath,
      "-ss", time,
      "-vframes", "1",
      "-vf", `scale=${width}:${height}:force_original_aspect_ratio=decrease`,
      "-q:v", String(Math.round(31 - (quality / 100) * 31)), // Convert quality to FFmpeg scale
      "-y", // Overwrite output file
      outputPath,
    ]);

    let stderr = "";

    ffmpeg.stderr?.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    ffmpeg.on("close", (code: number | null) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`FFmpeg failed with code ${code}: ${stderr}`));
      }
    });

    ffmpeg.on("error", (error: Error) => {
      reject(new Error(`FFmpeg error: ${error.message}`));
    });
  });
}

/**
 * Check if FFmpeg is available on the system
 * @returns Promise<boolean> - True if FFmpeg is available
 */
export async function isFFmpegAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    const ffmpeg = spawn("ffmpeg", ["-version"]);
    
    ffmpeg.on("close", (code) => {
      resolve(code === 0);
    });

    ffmpeg.on("error", () => {
      resolve(false);
    });
  });
} 