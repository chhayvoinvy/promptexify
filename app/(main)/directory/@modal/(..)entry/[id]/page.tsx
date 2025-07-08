"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PostModal } from "@/components/post-modal";
import { useAuth } from "@/hooks/use-auth";
import type { PostWithInteractions } from "@/lib/content";

export default function InterceptedModalPage() {
  const params = useParams();
  const id = params.id as string;
  const { user, loading: authLoading } = useAuth();
  const [post, setPost] = useState<PostWithInteractions | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("🚀 Intercepting route activated for post:", id);

    async function fetchPostData() {
      try {
        // Fetch post data
        const response = await fetch(`/api/posts/${id}`);
        if (!response.ok) {
          throw new Error("Failed to fetch post");
        }
        const postData = await response.json();

        setPost(postData);
        console.log("✅ Returning modal for post:", postData.title);
      } catch (error) {
        console.error("Error fetching post data:", error);
      } finally {
        setLoading(false);
      }
    }

    // Only fetch post data when we have auth state resolved
    if (!authLoading) {
      fetchPostData();
    }
  }, [id, authLoading]);

  if (loading || authLoading) {
    return (
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          color: "white",
        }}
      >
        Loading modal...
      </div>
    );
  }

  if (!post) {
    return null;
  }

  // Get user type from cached auth data
  const userType = user?.userData?.type || null;

  // Return the modal component - it will overlay the directory page
  return <PostModal post={post} userType={userType} />;
}
