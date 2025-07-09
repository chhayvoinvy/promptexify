/**
 * CSV Parser for Automation System
 *
 * Converts CSV data to the expected JSON format for content generation
 * Follows secure coding practices and OWASP guidelines
 */

import { ContentFile, TagData, PostData } from "./types";
import { sanitizeContent } from "./validation";
import { SecurityMonitor, SecurityEventType } from "@/lib/monitor";

/**
 * CSV format interfaces
 */
interface CsvRow {
  [key: string]: string;
}

interface CsvParseResult {
  success: boolean;
  data?: ContentFile[];
  errors: string[];
  warnings: string[];
}

/**
 * Expected CSV column names (case-insensitive)
 */
const EXPECTED_COLUMNS = {
  CATEGORY: ["category", "cat", "category_slug"],
  TAG_NAME: ["tag_name", "tag", "tags", "tag_names"],
  TAG_SLUG: ["tag_slug", "tag_slugs"],
  TITLE: ["title", "post_title", "name"],
  SLUG: ["slug", "post_slug", "url_slug"],
  DESCRIPTION: ["description", "desc", "summary", "brief"],
  CONTENT: ["content", "body", "text", "full_content"],
  IS_PREMIUM: ["is_premium", "premium", "paid"],
  IS_PUBLISHED: ["is_published", "published", "public"],
  STATUS: ["status", "post_status", "approval_status"],
  IS_FEATURED: ["is_featured", "featured", "highlight"],
  FEATURED_IMAGE: ["featured_image", "image", "image_url", "thumbnail"],
  FEATURED_VIDEO: ["featured_video", "video", "video_url"],
};

/**
 * CSV Parser class
 */
