import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getPostById } from "@/lib/content";
import { getPublicUrl } from "@/lib/storage";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Authentication check
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Role-based access control
    if (user.userData?.role !== "ADMIN" && user.userData?.role !== "USER") {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // Fetch post
    const post = await getPostById(id);

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Authorization check: Users can only edit their own posts that haven't been approved
    // Admins can edit any post regardless of status
    if (user.userData?.role === "USER") {
      if (post.authorId !== user.userData.id) {
        return NextResponse.json(
          { error: "You can only edit your own posts" },
          { status: 403 }
        );
      }
      // Prevent editing approved posts
      if (post.status === "APPROVED") {
        return NextResponse.json(
          {
            error:
              "Cannot edit approved posts. Once your content has been approved by an admin, it cannot be modified.",
          },
          { status: 403 }
        );
      }
    }

    const postWithPublicUrls = {
      ...post,
      featuredImage: post.featuredImage
        ? await getPublicUrl(post.featuredImage)
        : null,
      featuredVideo: post.featuredVideo
        ? await getPublicUrl(post.featuredVideo)
        : null,
      media: await Promise.all(
        (post.media || []).map(async (mediaItem) => ({
          ...mediaItem,
          url: await getPublicUrl(mediaItem.relativePath),
        }))
      ),
    };

    return NextResponse.json(postWithPublicUrls);
  } catch (error) {
    console.error("Post API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch post" },
      { status: 500 }
    );
  }
}
