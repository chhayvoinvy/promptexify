"use client";

import { Card, CardFooter, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface PostMasonrySkeletonProps {
  count?: number;
}

export function PostMasonrySkeleton({ count = 12 }: PostMasonrySkeletonProps) {
  // Function to generate random aspect ratios for skeleton loading
  const getRandomAspectRatio = (index: number) => {
    // Seed the randomness with index for consistent skeleton layout
    const seed = index * 2654435761;
    const pseudoRandom = (seed % 1000) / 1000;

    // Generate aspect ratios between 0.67 (2:3 portrait) and 1.8 (wide)
    const minRatio = 0.67; // 2:3 ratio - matches our portrait cap
    const maxRatio = 1.8;
    const aspectRatio = minRatio + pseudoRandom * (maxRatio - minRatio);

    // Convert to width/height format for CSS
    const width = Math.round(aspectRatio * 100);
    const height = 100;

    return { aspectRatio: `${width} / ${height}` };
  };

  return (
    <>
      <div className="masonry-container">
        {Array.from({ length: count }).map((_, i) => (
          <Card key={i} className="masonry-item overflow-hidden mb-4 py-0">
            {/* Featured Image Skeleton */}
            <div className="relative" style={getRandomAspectRatio(i)}>
              <Skeleton className="h-full w-full" />
              {/* Premium badge skeleton on every 3rd item */}
              {i % 3 === 0 && (
                <div className="absolute top-2 right-2">
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
              )}
            </div>

            {/* Card Header Skeleton */}
            <CardHeader className="p-4">
              {/* Category badges */}
              <div className="flex items-center gap-2 mb-2">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-12 rounded-full" />
              </div>

              {/* Title */}
              <Skeleton className="h-6 w-full mb-2" />

              {/* Description */}
              <div className="space-y-1">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </CardHeader>

            {/* Card Footer Skeleton */}
            <CardFooter className="p-4 pt-0 flex items-center justify-between">
              {/* Left side - View count */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <Skeleton className="h-3 w-3" />
                  <Skeleton className="h-4 w-8" />
                </div>
              </div>

              {/* Right side - Action buttons */}
              <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-8 rounded" />
                <Skeleton className="h-8 w-8 rounded" />
                <Skeleton className="h-8 w-12 rounded" />
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>
    </>
  );
}
