import { prisma } from "../lib/prisma";
import { generateOptimizedBlurPlaceholder } from "../lib/blur";
import { getPublicUrl } from "../lib/storage";

/**
 * Enhanced Backfill Script for LQIP (Low Quality Image Placeholders)
 * 
 * This script processes:
 * 1. All existing posts with featuredImage but without blurData
 * 2. All existing media records with video previews but without blurDataUrl
 * 
 * Usage: npx tsx scripts/backfill-blur-data.ts
 */

interface ProcessResult {
  totalPosts: number;
  processedPosts: number;
  skippedPosts: number;
  errorPosts: number;
  errors: { postId: string; error: string }[];
  totalMedia: number;
  processedMedia: number;
  skippedMedia: number;
  errorMedia: number;
  mediaErrors: { mediaId: string; error: string }[];
}

async function downloadImage(url: string): Promise<Buffer> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.status} ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('Failed to parse URL')) {
      throw new Error(`Invalid URL format: ${url}`);
    }
    throw error;
  }
}

async function processPost(
  post: { id: string; title: string; uploadPath: string | null; uploadFileType: string | null }
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`Processing post: ${post.title} (${post.id})`);

    // Check if uploadPath exists and is an image
    if (!post.uploadPath || post.uploadFileType !== 'IMAGE') {
      return { success: false, error: "No image upload path found or not an image" };
    }

    let imageBuffer: Buffer | null = null;

    // Try different approaches to get the image
    try {
      // First, try using getPublicUrl to resolve the URL
      const imageUrl = await getPublicUrl(post.uploadPath);
      console.log(`  Trying to download from: ${imageUrl}`);
      imageBuffer = await downloadImage(imageUrl);
    } catch (urlError) {
      console.log(`  URL resolution failed, trying local file system...`);
      
      // If URL resolution fails, try reading directly from local filesystem
      const fs = await import("fs/promises");
      const path = await import("path");
      
      // Try different local paths
      const possiblePaths = [
        path.join(process.cwd(), "public", post.uploadPath),
        path.join(process.cwd(), "public", "uploads", post.uploadPath),
        path.join(process.cwd(), "public", post.uploadPath.replace(/^\//, "")),
        path.join(process.cwd(), post.uploadPath),
      ];
      
      let fileFound = false;
      for (const filePath of possiblePaths) {
        try {
          console.log(`  Trying local path: ${filePath}`);
          imageBuffer = await fs.readFile(filePath);
          fileFound = true;
          console.log(`  ✅ Found file at: ${filePath}`);
          break;
        } catch (fileError) {
          // Continue to next path
        }
      }
      
      if (!fileFound) {
        throw new Error(`Could not find image file. Tried URL: ${post.uploadPath}, and local paths: ${possiblePaths.join(", ")}`);
      }
    }
    
    // Ensure we have a valid image buffer
    if (!imageBuffer) {
      throw new Error("Failed to load image buffer");
    }
    
    // Generate blur placeholder
    const blurDataUrl = await generateOptimizedBlurPlaceholder(imageBuffer);
    
    // Update the post with blur data
    await prisma.post.update({
      where: { id: post.id },
      data: { blurData: blurDataUrl }
    });

    console.log(`✅ Successfully processed: ${post.title}`);
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`❌ Error processing ${post.title}:`, errorMessage);
    return { success: false, error: errorMessage };
  }
}

async function processMediaPreview(
  media: { id: string; filename: string; previewRelativePath: string | null }
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`Processing media preview: ${media.filename} (${media.id})`);

    // Check if preview path exists
    if (!media.previewRelativePath) {
      return { success: false, error: "No preview path found" };
    }

    let imageBuffer: Buffer | null = null;

    // Try different approaches to get the preview image
    try {
      // First, try using getPublicUrl to resolve the URL
      const previewUrl = await getPublicUrl(media.previewRelativePath);
      console.log(`  Trying to download preview from: ${previewUrl}`);
      imageBuffer = await downloadImage(previewUrl);
    } catch (urlError) {
      console.log(`  Preview URL resolution failed, trying local file system...`);
      
      // If URL resolution fails, try reading directly from local filesystem
      const fs = await import("fs/promises");
      const path = await import("path");
      
      // Try different local paths for preview images
      const possiblePaths = [
        path.join(process.cwd(), "public", media.previewRelativePath),
        path.join(process.cwd(), "public", "uploads", media.previewRelativePath),
        path.join(process.cwd(), "public", media.previewRelativePath.replace(/^\//, "")),
        path.join(process.cwd(), media.previewRelativePath),
      ];
      
      let fileFound = false;
      for (const filePath of possiblePaths) {
        try {
          console.log(`  Trying local preview path: ${filePath}`);
          imageBuffer = await fs.readFile(filePath);
          fileFound = true;
          console.log(`  ✅ Found preview file at: ${filePath}`);
          break;
        } catch (fileError) {
          // Continue to next path
        }
      }
      
      if (!fileFound) {
        throw new Error(`Could not find preview image file. Tried preview path: ${media.previewRelativePath}, and local paths: ${possiblePaths.join(", ")}`);
      }
    }
    
    // Ensure we have a valid image buffer
    if (!imageBuffer) {
      throw new Error("Failed to load preview image buffer");
    }
    
    // Generate blur placeholder from preview image
    const blurDataUrl = await generateOptimizedBlurPlaceholder(imageBuffer, "image/avif");
    
    // Update the media record with blur data
    await prisma.media.update({
      where: { id: media.id },
      data: { blurDataUrl }
    });

    console.log(`✅ Successfully processed media preview: ${media.filename}`);
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`❌ Error processing media preview ${media.filename}:`, errorMessage);
    return { success: false, error: errorMessage };
  }
}

