"use client";

import { useState, useTransition, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Heart } from "@/components/ui/icons";
import { toggleFavoriteAction } from "@/actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface FavoriteButtonProps {
  postId: string;
  initialFavorited?: boolean;
  variant?: "default" | "ghost" | "outline";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export function FavoriteButton({
  postId,
  initialFavorited = false,
  variant = "ghost",
  size = "sm",
  className,
}: FavoriteButtonProps) {
  const [isFavorited, setIsFavorited] = useState(Boolean(initialFavorited));
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setIsFavorited(Boolean(initialFavorited));
  }, [initialFavorited]);

  const handleToggle = async () => {
    // Store previous state for rollback if needed
    const previousState = isFavorited;

    // Optimistic update
    setIsFavorited(!isFavorited);

    startTransition(async () => {
      try {
        const result = await toggleFavoriteAction({ postId });

        if (result.success) {
          // Update state based on server response
          setIsFavorited(result.favorited ?? false);

          toast.success(
            result.favorited ? "Added to favorites" : "Removed from favorites"
          );
        } else {
          // Rollback on error
          setIsFavorited(previousState);
          toast.error(result.error || "Failed to update favorite");
        }
      } catch (error) {
        // Rollback on error
        setIsFavorited(previousState);
        console.error("Favorite toggle error:", error);
        toast.error("Failed to update favorite");
      }
    });
  };

  const handleClick = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation(); // Prevent event from bubbling up to parent
    e.preventDefault(); // Prevent default touch behavior
    handleToggle();
  };

  return (
    <Button
      className={cn(
        "gap-1.5 transition-colors",
        isFavorited &&
          "text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300",
        className
      )}
      variant={variant}
      size={size}
      onClick={handleClick}
      onTouchStart={handleClick}
      onTouchEnd={(e) => e.stopPropagation()}
      disabled={isPending}
    >
      <Heart className={cn("h-4 w-4", isFavorited && "fill-current")} />
    </Button>
  );
}
