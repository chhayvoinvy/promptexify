import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { incrementPostView, getRelatedPosts } from "@/lib/content";
import { PostModal } from "@/components/post-modal";
import { PrismaClient } from "@/lib/generated/prisma";
import { PostStandalonePage } from "@/components/post-standalone-page";
import { getCurrentUser } from "@/lib/auth";

const prisma = new PrismaClient();

interface PostPageProps {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    modal?: string;
  }>;
}

export default async function PostPage({
  params,
  searchParams,
}: PostPageProps) {
  // Await params to fix Next.js 15 compatibility
  const { id } = await params;
  const { modal } = await searchParams;

  // Find post by ID
  const post = await prisma.post.findUnique({
    where: { id },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
        },
      },
      category: {
        include: {
          parent: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      },
      tags: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      _count: {
        select: {
          views: true,
        },
      },
    },
  });

  if (!post || !post.isPublished) {
    notFound();
  }

  // Track the view
  const headersList = await headers();
  const forwarded = headersList.get("x-forwarded-for");
  const realIp = headersList.get("x-real-ip");
  const userAgent = headersList.get("user-agent");

  // Get the client IP
  const clientIp = forwarded?.split(",")[0] || realIp || "127.0.0.1";

  // Increment view count
  await incrementPostView(id, clientIp, userAgent || undefined);

  // Get current user for bookmarks/favorites
  const currentUser = await getCurrentUser();
  const userId = currentUser?.userData?.id;

  // If modal parameter is present, show modal (for internal navigation)
  // Otherwise, show full page (for direct URL access)
  if (modal === "true") {
    return <PostModal post={post} />;
  }

  // Get related posts for standalone page
  const relatedPosts = await getRelatedPosts(id, post, userId, 3);

  return <PostStandalonePage post={post} relatedPosts={relatedPosts} />;
}
