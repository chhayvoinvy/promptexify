"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { Masonry } from "masonic";
import { PostWithInteractions } from "@/lib/content";
import { PostCard } from "@/components/post-card";
import { usePrefetchPosts } from "@/hooks/use-prefetch-posts";

interface PostMasonryGridProps {
  posts: PostWithInteractions[];
  userType?: "FREE" | "PREMIUM" | null;
}

interface PostItemProps {
  index: number;
  data: PostWithInteractions;
  width: number;
}

export function PostMasonryGrid({ 
  posts, 
  userType 
}: PostMasonryGridProps) {
  // Video state management (global across all posts)
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);
  const [mutedVideos, setMutedVideos] = useState<Set<string>>(
    new Set(posts.filter((post) => post.featuredVideo).map((post) => post.id))
  );
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1200
  );

  // Initialize prefetch hook for viewport-based prefetching
  const { observePost, unobservePost, getPrefetchStatus } = usePrefetchPosts({
    rootMargin: "0px 0px 800px 0px", // Start prefetching 800px before entering viewport
    threshold: 0.1,
    prefetchData: true, // Prefetch both route and API data
    debounceMs: 100, // Quick response for better UX
  });

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle video state changes
  const handleVideoStateChange = useCallback((postId: string, isPlaying: boolean) => {
    if (isPlaying) {
      // Pause any currently playing video
      setPlayingVideo(postId);
    } else {
      setPlayingVideo(null);
    }
  }, []);

  // Handle video mute changes
  const handleVideoMuteChange = useCallback((postId: string, isMuted: boolean) => {
    setMutedVideos((prev) => {
      const newSet = new Set(prev);
      if (isMuted) {
        newSet.add(postId);
      } else {
        newSet.delete(postId);
      }
      return newSet;
    });
  }, []);

  // Calculate responsive column width
  const columnWidth = useMemo(() => {
    const containerWidth = windowWidth;
    const gap = 24; // 1.5rem = 24px
    let cols = 1;

    // Responsive breakpoints matching your current CSS
    if (containerWidth >= 1280) cols = 4;
    else if (containerWidth >= 1024) cols = 3;
    else if (containerWidth >= 640) cols = 2;
    else cols = 1;

    // Calculate actual column width accounting for gaps and container padding
    const availableWidth = containerWidth - 48; // Account for container padding
    const totalGapWidth = gap * (cols - 1);
    const calculatedWidth = (availableWidth - totalGapWidth) / cols;
    
    return Math.max(calculatedWidth, 200); // Minimum width
  }, [windowWidth]);

  // Update muted videos when posts change (for new posts)
  useEffect(() => {
    const newVideoPostIds = posts
      .filter((post) => post.featuredVideo && !mutedVideos.has(post.id))
      .map((post) => post.id);

    if (newVideoPostIds.length > 0) {
      setMutedVideos((prev) => new Set([...prev, ...newVideoPostIds]));
    }
  }, [posts, mutedVideos]);

  // Render function for each post
  const renderPost = useCallback(({ index, data, width }: PostItemProps) => {
    return (
      <PostCard
        post={data}
        userType={userType}
        width={width}
        playingVideo={playingVideo}
        onVideoStateChange={handleVideoStateChange}
        isVideoMuted={mutedVideos.has(data.id)}
        onVideoMuteChange={handleVideoMuteChange}
        observePost={observePost}
        unobservePost={unobservePost}
        getPrefetchStatus={getPrefetchStatus}
      />
    );
  }, [
    userType,
    playingVideo,
    mutedVideos,
    handleVideoStateChange,
    handleVideoMuteChange,
    observePost,
    unobservePost,
    getPrefetchStatus,
  ]);

  return (
    <Masonry
      items={posts}
      columnWidth={columnWidth}
      columnGutter={24}
      rowGutter={24}
      overscanBy={2}
      render={renderPost}
      itemHeightEstimate={400} // Average height estimate for better performance
      itemKey={(data) => data.id} // Use post ID as key for stable rendering
      role="grid" // Accessibility
      className="w-full"
      // Additional props to match current behavior
      style={{ width: '100%' }}
    />
  );
} 