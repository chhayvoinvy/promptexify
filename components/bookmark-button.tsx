"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Bookmark, BookmarkCheck } from "lucide-react";
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
  const [isBookmarked, setIsBookmarked] = useState(initialBookmarked);
  const [isPending, startTransition] = useTransition();

  const handleToggleBookmark = () => {
    startTransition(async () => {
      try {
        const result = await toggleBookmarkAction({ postId });

        if (result.success) {
          setIsBookmarked(result.bookmarked ?? false);
          toast.success(
            result.bookmarked
              ? "Post added to bookmarks"
              : "Post removed from bookmarks"
          );
        } else {
          toast.error(result.error || "Failed to update bookmark");
        }
      } catch (error) {
        console.error("Bookmark toggle error:", error);
        toast.error("An unexpected error occurred");
      }
    });
  };

  const Icon = isBookmarked ? BookmarkCheck : Bookmark;

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleToggleBookmark}
      disabled={isPending}
      className={cn(
        "transition-colors duration-300",
        isBookmarked &&
          "text-zinc-700 dark:text-zinc-300 hover:text-zinc-400 dark:hover:text-zinc-500 transition-colors duration-300",
        className
      )}
      aria-label={isBookmarked ? "Remove bookmark" : "Add bookmark"}
    >
      <Icon className={cn("h-4 w-4", isBookmarked && "fill-current")} />
    </Button>
  );
}
