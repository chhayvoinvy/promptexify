// eslint-disable-next-line @typescript-eslint/no-explicit-any
let queue: any;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getQueue(): Promise<any> {
  if (!queue) {
    // For development, default to local Redis if REDIS_URL is not provided.
    const redisUrl =
      process.env.REDIS_URL ||
      (process.env.NODE_ENV === "development"
        ? "redis://localhost:6379"
        : undefined);

    // During `next build`, `redisUrl` will be undefined, so we use a mock queue
    // to allow the build to succeed. In a production runtime, the app will
    // expect REDIS_URL to be set.
    if (!redisUrl) {
      console.warn(
        "REDIS_URL not found. Using a mock queue for the build process. Ensure REDIS_URL is set in your runtime environment."
      );
      return {
        add: async (name: string, data: Record<string, unknown>) => {
          console.log(
            `Mock Queue: Job '${name}' would be added with data:`,
            data
          );
          return { id: `mock-job-${Math.random()}` };
        },
      };
    }

    try {
      // Dynamic imports to prevent Edge Runtime issues
      const { Queue } = await import("bullmq");
      const { default: IORedis } = await import("ioredis");

      const connection = new IORedis(redisUrl, {
        maxRetriesPerRequest: null, // Important for long-running workers
      });

      queue = new Queue("ContentAutomation", {
        connection,
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: "exponential",
            delay: 1000,
          },
        },
      });
    } catch (error) {
      console.error("Failed to initialize Redis queue:", error);
      // Return mock queue on error
      return {
        add: async (name: string, data: Record<string, unknown>) => {
          console.log(
            `Mock Queue (Error): Job '${name}' would be added with data:`,
            data
          );
          return { id: `mock-job-${Math.random()}` };
        },
      };
    }
  }
  return queue;
}

// Export the function to get the queue instance
export const getContentAutomationQueue = getQueue;

// We will define the worker logic in a separate file (e.g., worker.ts)
// For now, this file just sets up the queue.
// Example of what a worker would look like:
/*
if (process.env.RUN_WORKER) {
  const worker = new Worker('ContentAutomation', async job => {
    // Process job here
    console.log('Processing job:', job.id, job.data);
    // ... logic to download from S3, parse, and import to DB
  }, { connection });

  worker.on('completed', job => {
    console.log(`${job.id} has completed!`);
  });

  worker.on('failed', (job, err) => {
    console.log(`${job.id} has failed with ${err.message}`);
  });
}
*/
