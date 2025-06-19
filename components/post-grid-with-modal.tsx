"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
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

interface PostGridWithModalProps {
  posts: PostWithInteractions[];
}

export function PostGridWithModal({ posts }: PostGridWithModalProps) {
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

    // Update URL for shareable links while keeping modal open
    window.history.pushState(null, "", `/entry/${post.id}?modal=true`);
  };

  const handleCloseModal = () => {
    setSelectedPost(null);
    // Go back in history to remove modal URL
    window.history.back();
  };

  const getDisplayViewCount = (post: PostWithInteractions) => {
    return viewCounts[post.id] || post.viewCount;
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {posts.map((post) => (
          <Card
            key={post.id}
            className="overflow-hidden hover:shadow-lg transition-shadow"
          >
            {post.featuredImage && (
              <div className="relative aspect-video">
                <Image
                  src={post.featuredImage}
                  alt={post.title}
                  fill
                  className="object-cover"
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
            <CardContent className="p-4 pt-0 hidden">
              <div className="flex flex-wrap gap-1 mb-3">
                {post.tags.slice(0, 3).map((tag) => (
                  <Badge key={tag.id} variant="outline" className="text-xs">
                    {tag.name}
                  </Badge>
                ))}
                {post.tags.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{post.tags.length - 3}
                  </Badge>
                )}
              </div>
            </CardContent>
            <CardFooter className="p-4 pt-0 flex items-center justify-between text-sm text-muted-foreground">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  <span>{getDisplayViewCount(post)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <FavoriteButton
                  postId={post.id}
                  initialFavorited={post.isFavorited}
                  variant="ghost"
                  size="sm"
                />
                <BookmarkButton
                  postId={post.id}
                  initialBookmarked={post.isBookmarked}
                  variant="ghost"
                  size="sm"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8"
                  onClick={() => handleViewPost(post)}
                >
                  View
                </Button>
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* Modal */}
      {selectedPost && (
        <PostModal post={selectedPost} onClose={handleCloseModal} />
      )}
    </>
  );
}
