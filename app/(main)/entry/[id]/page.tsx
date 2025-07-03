import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { incrementPostView, getRelatedPosts, getPostById } from "@/lib/content";
import { PostModal } from "@/components/post-modal";
import { PostStandalonePage } from "@/components/post-standalone-page";
import { getCurrentUser } from "@/lib/auth";

interface PostPageProps {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    modal?: string;
  }>;
}

// Generate static params for popular posts at build time
export async function generateStaticParams() {
  try {
    // Use the getAllPosts function for build time static generation
    const { getAllPosts } = await import("@/lib/content");
    const allPosts = await getAllPosts(false); // Only published posts

    // Filter for popular posts (featured or high view count)
    const popularPosts = allPosts
      .filter((post) => post.isFeatured || (post._count?.views || 0) >= 100)
      .slice(0, 100); // Generate static pages for top 100 posts

    return popularPosts.map((post) => ({
      id: post.id,
    }));
  } catch (error) {
    console.error("Error in generateStaticParams:", error);
    // Return empty array to avoid build failures
    return [];
  }
}

export default async function PostPage({
  params,
  searchParams,
}: PostPageProps) {
  // Await params to fix Next.js 15 compatibility
  const { id } = await params;
  const { modal } = await searchParams;

  // Use cached function instead of direct Prisma call
  const post = await getPostById(id);

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
  const userType = currentUser?.userData?.type || null;

  // If modal parameter is present, show modal (for internal navigation)
  // Otherwise, show full page (for direct URL access)
  if (modal === "true") {
    return <PostModal post={post} userType={userType} />;
  }

  // Get related posts for standalone page
  const relatedPosts = await getRelatedPosts(id, post, userId, 3);

  return (
    <PostStandalonePage
      post={post}
      relatedPosts={relatedPosts}
      userType={userType}
    />
  );
}
