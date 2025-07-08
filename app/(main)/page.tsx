import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getPostsWithSorting } from "@/lib/content";
import { getCurrentUser } from "@/lib/auth";
import { Suspense } from "react";
import { PostMasonryGrid } from "@/components/post-masonry-grid";
import { PostMasonrySkeleton } from "@/components/post-masonry-skeleton";
import { HeroSection } from "@/components/hero-section";
import Testimonials from "@/components/testimonials";
import { BentoGrid } from "@/components/bento-grid";
import { CtaSection } from "@/components/cta-section";
import { Container } from "@/components/ui/container";

// Route segment config for better caching
export const revalidate = 300; // Revalidate every 5 minutes (matches CACHE_DURATIONS.POSTS_LIST)

async function PostGrid() {
  // Get current user to determine bookmark status
  const currentUser = await getCurrentUser();
  const userId = currentUser?.userData?.id;
  const userType = currentUser?.userData?.type || null;

  const posts = await getPostsWithSorting(userId, "latest");

  // Filter for featured posts first and show latest 12
  const featuredPosts = posts.filter((post) => post.isFeatured).slice(0, 12);

  return <PostMasonryGrid posts={featuredPosts} userType={userType} />;
}

export default async function HomePage() {
  return (
    <Container className="min-h-screen bg-background space-y-10 flex flex-col justify-center">
      {/* Hero Section */}
      <HeroSection />

      {/* Posts Section */}
      <section className="pb-12">
        <div className="mb-8 text-center">
          <h2 className="text-2xl md:text-3xl font-semibold mb-2">
            Featured Prompts
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Discover our hand-picked collection of the best prompts, carefully
            curated by our team
          </p>
        </div>

        <Suspense fallback={<PostMasonrySkeleton />}>
          <PostGrid />
        </Suspense>

        <div className="text-center mt-12">
          <Link href="/directory">
            <Button size="lg" variant="outline">
              Browse All Prompts
            </Button>
          </Link>
        </div>
      </section>

      {/* Bento Grid Section */}
      <BentoGrid />

      {/* Testimonials Section */}
      <Testimonials />

      {/* Call to Action Section */}
      <CtaSection />
    </Container>
  );
}
