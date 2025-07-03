import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import fs from "fs/promises";
import path from "path";

const CONTENT_DIR = path.join(process.cwd(), "automate", "content");

// GET - List all content files
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
    // Ensure content directory exists
    await fs.mkdir(CONTENT_DIR, { recursive: true });
    
    const files = await fs.readdir(CONTENT_DIR);
    const jsonFiles = files.filter(file => file.endsWith('.json'));
    
    const contentFiles = await Promise.all(
      jsonFiles.map(async (fileName) => {
        try {
          const filePath = path.join(CONTENT_DIR, fileName);
          const content = await fs.readFile(filePath, 'utf-8');
          const data = JSON.parse(content);
          
          return {
            name: fileName,
            ...data,
          };
        } catch (error) {
          console.error(`Error reading file ${fileName}:`, error);
          return null;
        }
      })
    );

    // Filter out failed reads
    const validFiles = contentFiles.filter(file => file !== null);

    return NextResponse.json({ files: validFiles });
  } catch (error) {
    console.error("Error listing files:", error);
    return NextResponse.json(
      { error: "Failed to list files" },
      { status: 500 }
    );
  }
}

// POST - Create new content file
export async function POST(request: NextRequest) {
  try {
    // Require admin access
    const user = await requireAdmin();
    if (!user) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }
    const body = await request.json();
    const { fileName, category, tags, posts } = body;

    if (!fileName || !category || !tags || !posts) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Ensure content directory exists
    await fs.mkdir(CONTENT_DIR, { recursive: true });
    
    const filePath = path.join(CONTENT_DIR, fileName);
    
    // Check if file already exists
    try {
      await fs.access(filePath);
      return NextResponse.json(
        { error: "File already exists" },
        { status: 409 }
      );
    } catch {
      // File doesn't exist, which is what we want
    }

    const fileContent = {
      category,
      tags,
      posts,
    };

    await fs.writeFile(filePath, JSON.stringify(fileContent, null, 2));

    return NextResponse.json({ 
      message: "File created successfully",
      fileName 
    });
  } catch (error) {
    console.error("Error creating file:", error);
    return NextResponse.json(
      { error: "Failed to create file" },
      { status: 500 }
    );
  }
}