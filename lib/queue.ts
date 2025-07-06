import { Queue } from "bullmq";
import IORedis from "ioredis";

const connection = new IORedis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
});

// Create a new queue for content automation jobs
export const contentAutomationQueue = new Queue("ContentAutomation", {
  connection,
  defaultJobOptions: {
    attempts: 3, // Retry failed jobs up to 3 times
    backoff: {
      type: "exponential",
      delay: 1000, // Start with a 1-second delay
    },
  },
});

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
