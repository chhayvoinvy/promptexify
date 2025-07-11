import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { CSRFProtection } from "@/lib/security/csp";
import { SecurityMonitor, SecurityEventType } from "@/lib/security/monitor";
import { getContentAutomationQueue } from "@/lib/queue";
import { z } from "zod";

// Explicit runtime configuration to ensure Node.js runtime
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST - Start a background job to process an uploaded file
 *
 * This endpoint takes the URL of a file uploaded to S3, adds it to a
 * processing queue, and returns a job ID for status tracking.
 */
export async function POST(request: NextRequest) {
  let user = null;
  try {
    user = await requireAdmin();
    if (!user) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const csrfToken = CSRFProtection.getTokenFromHeaders(request);
    const isValidCSRF = await CSRFProtection.validateToken(csrfToken);
    if (!isValidCSRF) {
      await SecurityMonitor.logSecurityEvent(
        SecurityEventType.MALICIOUS_PAYLOAD,
        {
          userId: user.id,
          context: "invalid_csrf_token",
          endpoint: "start-processing",
        },
        "high"
      );
      return NextResponse.json(
        { error: "Invalid CSRF token" },
        { status: 403 }
      );
    }

    const payloadSchema = z.object({
      fileUrl: z.string().url(),
      fileName: z.string().min(1).max(255),
      delimiter: z.string().min(1).max(5).default(","),
      skipEmptyLines: z.boolean().default(true),
      maxRows: z.number().int().positive().max(10000).default(5000),
    });

    const parsed = payloadSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          details: parsed.error.errors.map((e) => ({
            field: e.path.join("."),
            message: e.message,
          })),
        },
        { status: 400 }
      );
    }

    const payload = parsed.data;

    // Get the queue instance and add job
    const queue = await getContentAutomationQueue();
    const job = await queue.add("process-csv", {
      ...payload,
      userId: user.id,
    });

    if (!job.id) {
      throw new Error("Failed to create a job in the queue.");
    }

    // Log the job creation
    await SecurityMonitor.logSecurityEvent(
      SecurityEventType.FILE_UPLOAD_ABUSE,
      {
        userId: user.id,
        jobId: job.id,
        fileName: payload.fileName,
        fileUrl: payload.fileUrl,
        context: "job_creation_successful",
      },
      "low"
    );

    return NextResponse.json({
      success: true,
      jobId: job.id,
      message: `Job ${job.id} created for file ${payload.fileName}`,
    });
  } catch (error) {
    console.error("Failed to start processing job:", error);
    await SecurityMonitor.logSecurityEvent(
      SecurityEventType.INTERNAL_SERVER_ERROR,
      {
        userId: user?.id,
        error: error instanceof Error ? error.message : "Unknown error",
        context: "start_processing_error",
      },
      "high"
    );
    return NextResponse.json(
      {
        success: false,
        error: "Failed to start processing job.",
      },
      { status: 500 }
    );
  }
}
