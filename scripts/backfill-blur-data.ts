import { prisma } from "../lib/prisma";
import { generateOptimizedBlurPlaceholder } from "../lib/blur";
import { getPublicUrl } from "../lib/storage";

/**
 * Backfill Script for LQIP (Low Quality Image Placeholders)
 * 
 * This script processes all existing posts with featuredImage but without featuredImageBlur
 * and generates blur placeholders for them.
 * 
 * Usage: npx tsx scripts/backfill-blur-data.ts
 */

interface ProcessResult {
  totalPosts: number;
  processedPosts: number;
  skippedPosts: number;
  errorPosts: number;
  errors: { postId: string; error: string }[];
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
  post: { id: string; title: string; featuredImage: string | null }
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`Processing post: ${post.title} (${post.id})`);

    // Check if featuredImage exists
    if (!post.featuredImage) {
      return { success: false, error: "No featured image found" };
    }

    let imageBuffer: Buffer | null = null;

    // Try different approaches to get the image
    try {
      // First, try using getPublicUrl to resolve the URL
      const imageUrl = await getPublicUrl(post.featuredImage);
      console.log(`  Trying to download from: ${imageUrl}`);
      imageBuffer = await downloadImage(imageUrl);
    } catch (urlError) {
      console.log(`  URL resolution failed, trying local file system...`);
      
      // If URL resolution fails, try reading directly from local filesystem
      const fs = await import("fs/promises");
      const path = await import("path");
      
      // Try different local paths
      const possiblePaths = [
        path.join(process.cwd(), "public", post.featuredImage),
        path.join(process.cwd(), "public", "uploads", post.featuredImage),
        path.join(process.cwd(), "public", post.featuredImage.replace(/^\//, "")),
        path.join(process.cwd(), post.featuredImage),
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
        throw new Error(`Could not find image file. Tried URL: ${post.featuredImage}, and local paths: ${possiblePaths.join(", ")}`);
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
      data: { featuredImageBlur: blurDataUrl }
    });

    console.log(`✅ Successfully processed: ${post.title}`);
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`❌ Error processing ${post.title}:`, errorMessage);
    return { success: false, error: errorMessage };
  }
}

async function backfillBlurData(): Promise<ProcessResult> {
  console.log("🚀 Starting blur data backfill process...");
  
  const result: ProcessResult = {
    totalPosts: 0,
    processedPosts: 0,
    skippedPosts: 0,
    errorPosts: 0,
    errors: []
  };

  try {
    // Find all posts with featuredImage but without featuredImageBlur
    const postsToProcess = await prisma.post.findMany({
      where: {
        featuredImage: { not: null },
        featuredImageBlur: null
      },
      select: {
        id: true,
        title: true,
        featuredImage: true
      }
    });

    result.totalPosts = postsToProcess.length;
    console.log(`📊 Found ${result.totalPosts} posts that need blur data generation`);

    if (result.totalPosts === 0) {
      console.log("✨ No posts need processing. All posts already have blur data!");
      return result;
    }

    // Process posts in batches to avoid overwhelming the system
    const batchSize = 5;
    for (let i = 0; i < postsToProcess.length; i += batchSize) {
      const batch = postsToProcess.slice(i, i + batchSize);
      console.log(`\n📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(postsToProcess.length / batchSize)}`);

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

    console.log("\n🎉 Backfill process completed!");
    console.log(`📈 Summary:`);
    console.log(`  - Total posts: ${result.totalPosts}`);
    console.log(`  - Successfully processed: ${result.processedPosts}`);
    console.log(`  - Errors: ${result.errorPosts}`);
    console.log(`  - Skipped: ${result.skippedPosts}`);

    if (result.errors.length > 0) {
      console.log(`\n❌ Errors encountered:`);
      result.errors.forEach(({ postId, error }) => {
        console.log(`  - Post ${postId}: ${error}`);
      });
    }

    return result;
  } catch (error) {
    console.error("💥 Fatal error during backfill process:", error);
    throw error;
  }
}

// Run the script if called directly
if (require.main === module) {
  backfillBlurData()
    .then((result) => {
      const exitCode = result.errorPosts > 0 ? 1 : 0;
      process.exit(exitCode);
    })
    .catch((error) => {
      console.error("💥 Script failed:", error);
      process.exit(1);
    });
}

export { backfillBlurData }; 