export class CsvParser {
  /**
   * Parses CSV string into ContentFile format
   */
  static async parseCsvToContentFiles(
    csvContent: string,
    options: {
      delimiter?: string;
      skipEmptyLines?: boolean;
      maxRows?: number;
    } = {}
  ): Promise<CsvParseResult> {
    const { delimiter = ",", skipEmptyLines = true, maxRows = 1000 } = options;

    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Use Buffer to avoid webpack serialization warnings for large CSV content
      const csvBuffer = Buffer.from(csvContent);
      const csvSize = csvBuffer.length;

      // Security check: validate CSV size
      if (csvSize > 10 * 1024 * 1024) {
        // 10MB limit
        return {
          success: false,
          errors: ["CSV file too large (max 10MB)"],
          warnings,
        };
      }

      // Process CSV content from buffer
      const processedCsvContent = csvBuffer.toString();

      // Optimize for webpack by avoiding large string serialization
      // Process CSV in chunks to reduce memory usage
      const processedResult = await this.processCSVInChunks(
        processedCsvContent,
        {
          delimiter,
          skipEmptyLines,
          maxRows,
        }
      );

      if (!processedResult.success) {
        return {
          success: false,
          errors: processedResult.errors,
          warnings: processedResult.warnings,
        };
      }

      const rows = processedResult.rows;

      // Extract headers and validate
      const headers = Object.keys(rows[0] || {});
      const columnMapping = this.mapColumns(headers);

      if (!columnMapping.category || !columnMapping.title) {
        return {
          success: false,
          errors: [
            "Required columns missing: category and title are mandatory",
          ],
          warnings,
        };
      }

      // Group rows by category
      const categoryGroups = this.groupByCategory(rows, columnMapping);

      // Convert to ContentFile format
      const contentFiles: ContentFile[] = [];

      for (const [category, categoryRows] of Object.entries(categoryGroups)) {
        try {
          const contentFile = await this.convertCategoryToContentFile(
            category,
            categoryRows,
            columnMapping
          );

          if (contentFile) {
            contentFiles.push(contentFile);
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          errors.push(
            `Error processing category "${category}": ${errorMessage}`
          );

          await SecurityMonitor.logSecurityEvent(
            SecurityEventType.MALICIOUS_PAYLOAD,
            { category, error: errorMessage, context: "csv_parsing" },
            "medium"
          );
        }
      }

      if (contentFiles.length === 0) {
        return {
          success: false,
          errors: ["No valid content files generated from CSV"],
          warnings,
        };
      }

      return {
        success: true,
        data: contentFiles,
        errors,
        warnings,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      errors.push(`CSV parsing failed: ${errorMessage}`);

      await SecurityMonitor.logSecurityEvent(
        SecurityEventType.MALICIOUS_PAYLOAD,
        { error: errorMessage, context: "csv_parsing" },
        "high"
      );

      return {
        success: false,
        errors,
        warnings,
      };
    }
  }

  /**
   * Process CSV in chunks to reduce memory usage and avoid webpack serialization issues
   */
  private static async processCSVInChunks(
    csvContent: string,
    options: {
      delimiter: string;
      skipEmptyLines: boolean;
      maxRows: number;
    }
  ): Promise<{
    success: boolean;
    rows: CsvRow[];
    errors: string[];
    warnings: string[];
  }> {
    const { delimiter, skipEmptyLines, maxRows } = options;
    const lines = csvContent.split("\n");
    const errors: string[] = [];
    const warnings: string[] = [];

    if (lines.length === 0) {
      return {
        success: false,
        rows: [],
        errors: ["No data found in CSV"],
        warnings,
      };
    }

    // Process headers
    const headers = lines[0]
      .split(delimiter)
      .map((h) => h.trim().replace(/"/g, ""));

    if (headers.length === 0) {
      return {
        success: false,
        rows: [],
        errors: ["Invalid CSV headers"],
        warnings,
      };
    }

    // Process data rows in chunks to avoid large memory usage
    const chunkSize = 100; // Process 100 rows at a time
    const rows: CsvRow[] = [];
    let processedCount = 0;

    for (
      let i = 1;
      i < lines.length && processedCount < maxRows;
      i += chunkSize
    ) {
      const chunk = lines.slice(i, Math.min(i + chunkSize, lines.length));

      for (const line of chunk) {
        if (processedCount >= maxRows) break;

        const trimmedLine = line.trim();
        if (skipEmptyLines && !trimmedLine) continue;

        const values = this.parseCSVLine(trimmedLine, delimiter);
        if (values.length !== headers.length) {
          warnings.push(
            `Row ${i + 1} has ${values.length} columns, expected ${headers.length}`
          );
          continue;
        }

        const row: CsvRow = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || "";
        });

        rows.push(row);
        processedCount++;
      }
    }

    if (processedCount === maxRows && lines.length > maxRows + 1) {
      warnings.push(
        `CSV contains ${lines.length - 1} rows, limited to ${maxRows}`
      );
    }

    return {
      success: true,
      rows,
      errors,
      warnings,
    };
  }

  /**
   * Parses CSV content into rows
   */
  private static parseCSV(
    csvContent: string,
    delimiter: string,
    skipEmptyLines: boolean
  ): CsvRow[] {
    const lines = csvContent.split("\n");
    if (lines.length === 0) return [];

    // Extract headers
    const headers = lines[0]
      .split(delimiter)
      .map((h) => h.trim().replace(/"/g, ""));

    const rows: CsvRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();

      if (skipEmptyLines && !line) continue;

      const values = this.parseCSVLine(line, delimiter);

      if (values.length !== headers.length) {
        console.warn(
          `Row ${i + 1} has ${values.length} columns, expected ${headers.length}`
        );
        continue;
      }

      const row: CsvRow = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || "";
      });

      rows.push(row);
    }

    return rows;
  }

  /**
   * Parses a single CSV line handling quoted values
   */
  private static parseCSVLine(line: string, delimiter: string): string[] {
    const values: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === delimiter && !inQuotes) {
        values.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }

