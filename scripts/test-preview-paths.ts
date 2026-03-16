#!/usr/bin/env tsx

/**
 * Test script to verify preview path implementation
 * This script checks that posts have the correct preview paths and video preview paths
 */

import { db } from "../lib/db";
import { posts } from "../lib/db/schema";
import { and, isNotNull, inArray } from "drizzle-orm";
import { existsSync } from "fs";
import { join } from "path";

async function testPreviewPaths() {
  console.log("🔍 Testing preview path implementation...\n");

  try {
    const postsWithMedia = await db
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
      )
      .limit(10);

    console.log(`📊 Found ${postsWithMedia.length} posts with media\n`);

    // Test file existence for local storage
    const testFileExistence = (path: string): boolean => {
      if (!path || !path.startsWith("preview/")) return false;
      
      const filename = path.replace("preview/", "");
      const filePath = join(process.cwd(), "public", "uploads", "preview", filename);
      return existsSync(filePath);
    };

    postsWithMedia.forEach((post, index) => {
      console.log(`📝 Post ${index + 1}: ${post.title}`);
      console.log(`   ID: ${post.id}`);
      console.log(`   Type: ${post.uploadFileType}`);
      console.log(`   Upload Path: ${post.uploadPath}`);
      console.log(`   Preview Path: ${post.previewPath || "❌ Missing"}`);
      
      // Test file existence
      if (post.previewPath) {
        const exists = testFileExistence(post.previewPath);
        console.log(`   Preview File Exists: ${exists ? "✅ Yes" : "❌ No"}`);
        if (exists) {
          console.log(`   Preview API URL: /api/media/preview/${post.previewPath.replace("preview/", "")}`);
        }
      }
      
      if (post.uploadFileType === "VIDEO") {
        console.log(`   Preview Video Path: ${post.previewVideoPath || "❌ Missing"}`);
        if (post.previewVideoPath) {
          const exists = testFileExistence(post.previewVideoPath);
          console.log(`   Preview Video File Exists: ${exists ? "✅ Yes" : "❌ No"}`);
          if (exists) {
            console.log(`   Preview Video API URL: /api/media/preview/${post.previewVideoPath.replace("preview/", "")}`);
          }
        }
      }
      
      console.log("");
    });

    // Check path patterns
    const imagePosts = postsWithMedia.filter(p => p.uploadFileType === "IMAGE");
    const videoPosts = postsWithMedia.filter(p => p.uploadFileType === "VIDEO");

    console.log("📈 Summary:");
    console.log(`   Images: ${imagePosts.length}`);
    console.log(`   Videos: ${videoPosts.length}`);
    console.log(`   Images with preview: ${imagePosts.filter(p => p.previewPath).length}`);
    console.log(`   Videos with preview: ${videoPosts.filter(p => p.previewPath).length}`);
    console.log(`   Videos with preview video: ${videoPosts.filter(p => p.previewVideoPath).length}`);

    // Test file existence
    const imagesWithPreviewFiles = imagePosts.filter(p => p.previewPath && testFileExistence(p.previewPath));
    const videosWithPreviewFiles = videoPosts.filter(p => p.previewPath && testFileExistence(p.previewPath));
    const videosWithPreviewVideoFiles = videoPosts.filter(p => p.previewVideoPath && testFileExistence(p.previewVideoPath));

    console.log("\n📁 File Existence:");
    console.log(`   Image preview files: ${imagesWithPreviewFiles.length}/${imagePosts.filter(p => p.previewPath).length}`);
    console.log(`   Video preview files: ${videosWithPreviewFiles.length}/${videoPosts.filter(p => p.previewPath).length}`);
    console.log(`   Video preview video files: ${videosWithPreviewVideoFiles.length}/${videoPosts.filter(p => p.previewVideoPath).length}`);

    // Check path patterns
    console.log("\n🔍 Path Pattern Analysis:");
    
    const previewPaths = postsWithMedia.filter(p => p.previewPath).map(p => p.previewPath!);
    const previewVideoPaths = postsWithMedia.filter(p => p.previewVideoPath).map(p => p.previewVideoPath!);
    
    console.log(`   Preview paths (${previewPaths.length}):`);
    previewPaths.slice(0, 3).forEach(path => console.log(`     ${path}`));
    
    if (previewVideoPaths.length > 0) {
      console.log(`   Preview video paths (${previewVideoPaths.length}):`);
      previewVideoPaths.slice(0, 3).forEach(path => console.log(`     ${path}`));
    }

    // Test API URL construction
    console.log("\n🌐 API URL Testing:");
    console.log("   Example API URLs:");
    
    if (previewPaths.length > 0) {
      const samplePath = previewPaths[0];
      console.log(`     Image: /api/media/preview/${samplePath.replace("preview/", "")}`);
    }
    
    if (previewVideoPaths.length > 0) {
      const samplePath = previewVideoPaths[0];
      console.log(`     Video: /api/media/preview/${samplePath.replace("preview/", "")}`);
    }

    console.log("\n✅ Test completed successfully!");
    
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

// Run the test
testPreviewPaths().catch(console.error); 