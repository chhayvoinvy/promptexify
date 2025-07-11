"use client";

import { useState, useTransition, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Bookmark, BookmarkCheck } from "@/components/ui/icons";
import { toggleBookmarkAction } from "@/actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface BookmarkButtonProps {
  postId: string;
  initialBookmarked?: boolean;
  variant?: "default" | "ghost" | "outline";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export function BookmarkButton({
  postId,
  initialBookmarked = false,
  variant = "ghost",
  size = "sm",
  className,
}: BookmarkButtonProps) {
  const [isBookmarked, setIsBookmarked] = useState(Boolean(initialBookmarked));
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setIsBookmarked(Boolean(initialBookmarked));
  }, [initialBookmarked]);

  const handleToggle = async () => {
    // Store previous state for rollback if needed
    const previousState = isBookmarked;

    // Optimistic update
    setIsBookmarked(!isBookmarked);

    startTransition(async () => {
      try {
        const result = await toggleBookmarkAction({ postId });

        if (result.success) {
          // Update state based on server response
          setIsBookmarked(result.bookmarked ?? false);

          toast.success(
            result.bookmarked
              ? "Post added to bookmarks"
              : "Post removed from bookmarks"
          );
        } else {
          // Rollback on error
          setIsBookmarked(previousState);
          toast.error(result.error || "Failed to update bookmark");
        }
      } catch (error) {
        // Rollback on error
        setIsBookmarked(previousState);
        console.error("Bookmark toggle error:", error);
        toast.error("Failed to update bookmark");
      }
    });
  };

  const handleClick = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation(); // Prevent event from bubbling up to parent
    e.preventDefault(); // Prevent default touch behavior
    handleToggle();
  };

  const Icon = isBookmarked ? BookmarkCheck : Bookmark;

  return (
    <Button
      className={cn(
        "transition-colors duration-300",
        isBookmarked &&
          "text-zinc-700 dark:text-zinc-300 hover:text-zinc-400 dark:hover:text-zinc-200 transition-colors duration-300",
        className
      )}
      aria-label={isBookmarked ? "Remove bookmark" : "Add bookmark"}
      variant={variant}
      size={size}
      onClick={handleClick}
      onTouchStart={handleClick}
      onTouchEnd={(e) => e.stopPropagation()}
      disabled={isPending}
    >
      <Icon className={cn("h-4 w-4", isBookmarked && "fill-current")} />
    </Button>
  );
}
