"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye } from "lucide-react";
import Image from "next/image";
import { PostWithInteractions } from "@/lib/content";
import { PostModal } from "@/components/post-modal";
import { BookmarkButton } from "@/components/bookmark-button";
import { FavoriteButton } from "@/components/favorite-button";

interface PostMasonryGridProps {
  posts: PostWithInteractions[];
}

export function PostMasonryGrid({ posts }: PostMasonryGridProps) {
  const [selectedPost, setSelectedPost] = useState<PostWithInteractions | null>(
    null
  );
  const [viewCounts, setViewCounts] = useState<Record<string, number>>({});

  const handleViewPost = (post: PostWithInteractions) => {
    setSelectedPost(post);
    // Optimistically update view count
    setViewCounts((prev) => ({
      ...prev,
      [post.id]: (prev[post.id] || post.viewCount) + 1,
    }));
  };

  const handleCloseModal = () => {
    setSelectedPost(null);
  };

  const getDisplayViewCount = (post: PostWithInteractions) => {
    return viewCounts[post.id] || post.viewCount;
  };

  // State to track loaded image dimensions
  const [imageDimensions, setImageDimensions] = useState<
    Record<string, { width: number; height: number }>
  >({});

  // Function to handle image load and calculate aspect ratio
  const handleImageLoad = (
    postId: string,
    event: React.SyntheticEvent<HTMLImageElement>
  ) => {
    const img = event.currentTarget;
    setImageDimensions((prev) => ({
      ...prev,
      [postId]: {
        width: img.naturalWidth,
        height: img.naturalHeight,
      },
    }));
  };

  // Function to get dynamic aspect ratio style based on actual image dimensions
  const getDynamicAspectRatio = (postId: string) => {
    const dimensions = imageDimensions[postId];
    if (!dimensions) {
      // Generate a pseudo-random but consistent aspect ratio for each post while loading
      // This creates visual variety during the loading state
      const hash = postId.split("").reduce((a, b) => {
        a = (a << 5) - a + b.charCodeAt(0);
        return a & a;
      }, 0);
      const normalized = Math.abs(hash) / 2147483648; // Normalize to 0-1
      const aspectRatio = 0.67 + normalized * 1.13; // Range from 0.67 (2:3) to 1.8
      const width = Math.round(aspectRatio * 100);
      return { aspectRatio: `${width} / 100` };
    }

    // Calculate the natural aspect ratio
    const naturalRatio = dimensions.width / dimensions.height;

    // Cap portrait images at 2:3 ratio (0.67) for better visual balance
    // Allow landscape and square images to use their natural ratios
    const cappedRatio = naturalRatio < 0.67 ? 0.67 : naturalRatio;

    // Convert to CSS aspect-ratio format
    const width = Math.round(cappedRatio * 100);
    return { aspectRatio: `${width} / 100` };
  };

  return (
    <>
      <div className="masonry-container">
        {posts.map((post) => (
          <Card
            key={post.id}
            className="masonry-item overflow-hidden hover:shadow-lg transition-shadow cursor-pointer mb-4"
            onClick={() => handleViewPost(post)}
          >
            {post.featuredImage && (
              <div className="relative" style={getDynamicAspectRatio(post.id)}>
                <Image
                  src={post.featuredImage}
                  alt={post.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  onLoad={(e) => handleImageLoad(post.id, e)}
                />
                {post.isPremium && (
                  <Badge className="absolute top-2 right-2 bg-gradient-to-r from-purple-500 to-pink-500">
                    Premium
                  </Badge>
                )}
              </div>
            )}
            <CardHeader className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary" className="text-xs">
                  {post.category.parent?.name || post.category.name}
                </Badge>
                {post.category.parent && (
                  <Badge variant="outline" className="text-xs">
                    {post.category.name}
                  </Badge>
                )}
              </div>
              <CardTitle className="line-clamp-2 text-lg">
                {post.title}
              </CardTitle>
              {post.description && (
                <CardDescription className="line-clamp-3 text-sm">
                  {post.description}
                </CardDescription>
              )}
            </CardHeader>

            <CardFooter className="p-4 pt-0 flex items-center justify-between text-sm text-muted-foreground">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  <span>{getDisplayViewCount(post)}</span>
                </div>
              </div>
              <div
                className="flex items-center gap-2"
                onClick={(e) => e.stopPropagation()}
              >
                <FavoriteButton
                  postId={post.id}
                  initialFavorited={post.isFavorited || false}
                />
                <BookmarkButton
                  postId={post.id}
                  initialBookmarked={post.isBookmarked || false}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleViewPost(post);
                  }}
                >
                  View
                </Button>
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>

      {selectedPost && (
        <PostModal post={selectedPost} onClose={handleCloseModal} />
      )}
    </>
  );
}