async function backfillBlurData(): Promise<ProcessResult> {
  console.log("🚀 Starting enhanced blur data backfill process...");
  
  const result: ProcessResult = {
    totalPosts: 0,
    processedPosts: 0,
    skippedPosts: 0,
    errorPosts: 0,
    errors: [],
    totalMedia: 0,
    processedMedia: 0,
    skippedMedia: 0,
    errorMedia: 0,
    mediaErrors: []
  };

  try {
    // PART 1: Process posts with featuredImage but without blurData
    console.log("📊 PART 1: Processing featured images...");
    const postsToProcess = await prisma.post.findMany({
      where: {
        uploadPath: { not: null },
        uploadFileType: 'IMAGE',
        blurData: null
      },
      select: {
        id: true,
        title: true,
        uploadPath: true,
        uploadFileType: true
      }
    });

    result.totalPosts = postsToProcess.length;
    console.log(`📊 Found ${result.totalPosts} posts that need featured image blur data generation`);

    if (result.totalPosts > 0) {
      // Process posts in batches to avoid overwhelming the system
      const batchSize = 5;
      for (let i = 0; i < postsToProcess.length; i += batchSize) {
        const batch = postsToProcess.slice(i, i + batchSize);
        console.log(`\n📦 Processing posts batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(postsToProcess.length / batchSize)}`);

        // Process batch concurrently
        const batchPromises = batch.map(async (post) => {
          const processResult = await processPost(post);
          
          if (processResult.success) {
            result.processedPosts++;
          } else {
            result.errorPosts++;
            result.errors.push({
              postId: post.id,
              error: processResult.error || "Unknown error"
            });
          }
        });

        await Promise.all(batchPromises);
        
        // Small delay between batches to be gentle on the system
        if (i + batchSize < postsToProcess.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }

    // PART 2: Process media records with preview images but without blur data
    console.log("\n📊 PART 2: Processing media preview images...");
    const mediaToProcess = await prisma.media.findMany({
      where: {
        previewRelativePath: { not: null },
        blurDataUrl: null
      },
      select: {
        id: true,
        filename: true,
        previewRelativePath: true
      }
    });

    result.totalMedia = mediaToProcess.length;
    console.log(`📊 Found ${result.totalMedia} media records that need preview blur data generation`);

    if (result.totalMedia > 0) {
      // Process media in batches
      const mediaBatchSize = 5;
      for (let i = 0; i < mediaToProcess.length; i += mediaBatchSize) {
        const batch = mediaToProcess.slice(i, i + mediaBatchSize);
        console.log(`\n📦 Processing media batch ${Math.floor(i / mediaBatchSize) + 1}/${Math.ceil(mediaToProcess.length / mediaBatchSize)}`);

        // Process batch concurrently
        const batchPromises = batch.map(async (media) => {
          const processResult = await processMediaPreview(media);
          
          if (processResult.success) {
            result.processedMedia++;
          } else {
            result.errorMedia++;
            result.mediaErrors.push({
              mediaId: media.id,
              error: processResult.error || "Unknown error"
            });
          }
        });

        await Promise.all(batchPromises);
        
        // Small delay between batches
        if (i + mediaBatchSize < mediaToProcess.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }

    console.log("\n🎉 Enhanced backfill process completed!");
    console.log(`📈 Summary:`);
    console.log(`  Featured Images:`);
    console.log(`    - Total posts processed: ${result.processedPosts}/${result.totalPosts}`);
    console.log(`    - Errors: ${result.errorPosts}`);
    console.log(`  Media Previews:`);
    console.log(`    - Total media processed: ${result.processedMedia}/${result.totalMedia}`);
    console.log(`    - Errors: ${result.errorMedia}`);

    if (result.errors.length > 0) {
      console.log(`\n❌ Post processing errors:`);
      result.errors.forEach(({ postId, error }) => {
        console.log(`  - Post ${postId}: ${error}`);
      });
    }

    if (result.mediaErrors.length > 0) {
      console.log(`\n❌ Media processing errors:`);
      result.mediaErrors.forEach(({ mediaId, error }) => {
        console.log(`  - Media ${mediaId}: ${error}`);
      });
    }

    return result;
  } catch (error) {
    console.error("❌ Fatal error during backfill process:", error);
    throw error;
  }
}

// Run the script if called directly
if (require.main === module) {
  backfillBlurData()
    .then((result) => {
      const exitCode = result.errorPosts > 0 || result.errorMedia > 0 ? 1 : 0;
      process.exit(exitCode);
    })
    .catch((error) => {
      console.error("💥 Script failed:", error);
      process.exit(1);
    });
}

export { backfillBlurData }; 