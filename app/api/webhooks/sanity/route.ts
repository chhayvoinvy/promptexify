import { NextRequest, NextResponse } from "next/server";
import { revalidateTag, revalidatePath } from "next/cache";
import { headers } from "next/headers";
import crypto from "crypto";

// Types for Sanity webhook payload
interface SanityWebhookPayload {
  _type: "webhook";
  _id: string;
  _createdAt: string;
  _updatedAt: string;
  projectId: string;
  dataset: string;
  mutations: Array<{
    create?: {
      _id: string;
      _type: string;
      [key: string]: unknown;
    };
    createOrReplace?: {
      _id: string;
      _type: string;
      [key: string]: unknown;
    };
    patch?: {
      id: string;
      [key: string]: unknown;
    };
    delete?: {
      id: string;
    };
  }>;
}

// Webhook security validation
function validateWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  try {
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");

    // Compare signatures using timing-safe comparison
    return crypto.timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(expectedSignature, "hex")
    );
  } catch (error) {
    console.error("Webhook signature validation error:", error);
    return false;
  }
}

// Helper function to get revalidation tags for document types
function getRevalidationTags(
  documentType: string,
  documentId?: string,
  slug?: string
) {
  const tags = ["sanity:all", `sanity:${documentType}`];

  if (documentId) {
    tags.push(`sanity:${documentType}:${documentId}`);
  }

  if (slug) {
    tags.push(`sanity:${documentType}:slug:${slug}`);
  }

  return tags;
}

// Helper function to get revalidation paths for document types
function getRevalidationPaths(documentType: string, slug?: string) {
  const paths: string[] = [];

  switch (documentType) {
    case "page":
      paths.push("/");
      if (slug) {
        paths.push(`/${slug}`);
      }
      break;

    case "helpArticle":
      paths.push("/help");
      if (slug) {
        paths.push(`/help/${slug}`);
      }
      break;

    case "author":
      // Revalidate all content when author is updated
      paths.push("/");
      paths.push("/help");
      break;

    default:
      // For unknown types, revalidate home page
      paths.push("/");
  }

  return paths;
}

export async function POST(request: NextRequest) {
  try {
    // Security: Verify webhook secret
    const webhookSecret = process.env.SANITY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error("SANITY_WEBHOOK_SECRET is not configured");
      return NextResponse.json(
        { error: "Webhook secret not configured" },
        { status: 500 }
      );
    }

    // Get the signature from headers
    const headersList = await headers();
    const signature = headersList.get("sanity-webhook-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "Missing webhook signature" },
        { status: 401 }
      );
    }

    // Get the raw payload
    const payload = await request.text();

    // Validate webhook signature
    if (!validateWebhookSignature(payload, signature, webhookSecret)) {
      console.error("Invalid webhook signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // Parse the payload
    let webhookData: SanityWebhookPayload;
    try {
      webhookData = JSON.parse(payload);
    } catch (error) {
      console.error("Invalid JSON payload:", error);
      return NextResponse.json(
        { error: "Invalid JSON payload" },
        { status: 400 }
      );
    }

    // Process mutations
    const revalidatedTags = new Set<string>();
    const revalidatedPaths = new Set<string>();

    for (const mutation of webhookData.mutations) {
      let documentType: string | undefined;
      let documentId: string | undefined;
      let slug: string | undefined;

      // Extract document info from mutation
      if (mutation.create) {
        documentType = mutation.create._type;
        documentId = mutation.create._id;
        const slugData = (mutation.create as Record<string, unknown>)?.slug as
          | { current?: string }
          | undefined;
        slug = slugData?.current;
      } else if (mutation.createOrReplace) {
        documentType = mutation.createOrReplace._type;
        documentId = mutation.createOrReplace._id;
        const slugData = (mutation.createOrReplace as Record<string, unknown>)
          ?.slug as { current?: string } | undefined;
        slug = slugData?.current;
      } else if (mutation.patch) {
        documentId = mutation.patch.id;
        // For patches, we might not have the document type directly
        // We'll use a generic revalidation approach
      } else if (mutation.delete) {
        documentId = mutation.delete.id;
        // For deletes, we'll revalidate everything to be safe
      }

      // Generate revalidation tags
      if (documentType) {
        const tags = getRevalidationTags(documentType, documentId, slug);
        tags.forEach((tag) => revalidatedTags.add(tag));

        // Generate revalidation paths
        const paths = getRevalidationPaths(documentType, slug);
        paths.forEach((path) => revalidatedPaths.add(path));
      } else if (documentId) {
        // If we don't know the type, revalidate by ID pattern
        revalidatedTags.add(`sanity:*:${documentId}`);
        revalidatedPaths.add("/");
      }
    }

    // Execute revalidations
    const revalidationPromises: Promise<void>[] = [];

    // Revalidate by tags
    for (const tag of revalidatedTags) {
      revalidationPromises.push(
        Promise.resolve().then(() => revalidateTag(tag))
      );
    }

    // Revalidate by paths
    for (const path of revalidatedPaths) {
      revalidationPromises.push(
        Promise.resolve().then(() => revalidatePath(path))
      );
    }

    // Wait for all revalidations to complete
    await Promise.allSettled(revalidationPromises);

    console.log(
      `Revalidated ${revalidatedTags.size} tags and ${revalidatedPaths.size} paths`
    );

    return NextResponse.json({
      success: true,
      revalidated: {
        tags: Array.from(revalidatedTags),
        paths: Array.from(revalidatedPaths),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: "healthy",
    service: "sanity-webhook",
    timestamp: new Date().toISOString(),
  });
}
