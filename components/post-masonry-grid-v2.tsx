"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { Masonry } from "masonic";
import { PostWithInteractions } from "@/lib/content";
import { PostCard } from "@/components/post-card";
import { usePrefetchPosts } from "@/hooks/use-prefetch-posts";

interface PostMasonryGridV2Props {
  posts: PostWithInteractions[];
  userType?: "FREE" | "PREMIUM" | null;
  onRender?: (startIndex: number, stopIndex: number, items: PostWithInteractions[]) => void;
}

interface PostItemProps {
  index: number;
  data: PostWithInteractions;
  width: number;
}

export function PostMasonryGridV2({ 
  posts, 
  userType, 
  onRender 
}: PostMasonryGridV2Props) {
  // Video state management (global across all posts)
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);
  const [mutedVideos, setMutedVideos] = useState<Set<string>>(
    new Set(posts.filter((post) => post.uploadPath && post.uploadFileType === "VIDEO").map((post) => post.id))
  );
  // Get all video post IDs for video state management
  const videoPostIds = useMemo(
    () =>
      new Set(posts.filter((post) => post.uploadPath && post.uploadFileType === "VIDEO").map((post) => post.id)),
    [posts]
  );

  // Initialize prefetch hook for viewport-based prefetching
  const { observePost, unobservePost, getPrefetchStatus } = usePrefetchPosts({
    rootMargin: "0px 0px 800px 0px", // Start prefetching 800px before entering viewport
    threshold: 0.1,
    prefetchData: true, // Prefetch both route and API data
    debounceMs: 100, // Quick response for better UX
  });

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

  // Calculate responsive column width and count
  const getColumnWidth = () => {
    if (typeof window === 'undefined') return 300; // SSR fallback
    
    const containerWidth = window.innerWidth;
    const gap = 24; // 1.5rem = 24px
    let cols = 1;

    // Responsive breakpoints matching your current CSS
    if (containerWidth >= 1280) cols = 4;
    else if (containerWidth >= 1024) cols = 3;
    else if (containerWidth >= 640) cols = 2;
    else cols = 1;

    // Calculate actual column width accounting for gaps and padding
    const availableWidth = containerWidth - 48; // Account for container padding
    const totalGapWidth = gap * (cols - 1);
    const columnWidth = (availableWidth - totalGapWidth) / cols;
    
    return Math.max(columnWidth, 200); // Minimum width
  };

  // Memoize column width to prevent unnecessary recalculations
  const columnWidth = useMemo(() => getColumnWidth(), []);

  // Update muted videos when posts change (for new posts)
  useEffect(() => {
    const newVideoPostIds = posts
      .filter((post) => post.uploadPath && post.uploadFileType === "VIDEO" && !videoPostIds.has(post.id))
      .map((post) => post.id);

    if (newVideoPostIds.length > 0) {
      setMutedVideos((prev) => new Set([...prev, ...newVideoPostIds]));
    }
  }, [posts, videoPostIds]);

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
      onRender={onRender}
      itemHeightEstimate={400} // Average height estimate for better performance
      itemKey={(data) => data.id} // Use post ID as key for stable rendering
      role="grid" // Accessibility
      className="masonry-container"
    />
  );
} 