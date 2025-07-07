import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { AutomationService } from "@/lib/automation/service";
import { convertCsvToContentFiles } from "@/lib/automation/csv-parser";
import { validateCsvStructure } from "@/lib/automation/validation";
import { SecurityMonitor, SecurityEventType } from "@/lib/monitor";
import { CSRFProtection } from "@/lib/csp";

// Explicit runtime configuration to ensure Node.js runtime
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST - Import and execute CSV content
 *
 * This endpoint allows uploading CSV files, converting them to JSON format,
 * and executing the content generation process.
 */
export async function POST(request: NextRequest) {
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

    // Get content type and validate
    const contentType = request.headers.get("content-type");
    if (!contentType || !contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        { error: "Content-Type must be multipart/form-data for file upload" },
        { status: 400 }
      );
    }

    // Parse form data
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
    }

    // Validate CSRF token (check both headers and form data)
    const csrfTokenFromHeaders = CSRFProtection.getTokenFromHeaders(request);
    const csrfTokenFromForm = CSRFProtection.getTokenFromFormData(formData);
    const csrfToken = csrfTokenFromHeaders || csrfTokenFromForm;

    const isValidCSRF = await CSRFProtection.validateToken(csrfToken);
    if (!isValidCSRF) {
      await SecurityMonitor.logSecurityEvent(
        SecurityEventType.MALICIOUS_PAYLOAD,
        {
          userId: user.id,
          context: "invalid_csrf_token",
          endpoint: "import-csv",
        },
        "high"
      );
      return NextResponse.json(
        { error: "Invalid CSRF token" },
        { status: 403 }
      );
    }

    // Remove CSRF token from form data if it exists
    if (csrfTokenFromForm) {
      formData.delete("csrf_token");
    }

    // Get CSV file from form data
    const csvFile = formData.get("file") as File;
    if (!csvFile) {
      return NextResponse.json(
        { error: "No CSV file provided" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!csvFile.name.toLowerCase().endsWith(".csv")) {
      return NextResponse.json(
        { error: "File must be a CSV file" },
        { status: 400 }
      );
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (csvFile.size > maxSize) {
      return NextResponse.json(
        {
          error: `File too large. Maximum size is ${maxSize / (1024 * 1024)}MB`,
        },
        { status: 400 }
      );
    }

    // Read CSV content
    let csvContent: string;
    try {
      csvContent = await csvFile.text();
    } catch {
      return NextResponse.json(
        { error: "Failed to read CSV file" },
        { status: 400 }
      );
    }

    // Get parsing options from form data
    const delimiter = (formData.get("delimiter") as string) || ",";
    const skipEmptyLines =
      (formData.get("skipEmptyLines") as string) !== "false";
    const maxRows = parseInt((formData.get("maxRows") as string) || "1000", 10);

    // Validate CSV structure first
    const structureValidation = validateCsvStructure(csvContent, {
      maxRows,
      requireCategory: true,
      requireTags: false,
      strictMode: false,
    });

    if (!structureValidation.success) {
      // Log security event for validation failures
      await SecurityMonitor.logSecurityEvent(
        SecurityEventType.MALICIOUS_PAYLOAD,
        {
          userId: user.id,
          fileName: csvFile.name,
          fileSize: csvFile.size,
          errors: structureValidation.errors,
          context: "csv_structure_validation",
        },
        "medium"
      );

      return NextResponse.json(
        {
          error: "CSV structure validation failed",
          details: structureValidation.errors,
          warnings: structureValidation.warnings,
        },
        { status: 400 }
      );
    }

    // Parse CSV to ContentFile format
    const parseResult = await convertCsvToContentFiles(csvContent, {
      delimiter,
      skipEmptyLines,
      maxRows,
    });

    if (!parseResult.success || !parseResult.data) {
      // Log security event for parsing failures
      await SecurityMonitor.logSecurityEvent(
        SecurityEventType.MALICIOUS_PAYLOAD,
        {
          userId: user.id,
          fileName: csvFile.name,
          fileSize: csvFile.size,
          errors: parseResult.errors,
          context: "csv_parsing_failed",
        },
        "medium"
      );

      return NextResponse.json(
        {
          error: "CSV parsing failed",
          details: parseResult.errors,
          warnings: parseResult.warnings,
        },
        { status: 400 }
      );
    }

    // Execute content generation
    const result = await AutomationService.executeFromJsonInput(
      parseResult.data,
      user.id,
      `csv-import-${csvFile.name}`
    );

    // Log successful execution
    await SecurityMonitor.logSecurityEvent(
      SecurityEventType.FILE_UPLOAD_ABUSE, // Using this as it's the closest available type
      {
        userId: user.id,
        fileName: csvFile.name,
        fileSize: csvFile.size,
        action: "csv_content_execution",
        filesProcessed: result.filesProcessed,
        postsCreated: result.postsCreated,
        duration: result.duration,
        parseWarnings: parseResult.warnings,
      },
      "low"
    );

    return NextResponse.json({
      success: true,
      message: "CSV content imported and executed successfully",
      fileName: csvFile.name,
      fileSize: csvFile.size,
      parseWarnings: parseResult.warnings,
      duration: result.duration,
      filesProcessed: result.filesProcessed,
      postsCreated: result.postsCreated,
      statusMessages: result.statusMessages,
      output: result.output,
    });
  } catch (error: unknown) {
    console.error("CSV import error:", error);

    // Log security event for execution failures
    await SecurityMonitor.logSecurityEvent(
      SecurityEventType.FILE_UPLOAD_ABUSE,
      {
        userId: user?.id,
        error: error instanceof Error ? error.message : "Unknown error",
        context: "csv_import_error",
      },
      "high"
    );

    return NextResponse.json(
      {
        success: false,
        error: "CSV import failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET - Get CSV import documentation
 *
 * Returns documentation about the expected CSV format and usage.
 */
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

    // Return documentation directly
    const documentation = getDocumentationObject();
    return NextResponse.json(documentation);
  } catch (error) {
    console.error("Documentation error:", error);
    return NextResponse.json(
      { error: "Failed to get documentation" },
      { status: 500 }
    );
  }
}

/**
 * Get documentation object - separated to avoid large string serialization
 */
function getDocumentationObject() {
  return {
    title: "CSV Content Import API",
    description: "Import content from CSV files and execute content generation",
    method: "POST",
    endpoint: "/api/admin/automation/import-csv",
    contentType: "multipart/form-data",
    authentication: "Admin role required",
    limits: {
      maxFileSize: "10MB",
      maxRows: 1000,
      allowedExtensions: [".csv"],
    },
    formFields: {
      file: {
        type: "File",
        required: true,
        description: "CSV file to import",
      },
      delimiter: {
        type: "string",
        required: false,
        default: ",",
        description: "CSV delimiter character",
      },
      skipEmptyLines: {
        type: "boolean",
        required: false,
        default: true,
        description: "Whether to skip empty lines",
      },
      maxRows: {
        type: "number",
        required: false,
        default: 1000,
        description: "Maximum number of rows to process",
      },
    },
    csvFormat: {
      requiredColumns: ["category", "title"],
      optionalColumns: [
        "tag_name",
        "tag_slug",
        "slug",
        "description",
        "content",
        "is_premium",
        "is_published",
        "status",
        "is_featured",
        "featured_image",
      ],
      columnAliases: {
        category: ["category", "cat", "category_slug"],
        title: ["title", "post_title", "name"],
        tag_name: ["tag_name", "tag", "tags", "tag_names"],
        tag_slug: ["tag_slug", "tag_slugs"],
        slug: ["slug", "post_slug", "url_slug"],
        description: ["description", "desc", "summary", "brief"],
        content: ["content", "body", "text", "full_content"],
        is_premium: ["is_premium", "premium", "paid"],
        is_published: ["is_published", "published", "public"],
        status: ["status", "post_status", "approval_status"],
        is_featured: ["is_featured", "featured", "highlight"],
        featured_image: ["featured_image", "image", "image_url", "thumbnail"],
      },
      statusValues: ["APPROVED", "PENDING_APPROVAL", "REJECTED"],
      booleanValues: [
        "true",
        "1",
        "yes",
        "y",
        "on",
        "false",
        "0",
        "no",
        "n",
        "off",
      ],
    },
    response: {
      success: "boolean",
      message: "string",
      fileName: "string",
      fileSize: "number",
      parseWarnings: "string[]",
      duration: "number (seconds)",
      filesProcessed: "number",
      postsCreated: "number",
      statusMessages: "string[]",
      output: "string",
    },
    example: {
      csvSample:
        "category,title,description,content,tag_name,is_premium,status\nai-prompts,Creative Writing Prompt,A prompt for creative writing,Write a story about...,AI;Writing,false,PENDING_APPROVAL",
    },
  };
}
