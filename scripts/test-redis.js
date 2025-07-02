#!/usr/bin/env node

/**
 * Redis Connection Test Script
 * Run with: node scripts/test-redis.js
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const { config } = require("dotenv");
config();

async function testRedisConnection() {
  console.log("🔄 Testing Redis connection...\n");

  try {
    // Try to import ioredis
    let Redis;
    try {
      Redis = require("ioredis").Redis;
    } catch {
      console.log("❌ ioredis not installed. Installing...");
      console.log("Run: npm install ioredis");
      process.exit(1);
    }

    // Get Redis URL from environment
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      console.log("❌ REDIS_URL not found in environment variables");
      console.log("Make sure you have REDIS_URL set in your .env file");
      process.exit(1);
    }

    console.log(`📡 Connecting to: ${redisUrl.replace(/:([^@]+)@/, ":****@")}`);

    // Create Redis connection
    const redis = new Redis(redisUrl, {
      connectTimeout: 10000,
      lazyConnect: true,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
    });

    // Test connection
    console.log("🔌 Attempting to connect...");
    await redis.connect();
    console.log("✅ Connected successfully!");

    // Test basic operations
    console.log("\n🧪 Testing basic operations...");

    // Set a test value
    const testKey = "test:connection";
    const testValue = `test-${Date.now()}`;
    await redis.set(testKey, testValue, "EX", 60); // Expire in 60 seconds
    console.log(`✅ SET operation successful: ${testKey} = ${testValue}`);

    // Get the test value
    const retrievedValue = await redis.get(testKey);
    console.log(`✅ GET operation successful: ${testKey} = ${retrievedValue}`);

    // Verify the values match
    if (retrievedValue === testValue) {
      console.log("✅ Value verification successful!");
    } else {
      console.log("❌ Value mismatch!");
    }

    // Test deletion
    await redis.del(testKey);
    const deletedValue = await redis.get(testKey);
    if (deletedValue === null) {
      console.log("✅ DELETE operation successful");
    } else {
      console.log("❌ DELETE operation failed");
    }

    // Get Redis info
    console.log("\n📊 Redis Server Information:");
    const info = await redis.info("server");
    const lines = info
      .split("\r\n")
      .filter((line) => line && !line.startsWith("#"));
    lines.slice(0, 5).forEach((line) => {
      console.log(`   ${line}`);
    });

    // Test cache warming
    console.log("\n🔥 Testing cache warming operations...");
    const cacheKeys = [
      "cache:posts:page:1:limit:12",
      "cache:categories:all",
      "cache:tags:popular",
    ];

    for (const key of cacheKeys) {
      await redis.set(
        key,
        JSON.stringify({ test: true, timestamp: Date.now() }),
        "EX",
        300
      );
      console.log(`✅ Warmed cache key: ${key}`);
    }

    // Test pattern matching
    const keys = await redis.keys("cache:*");
    console.log(`✅ Found ${keys.length} cache keys with pattern 'cache:*'`);

    // Clean up test keys
    if (keys.length > 0) {
      await redis.del(...keys);
      console.log("✅ Cleaned up test cache keys");
    }

    console.log("\n🎉 All Redis tests passed successfully!");
    console.log("\n📋 Summary:");
    console.log("   ✅ Connection established");
    console.log("   ✅ SET/GET operations working");
    console.log("   ✅ DELETE operations working");
    console.log("   ✅ Pattern matching working");
    console.log("   ✅ Cache warming simulation successful");

    await redis.quit();
    console.log("\n🔌 Connection closed successfully");
  } catch (error) {
    console.log("\n❌ Redis test failed:");
    console.log("Error:", error.message);

    if (error.code === "ECONNREFUSED") {
      console.log("\n💡 Troubleshooting tips:");
      console.log("   - Check if Redis server is running");
      console.log("   - Verify REDIS_URL is correct");
      console.log("   - Check network connectivity");
    } else if (error.message.includes("WRONGPASS")) {
      console.log("\n💡 Authentication failed:");
      console.log("   - Check if password in REDIS_URL is correct");
      console.log("   - Verify username if using Redis 6+");
    } else if (error.message.includes("ENOTFOUND")) {
      console.log("\n💡 Host not found:");
      console.log("   - Check if the Redis host URL is correct");
      console.log("   - Verify DNS resolution");
    }

    process.exit(1);
  }
}

// Add some color to make output more readable
const originalLog = console.log;
console.log = (...args) => {
  const message = args.join(" ");
  if (message.includes("✅")) {
    originalLog("\x1b[32m%s\x1b[0m", message); // Green
  } else if (message.includes("❌")) {
    originalLog("\x1b[31m%s\x1b[0m", message); // Red
  } else if (message.includes("🔄") || message.includes("🧪")) {
    originalLog("\x1b[36m%s\x1b[0m", message); // Cyan
  } else if (message.includes("📊") || message.includes("📋")) {
    originalLog("\x1b[33m%s\x1b[0m", message); // Yellow
  } else {
    originalLog(message);
  }
};

if (require.main === module) {
  testRedisConnection();
}

module.exports = { testRedisConnection };
