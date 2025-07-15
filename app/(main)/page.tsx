import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getPostsWithSorting } from "@/lib/content";
import { getCurrentUser } from "@/lib/auth";
import { Suspense } from "react";
import { PostMasonrySkeleton } from "@/components/post-masonry-skeleton";
import { HeroSection } from "@/components/ui/hero-section";
import Testimonials from "@/components/ui/testimonials";
import { BentoGrid } from "@/components/ui/bento-grid";
import { CtaSection } from "@/components/ui/cta-section";
import { Container } from "@/components/ui/container";
import { getSettingsAction } from "@/actions/settings";
import { SafeAsync } from "@/components/ui/safe-async";
import { FeaturedPostsClient } from "@/components/featured-posts-client";

export const dynamic = "force-dynamic";

async function PostGrid() {
  try {
    // Get current user with error handling
    let currentUser = null;
    let userId = undefined;
    let userType = null;
    
    try {
      currentUser = await getCurrentUser();
      userId = currentUser?.userData?.id;
      userType = currentUser?.userData?.type || null;
    } catch (error) {
      console.warn("Failed to get current user, using anonymous access:", error);
    }

    // Get settings with error handling
    let featuredPostsLimit = 12; // Default fallback
    try {
      const settingsResult = await getSettingsAction();
      if (settingsResult?.success && settingsResult.data?.featuredPostsLimit) {
        featuredPostsLimit = settingsResult.data.featuredPostsLimit;
      }
    } catch (error) {
      console.warn("Failed to get settings, using defaults:", error);
    }

    const posts = await getPostsWithSorting(userId, "latest");

    // Filter for featured posts first and show configurable limit
    const featuredPosts = posts.filter((post) => post.isFeatured).slice(0, featuredPostsLimit);

    return <FeaturedPostsClient posts={featuredPosts} userType={userType} />;
  } catch (error) {
    console.error("Critical error in PostGrid:", error);
    throw error; // Let the error boundary handle this
  }
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
          <SafeAsync>
            <PostGrid />
          </SafeAsync>
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
