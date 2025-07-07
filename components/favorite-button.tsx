"use client";

import { useState, useTransition } from "react";
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
  const [isFavorited, setIsFavorited] = useState(initialFavorited);
  const [isPending, startTransition] = useTransition();

  const handleToggleFavorite = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation(); // Prevent event from bubbling up to parent
    e.preventDefault(); // Prevent default touch behavior
    startTransition(async () => {
      try {
        const result = await toggleFavoriteAction({ postId });

        if (result.success) {
          setIsFavorited(result.favorited ?? false);
          toast.success(
            result.favorited
              ? "You liked this prompt"
              : "You unliked this prompt"
          );
        } else {
          toast.error(result.error || "Failed to update favorite");
        }
      } catch (error) {
        console.error("Favorite toggle error:", error);
        toast.error("An unexpected error occurred");
      }
    });
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleToggleFavorite}
      onTouchStart={handleToggleFavorite}
      onTouchEnd={(e) => e.stopPropagation()}
      disabled={isPending}
      className={cn(
        "transition-colors duration-300",
        isFavorited &&
          "text-zinc-700 dark:text-zinc-300 hover:text-zinc-400 dark:hover:text-zinc-200 transition-colors duration-300",
        className
      )}
      aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
    >
      <Heart className={cn("h-4 w-4", isFavorited && "fill-current")} />
    </Button>
  );
}
