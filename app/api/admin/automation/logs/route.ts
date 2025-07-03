import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET - Retrieve generation logs from database
export async function GET() {
  try {
    // Require admin access
    const user = await requireAdmin();
    if (!user) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    // Fetch automation logs from database
    const dbLogs = await prisma.log.findMany({
      where: {
        action: "automation",
        entityType: "content_generation",
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 50, // Limit to last 50 logs
    });

    // Transform database logs to match the expected format
    const logs = dbLogs.map((log) => {
      // Safely extract metadata with proper type checking
      const metadata =
        log.metadata &&
        typeof log.metadata === "object" &&
        !Array.isArray(log.metadata)
          ? (log.metadata as Record<string, unknown>)
          : {};

      return {
        id: log.id,
        timestamp: log.createdAt.toISOString(),
        status:
          typeof metadata.status === "string" ? metadata.status : "unknown",
        message:
          typeof metadata.message === "string"
            ? metadata.message
            : "No message",
        filesProcessed:
          typeof metadata.filesProcessed === "number"
            ? metadata.filesProcessed
            : 0,
        postsCreated:
          typeof metadata.postsCreated === "number" ? metadata.postsCreated : 0,
        statusMessages: Array.isArray(metadata.statusMessages)
          ? metadata.statusMessages
          : [],
        error: typeof metadata.error === "string" ? metadata.error : undefined,
        userId: log.userId,
        severity: log.severity,
      };
    });

    return NextResponse.json({ logs });
  } catch (error) {
    console.error("Error reading logs:", error);
    return NextResponse.json({ error: "Failed to read logs" }, { status: 500 });
  }
}
