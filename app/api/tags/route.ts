import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getAllTags } from "@/lib/content";
import { PrismaClient } from "@/lib/generated/prisma";

const prisma = new PrismaClient();

export async function GET() {
  try {
    // Authentication check
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Role check - allow both ADMIN and USER
    if (user.userData?.role !== "ADMIN" && user.userData?.role !== "USER") {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // Fetch tags
    const tags = await getAllTags();

    return NextResponse.json(tags);
  } catch (error) {
    console.error("Tags API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch tags" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    // Authentication check
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Role check - allow both ADMIN and USER
    if (user.userData?.role !== "ADMIN" && user.userData?.role !== "USER") {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // Parse request body with validation
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    const { name, slug } = body;

    // Input validation
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Tag name is required and must be a non-empty string" },
        { status: 400 }
      );
    }

    // Validate name length
    if (name.trim().length > 50) {
      return NextResponse.json(
        { error: "Tag name must be 50 characters or less" },
        { status: 400 }
      );
    }

    // Sanitize name
    const sanitizedName = name.trim();

    // Generate slug if not provided
    const finalSlug =
      slug && typeof slug === "string" && slug.trim().length > 0
        ? slug
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9-]/g, "")
        : sanitizedName
            .toLowerCase()
            .replace(/\s+/g, "-")
            .replace(/[^a-z0-9-]/g, "");

    // Validate slug
    if (finalSlug.length === 0) {
      return NextResponse.json(
        { error: "Unable to generate a valid slug from the tag name" },
        { status: 400 }
      );
    }

    if (finalSlug.length > 50) {
      return NextResponse.json(
        { error: "Generated slug is too long" },
        { status: 400 }
      );
    }

    // Check for existing tag with same name or slug (case-insensitive)
    const existingTag = await prisma.tag.findFirst({
      where: {
        OR: [
          { name: { equals: sanitizedName, mode: "insensitive" } },
          { slug: finalSlug },
        ],
      },
    });

    if (existingTag) {
      // Return specific error message based on what matched
      const isNameMatch =
        existingTag.name.toLowerCase() === sanitizedName.toLowerCase();
      const isSlugMatch = existingTag.slug === finalSlug;

      let errorMessage = "A tag with this ";
      if (isNameMatch && isSlugMatch) {
        errorMessage += "name and slug already exists";
      } else if (isNameMatch) {
        errorMessage += "name already exists";
      } else {
        errorMessage += "slug already exists";
      }

      return NextResponse.json(
        {
          error: errorMessage,
          existingTag: {
            id: existingTag.id,
            name: existingTag.name,
            slug: existingTag.slug,
          },
        },
        { status: 409 }
      );
    }

    // Create the tag
    const newTag = await prisma.tag.create({
      data: {
        name: sanitizedName,
        slug: finalSlug,
      },
    });

    return NextResponse.json(newTag, { status: 201 });
  } catch (error) {
    console.error("Tags API POST error:", error);

    // Handle specific database errors
    if (error && typeof error === "object" && "code" in error) {
      const dbError = error as { code: string; meta?: unknown };

      if (dbError.code === "P2002") {
        // Unique constraint violation
        return NextResponse.json(
          { error: "A tag with this name or slug already exists" },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      { error: "Failed to create tag. Please try again." },
      { status: 500 }
    );
  }
}
