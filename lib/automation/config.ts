/**
 * Automation Configuration
 *
 * Configuration settings for the automated content generation system
 * following security best practices and OWASP guidelines
 */

import type { AutomationConfig } from "./types";

export const automationConfig: AutomationConfig = {
  // Get author ID from environment variable
  authorId:
    process.env.AUTOMATION_AUTHOR_ID ||
    (() => {
      throw new Error("AUTOMATION_AUTHOR_ID environment variable is required");
    })(),

  // Optional: require ADMIN role for the author
  requiredAuthorRole: "ADMIN",

  // Directory containing JSON content files
  contentDirectory: "content",

  // Logging configuration
  logging: {
    enabled: process.env.NODE_ENV !== "test",
    verbose: process.env.NODE_ENV === "development",
  },

  // Security constraints with webpack optimization
  security: {
    maxFiles: 100, // Max number of content files to process at once
    maxFileSize: 2 * 1024 * 1024, // Reduced from 5MB to 2MB to prevent large serialization
    maxPostsPerFile: 25, // Reduced from 50 to 25 to limit data size
    maxContentLength: 5000, // Reduced from 10k to 5k characters per post
    allowedFileExtensions: [".json"],
    rateLimitPerHour: 10, // Max 10 generation runs per hour
    // New limits for webpack optimization
    maxSerializationSize: 100 * 1024, // 100KB max for serialization
    maxBatchSize: 10, // Max items per batch to avoid large serialization
  },

  // Performance settings optimized for webpack
  performance: {
    batchSize: 5, // Reduced from 10 to 5 to prevent large serialization
    maxConcurrentFiles: 2, // Reduced from 3 to 2 to limit memory usage
    transactionTimeout: 30000, // 30 second transaction timeout
    // New performance settings
    chunkSize: 50, // Process data in smaller chunks
    memoryLimit: 50 * 1024 * 1024, // 50MB memory limit
  },
};
