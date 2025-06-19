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
import { Copy, Check } from "lucide-react";
import { PostWithInteractions } from "@/lib/content";
import { BookmarkButton } from "@/components/bookmark-button";
import { FavoriteButton } from "@/components/favorite-button";

interface PostModalProps {
  post: PostWithInteractions;
  onClose?: () => void;
}

export function PostModal({ post, onClose }: PostModalProps) {
  const [isCopied, setIsCopied] = useState(false);
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
      <DialogContent className="fixed z-50 left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] w-[95vw] max-w-3xl h-[60vh] max-h-[700px] flex flex-col p-0 gap-0 sm:w-[90vw] md:w-[80vw] lg:w-[70vw]">
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

          {/* Tags Row */}
          {post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 shrink-0">
              {post.tags.map((tag) => (
                <Badge key={tag.id} variant="outline" className="text-xs">
                  {tag.name}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
