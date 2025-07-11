import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { incrementPostView, getAllPosts, getRelatedPosts } from "@/lib/content";
import { Queries } from "@/lib/query";
import type { PostWithInteractions } from "@/lib/content";
import { PostStandalonePage } from "@/components/post-standalone-page";
import { getCurrentUser } from "@/lib/auth";
import { Crown } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface PostPageProps {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    modal?: string;
  }>;
}

export const dynamic = "force-dynamic";

export async function generateStaticParams() {
  try {
    const posts = await getAllPosts();
    const featuredPosts = posts.filter((post) => post.isFeatured).slice(0, 100);
    return featuredPosts.map((post) => ({
      id: post.id,
    }));
  } catch (error) {
    console.error("Error in generateStaticParams:", error);
    return [];
  }
}

export default async function PostPage({
  params,
  searchParams,
}: PostPageProps) {
  const { id } = await params;
  const { modal } = await searchParams;
  if (modal === "true") {
    redirect(`/entry/${id}`);
  }

  const currentUser = await getCurrentUser();
  const userId = currentUser?.userData?.id;

  const result = await Queries.posts.getById(id, userId);

  if (!result || !result.isPublished) {
    notFound();
  }

  const processedPost = result as PostWithInteractions;

  // Check premium access control
  const userType = currentUser?.userData?.type || null;
  const userRole = currentUser?.userData?.role || null;
  
  // If this is premium content, check user access
  if (processedPost.isPremium) {
    const isUserFree = userType === "FREE" || userType === null;
    const isAdmin = userRole === "ADMIN";
    
    // Only allow access for premium users and admins
    if (isUserFree && !isAdmin) {
      redirect("/pricing");
    }
  }

  const headersList = await headers();
  const forwarded = headersList.get("x-forwarded-for");
  const realIp = headersList.get("x-real-ip");
  const userAgent = headersList.get("user-agent");
  const clientIp = forwarded?.split(",")[0] || realIp || "127.0.0.1";
  await incrementPostView(id, clientIp, userAgent || undefined);
  const relatedPosts = await getRelatedPosts(id, processedPost, userId, 6);

  return (
    <>
      {processedPost.isPremium && (userType === "FREE" || userType === null) ? (
        <div className="flex flex-col items-center justify-center min-h-[50vh]">
          <Crown className="w-12 h-12 text-amber-500 mb-4" />
          <h1 className="text-2xl font-bold mb-2">Premium Content</h1>
          <p className="text-muted-foreground mb-6 text-center max-w-md">
            This content requires a Premium subscription to access. 
            Upgrade now to unlock exclusive AI prompts and advanced features.
          </p>
          <Link href="/pricing">
            <Button size="lg" className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white">
              <Crown className="w-4 h-4 mr-2" />
              Upgrade to Premium
            </Button>
          </Link>
        </div>
      ) : (
        <PostStandalonePage
          post={processedPost}
          relatedPosts={relatedPosts}
          userType={userType}
        />
      )}
    </>
  );
}