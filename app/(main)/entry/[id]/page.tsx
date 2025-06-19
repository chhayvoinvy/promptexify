import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { incrementPostView } from "@/lib/content";
import { PostModal } from "@/components/post-modal";
import { PrismaClient } from "@/lib/generated/prisma";

const prisma = new PrismaClient();

interface PostPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function PostPage({ params }: PostPageProps) {
  // Await params to fix Next.js 15 compatibility
  const { id } = await params;

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

  return <PostModal post={post} />;
}
