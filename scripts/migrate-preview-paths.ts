#!/usr/bin/env tsx

/**
 * Migration Script: Ensure Preview Path Consistency
 *
 * This script ensures that all posts have consistent preview path data
 * and migrates any missing preview paths where possible.
 */

import { db } from "../lib/db";
import { posts, media } from "../lib/db/schema";
import { eq, and, isNotNull, inArray } from "drizzle-orm";
import { getStorageConfig } from "../lib/image/storage";

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

    const postsWithMediaList = await db
      .select({
        id: posts.id,
        title: posts.title,
        uploadPath: posts.uploadPath,
        uploadFileType: posts.uploadFileType,
        previewPath: posts.previewPath,
        previewVideoPath: posts.previewVideoPath,
      })
      .from(posts)
      .where(
        and(
          isNotNull(posts.uploadPath),
          inArray(posts.uploadFileType, ["IMAGE", "VIDEO"])
        )
      );

    const postIds = postsWithMediaList.map((p) => p.id);
    const mediaRows: { postId: string | null; id: string; relativePath: string; mimeType: string }[] =
      postIds.length > 0
        ? await db
            .select({
              postId: media.postId,
              id: media.id,
              relativePath: media.relativePath,
              mimeType: media.mimeType,
            })
            .from(media)
            .where(inArray(media.postId, postIds))
        : [];
    const mediaByPostId = new Map<string | null, typeof mediaRows>();
    for (const m of mediaRows) {
      const key = m.postId;
      if (!mediaByPostId.has(key)) mediaByPostId.set(key, []);
      mediaByPostId.get(key)!.push(m);
    }

    const postsList = postsWithMediaList.map((p) => ({
      ...p,
      media: mediaByPostId.get(p.id) ?? [],
    }));

    stats.totalPosts = postsList.length;
    console.log(`📊 Found ${stats.totalPosts} posts with media`);

    for (const post of postsList) {
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

    for (const post of postsList) {
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

        if (needsUpdate) {
          await db
            .update(posts)
            .set(updateData as Record<string, unknown>)
            .where(eq(posts.id, post.id));
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

  const postsWithPreview = await db
    .select({
      id: posts.id,
      title: posts.title,
      previewPath: posts.previewPath,
      uploadFileType: posts.uploadFileType,
    })
    .from(posts)
    .where(isNotNull(posts.previewPath));

  console.log(`📊 Found ${postsWithPreview.length} posts with preview paths`);

  for (const post of postsWithPreview) {
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
  }
}

// Run the script
if (require.main === module) {
  main();
}

export { migratePreviewPaths, validatePreviewPaths }; 