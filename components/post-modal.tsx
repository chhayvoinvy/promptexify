"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, Share } from "lucide-react";
import { PostWithInteractions } from "@/lib/content";
import { BookmarkButton } from "@/components/bookmark-button";
import { FavoriteButton } from "@/components/favorite-button";
import { PremiumUpgradeModal } from "@/components/premium-upgrade-modal";

interface PostModalProps {
  post: PostWithInteractions;
  userType?: "FREE" | "PREMIUM" | null;
  onClose?: () => void;
}

export function PostModal({ post, userType, onClose }: PostModalProps) {
  // Check if user should see premium upgrade modal
  const shouldShowUpgradeModal =
    post.isPremium && (userType === "FREE" || userType === null);

  // If user is free and content is premium, show upgrade modal
  if (shouldShowUpgradeModal) {
    return <PremiumUpgradeModal post={post} onClose={onClose} />;
  }

  // Otherwise, render the full content modal
  return <PostContentModal post={post} onClose={onClose} />;
}

// Separate component for the actual post modal content to avoid hooks issues
function PostContentModal({
  post,
  onClose,
}: {
  post: PostWithInteractions;
  onClose?: () => void;
}) {
  const [isCopied, setIsCopied] = useState(false);
  const [isLinkCopied, setIsLinkCopied] = useState(false);
  const viewTracked = useRef(false);

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

  const copyPostLink = async () => {
    try {
      // Generate the post URL using the current origin and post ID
      const postUrl = `${window.location.origin}/entry/${post.id}`;

      await navigator.clipboard.writeText(postUrl);
      setIsLinkCopied(true);
      toast.success("Sharable link copied.");

      // Reset after 10 seconds
      setTimeout(() => {
        setIsLinkCopied(false);
      }, 10000);
    } catch {
      // Fallback for older browsers or when clipboard API is not available
      const postUrl = `${window.location.origin}/entry/${post.id}`;
      const textArea = document.createElement("textarea");
      textArea.value = postUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setIsLinkCopied(true);
      toast.success("Sharable link copied.");

      // Reset after 10 seconds
      setTimeout(() => {
        setIsLinkCopied(false);
      }, 10000);
    }
  };

  // Removed old bookmark handler - using BookmarkButton component instead

  // Add blur effect to body when modal is open
  useEffect(() => {
    // Create a wrapper div for the body content to blur everything except the modal
    const bodyChildren = Array.from(document.body.children);
    const wrapperDiv = document.createElement("div");
    wrapperDiv.id = "blur-wrapper";
    wrapperDiv.style.filter = "blur(10px)";
    wrapperDiv.style.transition = "filter 0.5s ease-in-out";

    // Move all body children to the wrapper except for the portal div
    bodyChildren.forEach((child) => {
      if (!child.hasAttribute("data-radix-portal-container")) {
        wrapperDiv.appendChild(child);
      }
    });

    document.body.appendChild(wrapperDiv);

    return () => {
      // Move children back to body and remove wrapper
      const wrapper = document.getElementById("blur-wrapper");
      if (wrapper) {
        const wrapperChildren = Array.from(wrapper.children);
        wrapperChildren.forEach((child) => {
          document.body.appendChild(child);
        });
        wrapper.remove();
      }
    };
  }, []);

  // Track view when modal opens - only once
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

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      // If no onClose handler, navigate to home page (for direct URL access)
      window.location.href = "/";
    }
  };

  return (
    <Dialog open={true} onOpenChange={handleClose}>
      <DialogContent className="fixed z-50 left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] w-[95vw] max-w-4xl h-[70vh] max-h-[800px] flex flex-col p-0 gap-0 sm:w-[90vw] md:w-[90vw] lg:w-[80vw]">
        <DialogHeader className="px-6 pt-4">
          <DialogTitle className="text-sm font-bold text-left text-zinc-700 dark:text-zinc-300">
            {post.title}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            View and copy this {post.category.name.toLowerCase()} prompt. You
            can also bookmark or favorite it for later use.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col flex-1 min-h-0 p-4 gap-4">
          {/* Prompt Content - Scrollable Container */}
          <div className="flex-1 min-h-0 flex flex-col">
            <div className="bg-muted/30 rounded-lg border flex-1 flex flex-col min-h-0">
              <div className="flex items-center justify-between px-6 py-4 rounded-t-lg shrink-0">
                <h3 className="text-sm font-medium">Prompt:</h3>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={copyToClipboard}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2 cursor-pointer"
                    disabled={!post.content}
                  >
                    {isCopied ? (
                      <>
                        <Check className="h-3 w-3" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        Copy
                      </>
                    )}
                  </Button>
                  <FavoriteButton
                    postId={post.id}
                    initialFavorited={post.isFavorited}
                    variant="outline"
                    size="sm"
                  />
                  <BookmarkButton
                    postId={post.id}
                    initialBookmarked={post.isBookmarked}
                    variant="outline"
                    size="sm"
                  />
                </div>
              </div>
              <div className="flex-1 min-h-0 overflow-hidden">
                <div className="h-full px-6 pb-6 overflow-y-auto">
                  <div className="whitespace-pre-wrap text-sm leading-relaxed break-words">
                    {post.content || "No content available for this prompt."}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tags Row - Show up to 5 tags */}
          {post.tags.length > 0 && (
            <div className="flex items-top justify-between gap-2">
              {/* Tags */}
              <div className="flex items-center gap-1 flex-wrap">
                {post.tags.slice(0, 3).map((tag) => (
                  <Badge key={tag.id} variant="outline" className="text-xs">
                    {tag.name}
                  </Badge>
                ))}
                {post.tags.length > 3 && (
                  <Badge
                    variant="outline"
                    className="text-xs text-muted-foreground"
                  >
                    +{post.tags.length - 3} more
                  </Badge>
                )}
              </div>
              {/* Share Buttons */}
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={copyPostLink}>
                  {isLinkCopied ? (
                    <>
                      <Check className="h-3 w-3" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      Link
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