    values.push(current.trim());
    return values;
  }

  /**
   * Maps CSV columns to expected fields
   */
  private static mapColumns(headers: string[]): Record<string, string> {
    const mapping: Record<string, string> = {};

    for (const header of headers) {
      const normalizedHeader = header.toLowerCase().trim();

      // Check each expected column type
      for (const [fieldName, variants] of Object.entries(EXPECTED_COLUMNS)) {
        if (variants.includes(normalizedHeader)) {
          mapping[fieldName.toLowerCase()] = header;
          break;
        }
      }
    }

    return mapping;
  }

  /**
   * Groups rows by category
   */
  private static groupByCategory(
    rows: CsvRow[],
    columnMapping: Record<string, string>
  ): Record<string, CsvRow[]> {
    const groups: Record<string, CsvRow[]> = {};

    for (const row of rows) {
      const category = row[columnMapping.category]?.trim();

      if (!category) continue;

      if (!groups[category]) {
        groups[category] = [];
      }

      groups[category].push(row);
    }

    return groups;
  }

  /**
   * Converts category rows to ContentFile format
   */
  private static async convertCategoryToContentFile(
    category: string,
    rows: CsvRow[],
    columnMapping: Record<string, string>
  ): Promise<ContentFile | null> {
    if (rows.length === 0) {
      return null;
    }

    // Extract unique tags from all rows in the category
    const uniqueTags = new Map<string, TagData>();
    rows.forEach((row) => {
      const tagNames = row[columnMapping.tag_name]?.split(",") || [];
      const tagSlugs = row[columnMapping.tag_slug]?.split(",") || [];

      tagNames.forEach((name, index) => {
        const slug = tagSlugs[index] || this.generateSlug(name);
        if (name && slug && !uniqueTags.has(slug)) {
          uniqueTags.set(slug, {
            name: name.trim(),
            slug: slug.trim(),
          });
        }
      });
    });

    const tags = await Promise.all(
      Array.from(uniqueTags.values()).map(async (tag) => ({
        name: await sanitizeContent(tag.name),
        slug: await sanitizeContent(tag.slug),
      }))
    );

    // Create posts
    const posts = await Promise.all(
      rows.map(async (row): Promise<PostData> => {
        const title = row[columnMapping.title]?.trim() || "";
        const uploadPath = row[columnMapping.featured_image]?.trim();
        
        // Determine upload file type based on path extension
        let uploadFileType: "IMAGE" | "VIDEO" | undefined;
        if (uploadPath) {
          const extension = uploadPath.split('.').pop()?.toLowerCase();
          if (['jpg', 'jpeg', 'png', 'webp', 'avif', 'gif'].includes(extension || '')) {
            uploadFileType = 'IMAGE';
          } else if (['mp4', 'webm', 'mov', 'avi'].includes(extension || '')) {
            uploadFileType = 'VIDEO';
          }
        }
        
        return {
          title: await sanitizeContent(title),
          slug: row[columnMapping.slug]?.trim() || this.generateSlug(title),
          description: await sanitizeContent(
            row[columnMapping.description]?.trim() || ""
          ),
          content: await sanitizeContent(
            row[columnMapping.content]?.trim() || ""
          ),
          isPremium: this.parseBoolean(row[columnMapping.is_premium]),
          isPublished: this.parseBoolean(row[columnMapping.is_published]),
          status: this.parseStatus(row[columnMapping.status]),
          isFeatured: this.parseBoolean(row[columnMapping.is_featured]),
          uploadPath,
          uploadFileType,
        };
      })
    );

    return {
      category: await sanitizeContent(category),
      tags,
      posts,
    };
  }

  /**
   * Parses boolean values from CSV
   */
  private static parseBoolean(value: string | undefined): boolean {
    if (!value) return false;

    const normalized = value.toLowerCase().trim();
    return ["true", "1", "yes", "y", "on"].includes(normalized);
  }

  /**
   * Parses status values from CSV
   */
  private static parseStatus(
    value: string | undefined
  ): "APPROVED" | "PENDING_APPROVAL" | "REJECTED" {
    if (!value) return "PENDING_APPROVAL";

    const normalized = value.toLowerCase().trim();

    switch (normalized) {
      case "approved":
      case "approve":
      case "published":
      case "publish":
      case "live":
        return "APPROVED";
      case "rejected":
      case "reject":
      case "denied":
        return "REJECTED";
      default:
        return "PENDING_APPROVAL";
    }
  }

  /**
   * Generates slug from text
   */
  private static generateSlug(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .substring(0, 50);
  }
}

/**
 * Utility function to convert CSV file to content files
 */
export async function convertCsvToContentFiles(
  csvContent: string,
  options?: {
    delimiter?: string;
    skipEmptyLines?: boolean;
    maxRows?: number;
  }
): Promise<CsvParseResult> {
  return CsvParser.parseCsvToContentFiles(csvContent, options);
}
