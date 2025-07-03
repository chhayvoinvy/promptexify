import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { exec } from "child_process";
import { promisify } from "util";
import { prisma } from "@/lib/prisma";

const execAsync = promisify(exec);

// Save generation log to database
async function saveLog(log: {
  status: "success" | "error";
  message: string;
  filesProcessed?: number;
  postsCreated?: number;
  statusMessages?: string[];
  error?: string;
  userId?: string;
}) {
  try {
    await prisma.log.create({
      data: {
        action: "automation",
        userId: log.userId,
        entityType: "content_generation",
        entityId: null,
        ipAddress: null,
        userAgent: null,
        metadata: {
          status: log.status,
          message: log.message,
          filesProcessed: log.filesProcessed,
          postsCreated: log.postsCreated,
          statusMessages: log.statusMessages,
          error: log.error,
        },
        severity: log.status === "error" ? "ERROR" : "INFO",
      },
    });
  } catch (error) {
    console.error("Error saving log:", error);
  }
}

// POST - Run content generation
export async function POST() {
  let user = null;

  try {
    // Require admin access
    user = await requireAdmin();
    if (!user) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }
    const startTime = Date.now();

    // Run the content generation script
    const { stdout } = await execAsync("npm run content:generate", {
      cwd: process.cwd(),
      timeout: 60000, // 60 second timeout
    });

    const endTime = Date.now();
    const duration = Math.round((endTime - startTime) / 1000);

    // Parse output to extract statistics and status messages
    let filesProcessed = 0;
    let postsCreated = 0;
    const statusMessages: string[] = [];

    // Look for patterns in the output to extract stats and status
    const outputLines = stdout.split("\n");
    for (const line of outputLines) {
      // Count files processed
      if (line.includes("📄 Processing") || line.includes("Processing file:")) {
        filesProcessed++;
        statusMessages.push(line.trim());
      }
      // Count posts created
      if (
        line.includes("✅ Created post:") ||
        line.includes("✓ Created post")
      ) {
        postsCreated++;
        statusMessages.push(line.trim());
      }
      // Capture other important status messages
      if (
        line.includes("🌱 Starting") ||
        line.includes("📁 Found") ||
        line.includes("🏷️") ||
        line.includes("📝 Creating") ||
        line.includes("✅ Completed") ||
        line.includes("🎉 Automated content seeding completed")
      ) {
        statusMessages.push(line.trim());
      }
    }

    // Save success log
    await saveLog({
      status: "success",
      message: `Content generation completed in ${duration}s`,
      filesProcessed,
      postsCreated,
      statusMessages,
      userId: user.id,
    });

    return NextResponse.json({
      message: "Content generation completed successfully",
      duration,
      filesProcessed,
      postsCreated,
      statusMessages,
      output: stdout,
    });
  } catch (error: unknown) {
    console.error("Content generation error:", error);

    // Save error log
    await saveLog({
      status: "error",
      message: "Content generation failed",
      error: error instanceof Error ? error.message : "Unknown error",
      userId: user?.id,
    });

    return NextResponse.json(
      {
        error: "Content generation failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
