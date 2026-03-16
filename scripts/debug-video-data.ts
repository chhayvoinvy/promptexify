#!/usr/bin/env tsx

/**
 * Debug script for video data and preview system
 * This script provides diagnostic information for troubleshooting video loading issues
 */

import { db } from "../lib/db";
import { posts } from "../lib/db/schema";
import { eq, desc, isNotNull, and } from "drizzle-orm";
import { existsSync } from "fs";
import { join } from "path";

async function debugVideoData() {
  console.log("🔍 Debugging video data and preview system...\n");

  try {
    const videoPosts = await db
      .select({
        id: posts.id,
        title: posts.title,
        uploadPath: posts.uploadPath,
        uploadFileType: posts.uploadFileType,
        previewPath: posts.previewPath,
        previewVideoPath: posts.previewVideoPath,
        createdAt: posts.createdAt,
      })
      .from(posts)
      .where(
        and(
          eq(posts.uploadFileType, "VIDEO"),
          isNotNull(posts.uploadPath)
        )
      )
      .orderBy(desc(posts.createdAt))
      .limit(5);

    console.log(`📊 Found ${videoPosts.length} video posts\n`);

    // Debug each video post
    videoPosts.forEach((post, index) => {
      console.log(`🎬 Video Post ${index + 1}:`);
      console.log(`   ID: ${post.id}`);
      console.log(`   Title: ${post.title}`);
      console.log(`   Created: ${post.createdAt.toLocaleDateString()}`);
      console.log(`   Upload Path: ${post.uploadPath}`);
      console.log(`   Preview Path: ${post.previewPath || "❌ Missing"}`);
      console.log(`   Preview Video Path: ${post.previewVideoPath || "❌ Missing"}`);

      // Check file existence
      if (post.previewPath) {
        const previewFile = join(process.cwd(), "public", "uploads", "preview", post.previewPath.replace("preview/", ""));
        const exists = existsSync(previewFile);
        console.log(`   Preview File: ${exists ? "✅ Exists" : "❌ Missing"} (${previewFile})`);
      }

      if (post.previewVideoPath) {
        const previewVideoFile = join(process.cwd(), "public", "uploads", "preview", post.previewVideoPath.replace("preview/", ""));
        const exists = existsSync(previewVideoFile);
        console.log(`   Preview Video File: ${exists ? "✅ Exists" : "❌ Missing"} (${previewVideoFile})`);
      }

      // Original video file
      if (post.uploadPath) {
        const originalFile = join(process.cwd(), "public", "uploads", post.uploadPath);
        const exists = existsSync(originalFile);
        console.log(`   Original Video File: ${exists ? "✅ Exists" : "❌ Missing"} (${originalFile})`);
      }

      // Generate debug URLs
      console.log("\n   🌐 URLs for testing:");
      if (post.previewPath) {
        console.log(`     Preview Image: /api/media/preview/${post.previewPath.replace("preview/", "")}`);
      }
      if (post.previewVideoPath) {
        console.log(`     Preview Video: /api/media/preview/${post.previewVideoPath.replace("preview/", "")}`);
      }
      if (post.uploadPath) {
        console.log(`     Original Video: /uploads/${post.uploadPath}`);
      }

      console.log("\n   📱 React Props for MediaVideo:");
      console.log(`     src={${post.previewVideoPath ? `"${post.previewVideoPath}"` : '""'}}`);
      console.log(`     previewSrc={${post.previewPath ? `"${post.previewPath}"` : 'undefined'}}`);
      console.log(`     previewVideoSrc={${post.previewVideoPath ? `"${post.previewVideoPath}"` : 'undefined'}}`);
      console.log(`     usePreviewVideo={true}`);
      console.log(`     fallbackToOriginal={false}`);

      console.log("\n" + "─".repeat(80) + "\n");
    });

    // System health check
    console.log("🏥 System Health Check:");
    
    // Check uploads directory
    const uploadsDir = join(process.cwd(), "public", "uploads");
    const previewDir = join(process.cwd(), "public", "uploads", "preview");
    
    console.log(`   Uploads directory: ${existsSync(uploadsDir) ? "✅ Exists" : "❌ Missing"} (${uploadsDir})`);
    console.log(`   Preview directory: ${existsSync(previewDir) ? "✅ Exists" : "❌ Missing"} (${previewDir})`);

    // Check for common issues
    const postsWithoutPreview = videoPosts.filter(p => !p.previewPath);
    const postsWithoutPreviewVideo = videoPosts.filter(p => !p.previewVideoPath);
    
    console.log("\n⚠️  Common Issues:");
    console.log(`   Videos without preview image: ${postsWithoutPreview.length}`);
    console.log(`   Videos without preview video: ${postsWithoutPreviewVideo.length}`);

    if (postsWithoutPreview.length > 0) {
      console.log("\n   Videos missing preview images:");
      postsWithoutPreview.forEach(post => {
        console.log(`     - ${post.title} (${post.id})`);
      });
    }

    if (postsWithoutPreviewVideo.length > 0) {
      console.log("\n   Videos missing preview videos:");
      postsWithoutPreviewVideo.forEach(post => {
        console.log(`     - ${post.title} (${post.id})`);
      });
    }

    console.log("\n✅ Debug completed successfully!");
    
  } catch (error) {
    console.error("❌ Debug failed:", error);
  }
}

// Run the debug
debugVideoData().catch(console.error); 