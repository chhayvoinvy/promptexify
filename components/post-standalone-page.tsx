"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import {
  Copy,
  Check,
  ArrowLeft,
  Share2,
  Home,
  ChevronRight,
  LockIcon,
  UnlockIcon,
} from "lucide-react";

import { PostWithInteractions } from "@/lib/content";
import { BookmarkButton } from "@/components/bookmark-button";
import { FavoriteButton } from "@/components/favorite-button";

interface PostStandalonePageProps {
  post: PostWithInteractions;
  relatedPosts?: PostWithInteractions[];
  userType?: "FREE" | "PREMIUM" | null;
}

export function PostStandalonePage({
  post,
  relatedPosts = [],
  userType,
}: PostStandalonePageProps) {
  const [isCopied, setIsCopied] = useState(false);
  const [isShared, setIsShared] = useState(false);
  const viewTracked = useRef(false);
  const router = useRouter();

  const copyToClipboard = async () => {
    const contentToCopy =
      post.content || "No content available for this prompt.";

    try {
      await navigator.clipboard.writeText(contentToCopy);
      setIsCopied(true);
      toast.success("Prompt copied to clipboard!");

      // Reset after 10 seconds
      setTimeout(() => {
        setIsCopied(false);
      }, 10000);
    } catch {
      // Fallback for older browsers or when clipboard API is not available
      const textArea = document.createElement("textarea");
      textArea.value = contentToCopy;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setIsCopied(true);
      toast.success("Prompt copied to clipboard!");

      // Reset after 10 seconds
      setTimeout(() => {
        setIsCopied(false);
      }, 10000);
    }
  };

  const sharePost = async () => {
    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({
          title: post.title,
          text: post.description || "Check out this AI prompt",
          url: url,
        });
        return;
      } catch {
        // Fall back to clipboard if share fails
      }
    }

    // Fallback: copy URL to clipboard
    try {
      await navigator.clipboard.writeText(url);
      setIsShared(true);
      toast.success("Link copied to clipboard!");

      setTimeout(() => {
        setIsShared(false);
      }, 3000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const goBack = () => {
    // Check if there's a previous page in history
    if (window.history.length > 1) {
      router.back();
    } else {
      // If no history, go to home page
      router.push("/");
    }
  };

  // Track view when page loads - only once
  useEffect(() => {
    if (viewTracked.current) return;

    const incrementView = async () => {
      try {
        viewTracked.current = true;
        await fetch(`/api/posts/${post.id}/view`, { method: "POST" });
      } catch (error) {
        console.error("Failed to track view:", error);
        viewTracked.current = false; // Reset on error to allow retry
      }
    };

    incrementView();
  }, [post.id]);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center space-x-2 text-sm text-muted-foreground mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/")}
            className="p-1 h-auto"
          >
            <Home className="h-4 w-4" />
          </Button>
          <ChevronRight className="h-4 w-4" />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/directory")}
            className="p-1 h-auto text-muted-foreground hover:text-foreground"
          >
            Directory
          </Button>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground font-medium">
            {post.category.parent?.name || post.category.name}
          </span>
          {post.category.parent && (
            <>
              <ChevronRight className="h-4 w-4" />
              <span className="text-foreground font-medium">
                {post.category.name}
              </span>
            </>
          )}
        </nav>

        {/* Header with navigation */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            onClick={goBack}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {post.category.parent?.name || post.category.name}
            </Badge>
            {post.category.parent && (
              <Badge variant="outline" className="text-xs">
                {post.category.name}
              </Badge>
            )}
          </div>
        </div>

        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-6">
          {/* Main content column */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <CardTitle className="text-2xl md:text-3xl mb-2">
                      {post.title}
                    </CardTitle>
                    {post.description && (
                      <p className="text-muted-foreground text-lg">
                        {post.description}
                      </p>
                    )}
                  </div>
                  {post.isPremium && (
                    <Badge className="bg-gradient-to-r from-teal-500 to-sky-500 text-foreground">
                      {userType === "PREMIUM" ? (
                        <UnlockIcon className="w-4 h-4 mr-1" />
                      ) : (
                        <LockIcon className="w-4 h-4 mr-1" />
                      )}
                      Premium
                    </Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Action buttons */}
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    onClick={copyToClipboard}
                    variant="default"
                    className="flex items-center gap-2"
                    disabled={!post.content}
                  >
                    {isCopied ? (
                      <>
                        <Check className="h-4 w-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        Copy Prompt
                      </>
                    )}
                  </Button>

                  <FavoriteButton
                    postId={post.id}
                    initialFavorited={post.isFavorited}
                    variant="outline"
                  />

                  <BookmarkButton
                    postId={post.id}
                    initialBookmarked={post.isBookmarked}
                    variant="outline"
                  />

                  <Button
                    onClick={sharePost}
                    variant="outline"
                    className="flex items-center gap-2 ml-auto"
                  >
                    {isShared ? (
                      <>
                        <Check className="h-4 w-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Share2 className="h-4 w-4" />
                        Share
                      </>
                    )}
                  </Button>
                </div>

                {/* Prompt content with fixed height and scroll */}
                <div className="bg-muted/30 rounded-lg border">
                  <div className="px-8 flex items-center justify-between py-4">
                    <h3 className="text-lg font-semibold">Prompt:</h3>
                    <Badge variant="secondary" className="text-xs">
                      {post.content?.length || 0} characters
                    </Badge>
                  </div>
                  <div className="h-96 overflow-y-auto">
                    <div className="px-8 pb-6">
                      <div className="whitespace-pre-wrap text-sm leading-relaxed break-words bg-card/20">
                        {post.content ||
                          "No content available for this prompt."}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tags */}
                {post.tags.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-muted-foreground">
                      Tags:
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {post.tags.map((tag) => (
                        <Badge key={tag.id} variant="outline">
                          {tag.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Metadata */}
                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center gap-4">
                      {post.author && <span>By {post.author.name}</span>}
                      <span>{post._count?.views || 0} views</span>
                    </div>
                    <div className="text-xs">
                      Created {new Date(post.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Related posts sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle className="text-lg">Related Prompts</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {relatedPosts.length > 0 ? (
                  relatedPosts.map((relatedPost) => (
                    <div
                      key={relatedPost.id}
                      className="group cursor-pointer border rounded-lg p-3 hover:bg-muted/50 transition-colors"
                      onClick={() => router.push(`/entry/${relatedPost.id}`)}
                    >
                      <div className="flex items-start gap-3">
                        {relatedPost.featuredImage && (
                          <div className="w-12 h-12 rounded overflow-hidden flex-shrink-0 relative">
                            <Image
                              src={relatedPost.featuredImage}
                              alt={relatedPost.title}
                              fill
                              className="object-cover"
                              sizes="48px"
                            />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
                            {relatedPost.title}
                          </h4>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className="text-xs">
                              {relatedPost.category.parent?.name ||
                                relatedPost.category.name}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {relatedPost._count?.views || 0} views
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <p className="text-sm">No related prompts found</p>
                  </div>
                )}
                {/* Related actions */}
                <div className="text-left">
                  <Button
                    onClick={() => router.push("/")}
                    variant="outline"
                    size="lg"
                  >
                    Discover More Prompts
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
