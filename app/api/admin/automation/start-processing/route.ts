import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { CSRFProtection } from "@/lib/security";
import { SecurityMonitor, SecurityEventType } from "@/lib/security-monitor";
import { contentAutomationQueue } from "@/lib/queue";

interface StartProcessingPayload {
  fileUrl: string;
  fileName: string;
  delimiter: string;
  skipEmptyLines: boolean;
  maxRows: number;
}

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

    const payload = (await request.json()) as StartProcessingPayload;

    if (!payload.fileUrl || !payload.fileName) {
      return NextResponse.json(
        { error: "fileUrl and fileName are required" },
        { status: 400 }
      );
    }

    // Add job to the queue
    const job = await contentAutomationQueue.add("process-csv", {
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
