import sharp from "sharp";
import { spawn } from "child_process";
import { writeFile, unlink, readFile } from "fs/promises";
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

interface VideoPreviewOptions {
  maxWidth?: number;
  maxHeight?: number;
  bitrate?: string;
  fps?: number;
  quality?: number;
  duration?: number;
  format?: "mp4" | "webm";
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
      })[format]({
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
 * Generate a compressed video preview using FFmpeg
 * @param videoBuffer - The source video buffer
 * @param options - Configuration options for video preview generation
 * @returns Promise<Buffer> - Compressed video buffer
 */
export async function generateVideoPreview(
  videoBuffer: Buffer,
  options: VideoPreviewOptions = {}
): Promise<Buffer> {
  const {
    maxWidth = 1280,
    maxHeight = 720,
    bitrate = "500k",
    fps = 24,
    quality = 60,
    duration = 10,
    format = "mp4",
  } = options;

  try {
    // Create temporary files
    const tempDir = tmpdir();
    const inputPath = join(tempDir, `temp-input-${Date.now()}.mp4`);
    const outputPath = join(tempDir, `temp-preview-${Date.now()}.mp4`);

    // Write input video to temp file
    await writeFile(inputPath, videoBuffer);

    // Generate compressed preview using FFmpeg
    await generateCompressedVideoWithFFmpeg(inputPath, outputPath, {
      maxWidth,
      maxHeight,
      bitrate,
      fps,
      quality,
      duration,
      format,
    });

    // Read compressed video
    const previewBuffer = await readFile(outputPath);

    // Clean up temp files
    await Promise.all([
      unlink(inputPath).catch(() => {}),
      unlink(outputPath).catch(() => {}),
    ]);

    return previewBuffer;
  } catch (error) {
    console.error("Error generating video preview:", error);
    throw new Error("Failed to generate video preview");
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
 * Generate compressed video using FFmpeg
 * @param inputPath - Path to input video file
 * @param outputPath - Path to output compressed video file
 * @param options - Video compression options
 * @returns Promise<void>
 */
async function generateCompressedVideoWithFFmpeg(
  inputPath: string,
  outputPath: string,
  options: VideoPreviewOptions
): Promise<void> {
  const { maxWidth = 640, maxHeight = 360, bitrate = "300k", fps = 15, duration = 10 } = options;

  return new Promise((resolve, reject) => {
    const ffmpeg = spawn("ffmpeg", [
      "-i", inputPath,
      "-t", String(duration), // Limit duration
      "-vf", `scale=${maxWidth}:${maxHeight}:force_original_aspect_ratio=decrease`,
      "-r", String(fps), // Set frame rate (lower for smaller files)
      "-b:v", bitrate, // Set bitrate (lower for smaller files)
      "-c:v", "libx264", // Use H.264 codec
      "-preset", "veryfast", // Faster encoding
      "-crf", "28", // More aggressive compression (higher CRF = smaller file)
      "-an", // Remove audio for preview videos
      "-movflags", "+faststart", // Optimize for web
      "-y", // Overwrite output
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

/**
 * Parse frame rate string (e.g., "30/1" -> 30)
 * @param frameRateString - Frame rate string from FFmpeg
 * @returns Parsed frame rate as number
 */
function parseFrameRate(frameRateString: string): number {
  const parts = frameRateString.split('/');
  if (parts.length === 2) {
    const numerator = parseFloat(parts[0]);
    const denominator = parseFloat(parts[1]);
    return denominator !== 0 ? numerator / denominator : 0;
  }
  return parseFloat(frameRateString) || 0;
}

/**
 * Extract video metadata using FFmpeg probe
 * @param inputPath - Path to input video file
 * @returns Promise<VideoMetadata> - Video metadata
 */
async function getVideoMetadataWithFFmpeg(
  inputPath: string
): Promise<VideoMetadata> {
  return new Promise((resolve, reject) => {
    const ffprobe = spawn("ffprobe", [
      "-v", "quiet",
      "-print_format", "json",
      "-show_format",
      "-show_streams",
      inputPath,
    ]);

    let stdout = "";
    let stderr = "";

    ffprobe.stdout?.on("data", (data: Buffer) => {
      stdout += data.toString();
    });

    ffprobe.stderr?.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    ffprobe.on("close", (code: number | null) => {
      if (code === 0) {
        try {
          const probeData = JSON.parse(stdout);
          
          // Find video stream
          const videoStream = probeData.streams.find(
            (stream: { codec_type: string; width?: string; height?: string; r_frame_rate?: string; codec_name?: string }) => 
              stream.codec_type === "video"
          );

          if (!videoStream) {
            reject(new Error("No video stream found"));
            return;
          }

          // Extract metadata
          const metadata: VideoMetadata = {
            width: parseInt(videoStream.width) || 0,
            height: parseInt(videoStream.height) || 0,
            duration: parseFloat(probeData.format.duration) || 0,
            bitrate: parseInt(probeData.format.bit_rate) || undefined,
            fps: videoStream.r_frame_rate ? 
              parseFrameRate(videoStream.r_frame_rate) : undefined, // e.g., "30/1" -> 30
            codec: videoStream.codec_name || undefined,
          };

          resolve(metadata);
        } catch (parseError) {
          reject(new Error(`Failed to parse FFmpeg output: ${parseError}`));
        }
      } else {
        reject(new Error(`FFprobe failed with code ${code}: ${stderr}`));
      }
    });

    ffprobe.on("error", (error: Error) => {
      reject(new Error(`FFprobe error: ${error.message}`));
    });
  });
}

/**
 * Extract video metadata using FFmpeg
 * @param videoBuffer - The source video buffer
 * @returns Promise<VideoMetadata> - Video metadata including dimensions and duration
 */
export interface VideoMetadata {
  width: number;
  height: number;
  duration: number; // in seconds
  bitrate?: number;
  fps?: number;
  codec?: string;
}

export async function extractVideoMetadata(
  videoBuffer: Buffer
): Promise<VideoMetadata> {
  try {
    // Create temporary file
    const tempDir = tmpdir();
    const videoPath = join(tempDir, `temp-video-${Date.now()}.mp4`);

    // Write video buffer to temporary file
    await writeFile(videoPath, videoBuffer);

    // Extract metadata using FFmpeg
    const metadata = await getVideoMetadataWithFFmpeg(videoPath);

    // Clean up temporary file
    await unlink(videoPath).catch(() => {});

    return metadata;
  } catch (error) {
    console.error("Error extracting video metadata:", error);
    throw new Error("Failed to extract video metadata");
  }
} 