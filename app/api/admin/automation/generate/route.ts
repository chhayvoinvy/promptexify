import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
    // Run the content generation using the automation service directly
    const { AutomationService } = await import("@/lib/automation/service");
    const result = await AutomationService.executeContentGeneration(user.id);

    const duration = result.duration;
    const filesProcessed = result.filesProcessed;
    const postsCreated = result.postsCreated;
    const statusMessages = result.statusMessages;

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
      output: result.output,
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
