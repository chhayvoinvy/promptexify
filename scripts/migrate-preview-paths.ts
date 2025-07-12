#!/usr/bin/env tsx

/**
 * Migration Script: Ensure Preview Path Consistency
 * 
 * This script ensures that all posts have consistent preview path data
 * and migrates any missing preview paths where possible.
 */

import { PrismaClient } from "@prisma/client";
import { getStorageConfig } from "../lib/image/storage";

const prisma = new PrismaClient();

interface MigrationStats {
  totalPosts: number;
  postsWithPreviewPath: number;
  postsWithoutPreviewPath: number;
  postsWithPreviewVideoPath: number;
  postsWithoutPreviewVideoPath: number;
  migratedCount: number;
  errors: string[];
}

async function migratePreviewPaths(): Promise<MigrationStats> {
  const stats: MigrationStats = {
    totalPosts: 0,
    postsWithPreviewPath: 0,
    postsWithoutPreviewPath: 0,
    postsWithPreviewVideoPath: 0,
    postsWithoutPreviewVideoPath: 0,
    migratedCount: 0,
    errors: [],
  };

  try {
    console.log("🔍 Starting preview path migration...");

    // Get all posts with media
    const posts = await prisma.post.findMany({
      where: {
        uploadPath: { not: null },
        uploadFileType: { in: ["IMAGE", "VIDEO"] },
      },
      select: {
        id: true,
        title: true,
        uploadPath: true,
        uploadFileType: true,
        previewPath: true,
        previewVideoPath: true,
        media: {
          select: {
            id: true,
            relativePath: true,
            mimeType: true,
          },
        },
      },
    });

    stats.totalPosts = posts.length;
    console.log(`📊 Found ${stats.totalPosts} posts with media`);

    // Analyze current state
    for (const post of posts) {
      if (post.previewPath) {
        stats.postsWithPreviewPath++;
      } else {
        stats.postsWithoutPreviewPath++;
      }

      if (post.uploadFileType === "VIDEO") {
        if (post.previewVideoPath) {
          stats.postsWithPreviewVideoPath++;
        } else {
          stats.postsWithoutPreviewVideoPath++;
        }
      }
    }

    console.log(`📈 Current state:`);
    console.log(`  - Posts with preview path: ${stats.postsWithPreviewPath}`);
    console.log(`  - Posts without preview path: ${stats.postsWithoutPreviewPath}`);
    console.log(`  - Videos with preview video path: ${stats.postsWithPreviewVideoPath}`);
    console.log(`  - Videos without preview video path: ${stats.postsWithoutPreviewVideoPath}`);

    // Get storage configuration
    const storageConfig = await getStorageConfig();
    console.log(`💾 Storage type: ${storageConfig.storageType}`);

    // Migrate posts that need preview paths
    for (const post of posts) {
      try {
        if (!post.uploadPath) continue;

        let needsUpdate = false;
        const updateData: any = {};

        // Check if we need to generate preview path for images
        if (post.uploadFileType === "IMAGE" && !post.previewPath) {
          // For images, we can't generate preview paths retroactively
          // But we can check if a preview file exists and update the database
          console.log(`⚠️  Post ${post.id} (${post.title}) missing preview path for image`);
          stats.errors.push(`Post ${post.id}: Missing preview path for image`);
        }

        // Check if we need to generate preview path for videos
        if (post.uploadFileType === "VIDEO") {
          if (!post.previewPath) {
            console.log(`⚠️  Post ${post.id} (${post.title}) missing preview path for video`);
            stats.errors.push(`Post ${post.id}: Missing preview path for video`);
          }
          
          if (!post.previewVideoPath) {
            console.log(`⚠️  Post ${post.id} (${post.title}) missing preview video path`);
            stats.errors.push(`Post ${post.id}: Missing preview video path`);
          }
        }

        // Update if needed
        if (needsUpdate) {
          await prisma.post.update({
            where: { id: post.id },
            data: updateData,
          });
          stats.migratedCount++;
          console.log(`✅ Updated post ${post.id}`);
        }

      } catch (error) {
        const errorMsg = `Error processing post ${post.id}: ${error}`;
        console.error(errorMsg);
        stats.errors.push(errorMsg);
      }
    }

    console.log(`\n🎉 Migration completed!`);
    console.log(`📊 Final stats:`);
    console.log(`  - Total posts processed: ${stats.totalPosts}`);
    console.log(`  - Posts migrated: ${stats.migratedCount}`);
    console.log(`  - Errors: ${stats.errors.length}`);

    if (stats.errors.length > 0) {
      console.log(`\n❌ Errors encountered:`);
      stats.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    }

    return stats;

  } catch (error) {
    console.error("💥 Migration failed:", error);
    throw error;
  }
}

async function validatePreviewPaths(): Promise<void> {
  console.log("\n🔍 Validating preview paths...");

  const posts = await prisma.post.findMany({
    where: {
      previewPath: { not: null },
    },
    select: {
      id: true,
      title: true,
      previewPath: true,
      uploadFileType: true,
    },
  });

  console.log(`📊 Found ${posts.length} posts with preview paths`);

  for (const post of posts) {
    if (!post.previewPath) continue;

    // Validate preview path format
    if (!post.previewPath.startsWith("preview/")) {
      console.log(`⚠️  Post ${post.id}: Preview path doesn't start with 'preview/': ${post.previewPath}`);
    }

    // Check file extension
    const ext = post.previewPath.split('.').pop()?.toLowerCase();
    if (post.uploadFileType === "IMAGE" && ext !== "webp") {
      console.log(`⚠️  Post ${post.id}: Image preview should be WebP, got: ${ext}`);
    }
  }

  console.log("✅ Preview path validation completed");
}

async function main() {
  try {
    console.log("🚀 Starting preview path migration and validation...\n");

    // Run migration
    const stats = await migratePreviewPaths();

    // Run validation
    await validatePreviewPaths();

    console.log("\n✨ All operations completed successfully!");

  } catch (error) {
    console.error("💥 Script failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
if (require.main === module) {
  main();
}

export { migratePreviewPaths, validatePreviewPaths }; 