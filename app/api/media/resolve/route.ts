import { NextRequest, NextResponse } from "next/server";
import { resolveMediaUrl, resolveMediaUrls } from "@/lib/path";
import { z } from "zod";

export async function POST(request: NextRequest) {
  try {
    const bodySchema = z.object({
      paths: z.array(z.string().min(1)).nonempty("paths array required"),
    });

    const parsed = bodySchema.safeParse(await request.json());
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

    const { paths } = parsed.data;

    // Handle single path
    if (paths.length === 1) {
      const resolvedUrl = await resolveMediaUrl(paths[0]);
      return NextResponse.json({ url: resolvedUrl });
    }

    // Handle multiple paths
    const resolvedUrls = await resolveMediaUrls(paths);
    return NextResponse.json({ urls: resolvedUrls });
  } catch (error) {
    console.error("Error resolving media URLs:", error);
    return NextResponse.json(
      { error: "Failed to resolve media URLs" },
      { status: 500 }
    );
  }
}
