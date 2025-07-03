import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import fs from "fs/promises";
import path from "path";

const CONTENT_DIR = path.join(process.cwd(), "automate", "content");

// PUT - Update content file
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ fileName: string }> }
) {
  try {
    // Require admin access
    const user = await requireAdmin();
    if (!user) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }
    const { fileName } = await params;
    const body = await request.json();
    const { category, tags, posts } = body;

    if (!category || !tags || !posts) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const filePath = path.join(CONTENT_DIR, fileName);
    
    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      return NextResponse.json(
        { error: "File not found" },
        { status: 404 }
      );
    }

    const fileContent = {
      category,
      tags,
      posts,
    };

    await fs.writeFile(filePath, JSON.stringify(fileContent, null, 2));

    return NextResponse.json({ 
      message: "File updated successfully",
      fileName 
    });
  } catch (error) {
    console.error("Error updating file:", error);
    return NextResponse.json(
      { error: "Failed to update file" },
      { status: 500 }
    );
  }
}

// DELETE - Delete content file
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ fileName: string }> }
) {
  try {
    // Require admin access
    const user = await requireAdmin();
    if (!user) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }
    const { fileName } = await params;
    const filePath = path.join(CONTENT_DIR, fileName);
    
    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      return NextResponse.json(
        { error: "File not found" },
        { status: 404 }
      );
    }

    await fs.unlink(filePath);

    return NextResponse.json({ 
      message: "File deleted successfully",
      fileName 
    });
  } catch (error) {
    console.error("Error deleting file:", error);
    return NextResponse.json(
      { error: "Failed to delete file" },
      { status: 500 }
    );
  }
}