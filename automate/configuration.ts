// Configuration for automated content seeding

export interface SeedConfig {
  authorId: string;
  contentDirectory: string;

  logging: {
    enabled: boolean;
    verbose: boolean;
  };
  // Security constraints
  security: {
    maxFileSize: number; // bytes
    maxPostsPerFile: number;
    maxContentLength: number; // characters
    allowedFileExtensions: string[];
    rateLimitPerHour: number;
  };
  // Performance settings
  performance: {
    batchSize: number;
    maxConcurrentFiles: number;
    transactionTimeout: number; // ms
  };
}

export const seedConfig: SeedConfig = {
  // Get author ID from environment variable
  authorId:
    process.env.AUTOMATION_AUTHOR_ID ||
    (() => {
      throw new Error("AUTOMATION_AUTHOR_ID environment variable is required");
    })(),

  // Directory containing JSON content files
  contentDirectory: "automate/seeds",



  // Logging configuration
  logging: {
    enabled: process.env.NODE_ENV !== "test",
    verbose: process.env.NODE_ENV === "development",
  },

  // Security constraints
  security: {
    maxFileSize: 5 * 1024 * 1024, // 5MB
    maxPostsPerFile: 50,
    maxContentLength: 10000, // 10k characters per post
    allowedFileExtensions: [".json"],
    rateLimitPerHour: 10, // Max 10 generation runs per hour
  },

  // Performance settings
  performance: {
    batchSize: 10, // Process posts in batches of 10
    maxConcurrentFiles: 3, // Process max 3 files concurrently
    transactionTimeout: 30000, // 30 second transaction timeout
  },
};
