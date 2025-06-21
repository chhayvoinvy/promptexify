"use client";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface PostMasonrySkeletonProps {
  count?: number;
}

export function PostMasonrySkeleton({ count = 12 }: PostMasonrySkeletonProps) {
  // Function to generate random but consistent aspect ratios for skeleton loading
  const getSampleAspectRatio = (index: number) => {
    // Seed the randomness with index for consistent skeleton layout
    const seed = index * 1;
    const pseudoRandom = (seed % 1000) / 1000;

    // Generate aspect ratios between 0.67 (2:3 portrait) and 1.8 (wide)
    // This matches the actual component's aspect ratio range
    const minRatio = 0.67;
    const maxRatio = 1.8;
    const aspectRatio = minRatio + pseudoRandom * (maxRatio - minRatio);

    // Convert to width/height format for CSS
    const width = Math.round(aspectRatio * 100);
    const height = 60;

    return { aspectRatio: `${width} / ${height}` };
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="group">
          <Card className="overflow-hidden hover:shadow-lg cursor-pointer py-0 shadow-lg">
            {/* Featured Image Skeleton */}
            <div className="relative" style={getSampleAspectRatio(i)}>
              <Skeleton className="h-full w-full rounded-b-lg" />

              {/* Premium badge skeleton on every 3rd item */}
              {i % 3 === 0 && (
                <div className="absolute top-2 right-2">
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
              )}

              {/* Action buttons overlay skeleton - bottom area */}
              <div className="absolute bottom-3 left-0 right-0 px-3 flex gap-2 items-end justify-between">
                {/* Action buttons - left side */}
                <div className="flex items-bottom justify-end gap-2">
                  <Skeleton className="h-8 w-8 rounded border border-white/20" />
                  <Skeleton className="h-8 w-8 rounded border border-white/20" />
                </div>
                {/* Category badges - right side */}
                <div className="flex items-bottom gap-2">
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-5 w-12 rounded-full" />
                </div>
              </div>
            </div>
          </Card>

          {/* Content overlay positioned outside the Card - matches actual layout */}
          <div className="z-10 mx-3 border border-t-0 rounded-b-lg border-white/20">
            <div className="bg-black/70 backdrop-blur-sm rounded-b-lg px-4 py-2">
              <div className="space-y-1">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-3/4" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
