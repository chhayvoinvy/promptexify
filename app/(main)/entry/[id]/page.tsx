import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { incrementPostView, getAllPosts, getRelatedPosts } from "@/lib/content";
import { Queries } from "@/lib/query";
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

  const headersList = await headers();
  const forwarded = headersList.get("x-forwarded-for");
  const realIp = headersList.get("x-real-ip");
  const userAgent = headersList.get("user-agent");
  const clientIp = forwarded?.split(",")[0] || realIp || "127.0.0.1";
  await incrementPostView(id, clientIp, userAgent || undefined);
  const userType = currentUser?.userData?.type || null;
  const relatedPosts = await getRelatedPosts(id, processedPost, userId, 6);

  return (
    <PostStandalonePage
      post={processedPost}
      relatedPosts={relatedPosts}
      userType={userType}
    />
  );
}
