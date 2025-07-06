/**
 * Standalone BullMQ Worker
 *
 * This script should be run as a separate, long-running process
 * to handle background jobs from the contentAutomationQueue.
 *
 * To run: `node -r ts-node/register scripts/worker.ts`
 */
import { Worker } from "bullmq";
import IORedis from "ioredis";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from "stream";
import * as csv from "fast-csv";

import { AutomationService } from "@/lib/automation/service";
import type { ContentFile, PostData } from "@/lib/automation/types";

console.log("🌱 Starting Content Automation Worker...");

// Determine Redis connection URL. In development we fall back to a local
// instance so developers are not required to set a REDIS_URL environment
// variable.
const redisUrl =
  process.env.REDIS_URL ||
  (process.env.NODE_ENV === "development"
    ? "redis://localhost:6379"
    : undefined);

// In a production‐like environment a REDIS_URL _must_ be provided. Throwing
// early prevents silent fallbacks that could break background jobs.
if (!redisUrl) {
  throw new Error(
    "REDIS_URL must be provided in production runtime. Set REDIS_URL or run in development mode with a local Redis instance."
  );
}

const connection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null, // Important for long-running workers
});

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME!;

interface CsvRow {
  category: string;
  tags: string; // e.g., "tag1,tag2,tag3"
  title: string;
  slug: string;
  description: string;
  content: string;
  isPremium?: "true" | "false";
  isPublished?: "true" | "false";
  status?: "APPROVED" | "PENDING_APPROVAL" | "REJECTED";
}

// Main worker logic
const worker = new Worker(
  "ContentAutomation",
  async (job) => {
    if (job.name === "process-csv") {
      const { fileUrl, fileName, userId } = job.data;
      console.log(`🚀 Processing job ${job.id} for file: ${fileName}`);

      await job.updateProgress(5);

      // Extract S3 key from URL
      const key = new URL(fileUrl).pathname.substring(1);

      // Get file stream from S3
      const getObjectCommand = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      });
      const response = await s3Client.send(getObjectCommand);

      if (!(response.Body instanceof Readable)) {
        throw new Error("Failed to get readable stream from S3.");
      }

      const stream = response.Body;
      let records: ContentFile[] = [];
      let batch: CsvRow[] = [];
      const batchSize = 50; // Process 50 rows at a time

      return new Promise((resolve, reject) => {
        const parser = csv
          .parseStream(stream, { headers: true })
          .on("error", (error: Error) => {
            console.error(`CSV parsing error for job ${job.id}:`, error);
            reject(error);
          })
          .on("data", (row: CsvRow) => {
            batch.push(row);
            if (batch.length >= batchSize) {
              parser.pause(); // Pause stream to process batch
              const contentFiles = transformBatchToContentFiles(batch);
              records = records.concat(contentFiles);

              console.log(
                `Job ${job.id}: Processed batch of ${batch.length} rows.`
              );

              // Clear batch and resume stream
              batch = [];
              parser.resume();
            }
          })
          .on("end", async (rowCount: number) => {
            console.log(
              `✅ CSV parsing finished for job ${job.id}. Total rows: ${rowCount}`
            );
            await job.updateProgress(50);

            // Process any remaining rows in the last batch
            if (batch.length > 0) {
              const contentFiles = transformBatchToContentFiles(batch);
              records = records.concat(contentFiles);
            }

            console.log(
              `Invoking AutomationService for ${records.length} content files...`
            );

            // Use the existing automation service to process the data
            const result = await AutomationService.executeFromJsonInput(
              records,
              userId,
              `csv-worker-import-${fileName}`
            );

            await job.updateProgress(100);
            console.log(
              `🎉 Job ${job.id} completed. ${result.postsCreated} posts created.`
            );
            resolve(result);
          });
      });
    }
  },
  { connection }
);

function transformBatchToContentFiles(batch: CsvRow[]): ContentFile[] {
  // Group rows by category
  const categoryMap = new Map<string, CsvRow[]>();
  for (const row of batch) {
    if (!categoryMap.has(row.category)) {
      categoryMap.set(row.category, []);
    }
    categoryMap.get(row.category)!.push(row);
  }

  const contentFiles: ContentFile[] = [];
  for (const [category, rows] of categoryMap.entries()) {
    const posts: PostData[] = rows.map((row) => ({
      title: row.title,
      slug: row.slug,
      description: row.description,
      content: row.content,
      isPremium: row.isPremium === "true",
      isPublished: row.isPublished === "true",
      status: row.status || "PENDING_APPROVAL",
      isFeatured: false,
    }));

    // For simplicity, we'll use the tags from the first row for the whole category batch.
    // A more advanced implementation might aggregate tags.
    const tags =
      rows[0]?.tags.split(",").map((tag) => ({
        name: tag.trim(),
        slug: tag.trim().toLowerCase().replace(/\s+/g, "-"),
      })) || [];

    contentFiles.push({
      category,
      tags,
      posts,
    });
  }

  return contentFiles;
}

worker.on("completed", (job, result) => {
  console.log(`✅ Job ${job.id} completed successfully. Result:`, result);
});

worker.on("failed", (job, err) => {
  console.error(`❌ Job ${job?.id} failed with error:`, err.message);
});

console.log("Worker is listening for jobs...");
