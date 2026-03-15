import { notFound, redirect } from "next/navigation";
import {
  getRelatedPosts,
  getFeaturedPostIds,
} from "@/lib/content";
import { Queries } from "@/lib/query";
import type { PostWithInteractions } from "@/lib/content";
import { PostStandalonePage } from "@/components/post-standalone-page";
import { getCurrentUser } from "@/lib/auth";
import { setMetadata } from "@/config/seo";

interface PostPageProps {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    modal?: string;
  }>;
}

export const dynamic = "force-dynamic";

// Use static metadata with template title (fallback when generateMetadata not used)
export const metadata = setMetadata({
  title: "Rule / Prompt",
  description:
    "Rules, MCP, Skills, or prompts for AI coding tools. Use with Cursor, Claude Code, and more.",
  openGraph: {
    type: "article",
    title: "Rule / Prompt - Promptexify",
    description:
      "Rules, MCP, Skills, or prompts for AI coding tools. Cursor, Claude Code, and more.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Rule / Prompt - Promptexify",
    description:
      "Rules, MCP, Skills, or prompts for AI coding tools. Cursor, Claude Code, and more.",
  },
});

export async function generateStaticParams() {
  try {
    const ids = await getFeaturedPostIds(100);
    return ids.map((id) => ({ id }));
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
