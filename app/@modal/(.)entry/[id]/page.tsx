"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PostModal } from "@/components/post-modal";
import { PremiumUpgradeModal } from "@/components/premium-upgrade-modal";
import { useAuth } from "@/hooks/use-auth";
import type { PostWithInteractions } from "@/lib/content";
import { Progress } from "@/components/ui/progress";

export default function GlobalInterceptedModalPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { user, loading: authLoading } = useAuth();
  const [post, setPost] = useState<PostWithInteractions | null>(null);
  const [loading, setLoading] = useState(true);
  const [premiumRequired, setPremiumRequired] = useState(false);

  // Top loader progress state (always call hooks at top level)
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    let frame: number;
    if ((loading || authLoading) && progress < 80) {
      frame = window.setTimeout(
        () => setProgress((p) => Math.min(p + Math.random() * 10 + 5, 80)),
        200
      );
    }
    return () => clearTimeout(frame);
  }, [loading, authLoading, progress]);

  useEffect(() => {
    // console.log("🌐 Global intercepting route activated for post:", id);

    async function fetchPostData() {
      try {
        // Fetch post data with caching for instant loads
        const response = await fetch(`/api/posts/${id}`, {
          // Use default cache to leverage prefetched data
          cache: "default",
          // Add cache headers for better performance
          headers: {
            'Cache-Control': 'max-age=300', // 5 minute cache
          }
        });
        
        if (response.status === 403) {
          // Check if this is a premium content error
          const errorData = await response.json();
          if (errorData.error?.includes("Premium subscription required")) {
            setPremiumRequired(true);
            setLoading(false);
            return;
          }
          throw new Error(errorData.error || "Access denied");
        }
        
        if (!response.ok) {
          throw new Error("Failed to fetch post");
        }
        const postData = await response.json();

        setPost(postData);
        // console.log("✅ Global modal for post:", postData.title);
      } catch (error) {
        console.error("Error fetching post data:", error);
        // Redirect to pricing page on access error
        router.push("/pricing");
      } finally {
        setLoading(false);
      }
    }

    // Only fetch post data when we have auth state resolved
    if (!authLoading) {
      fetchPostData();
    }
  }, [id, authLoading, router]);

  // Handle close function
  const handleClose = () => {
    router.back();
  };

  // Top loader progress state (always call hooks at top level)
  if (loading || authLoading) {
    return (
      <>
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            zIndex: 1100,
          }}
        >
          <Progress
            value={progress}
            className="h-0.5 w-full bg-blue-200 opacity-30"
          />
        </div>
        <div className="fixed top-0 left-0 w-100vw h-100vh z-[1100]">
          <Progress value={progress} className="h-0.5 w-full bg-transparent" />
        </div>
      </>
    );
  }

  // Show premium upgrade modal if premium required
  if (premiumRequired) {
    // Create a mock post object for the premium modal
    const mockPost = {
      id,
      title: "Premium Content",
      isPremium: true,
    } as PostWithInteractions;
    
    return <PremiumUpgradeModal post={mockPost} onClose={handleClose} />;
  }

  if (!post) {
    return null;
  }

  // Get user type from cached auth data
  const userType = user?.userData?.type || null;

  // Return the modal component - it will overlay any page in the app
  return <PostModal post={post} userType={userType} onClose={handleClose} />;
}
