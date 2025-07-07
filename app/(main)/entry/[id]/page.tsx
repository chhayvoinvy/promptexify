import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { incrementPostView, getAllPosts, getRelatedPosts } from "@/lib/content";
import { OptimizedQueries } from "@/lib/query";
import type { PostWithInteractions } from "@/lib/content";
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

// Enable ISR with revalidation every 5 minutes
export const dynamic = "force-dynamic";

// Generate static params for popular posts at build time
export async function generateStaticParams() {
  try {
    // Get featured and popular posts for static generation
    const posts = await getAllPosts();

    // Filter for featured posts and limit to 100
    const featuredPosts = posts.filter((post) => post.isFeatured).slice(0, 100);

    return featuredPosts.map((post) => ({
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

  // If modal parameter is present, redirect to clean URL
  if (modal === "true") {
    redirect(`/entry/${id}`);
  }

  // Get post content with user interactions
  const currentUser = await getCurrentUser();
  const userId = currentUser?.userData?.id;

  const processedPost = (await OptimizedQueries.posts.getById(
    id,
    userId
  )) as PostWithInteractions | null;

  if (!processedPost || !processedPost.isPublished) {
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

  // userType derived from earlier currentUser fetch
  const userType = currentUser?.userData?.type || null;

  // Get related posts
  const relatedPosts = await getRelatedPosts(id, processedPost, userId, 6);

  // For standalone page, use the PostStandalonePage component
  return (
    <PostStandalonePage
      post={processedPost}
      relatedPosts={relatedPosts}
      userType={userType}
    />
  );
}
