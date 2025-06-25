"use client";

import { useCallback, useRef } from "react";
import { useMousePosition } from "@/hooks/use-mouse-position";
import { GridBackground } from "@/components/ui/grid-background";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Container } from "@/components/ui/container";
import { Search } from "lucide-react";

interface HeroSectionProps {
  searchQuery?: string;
  sort: string;
}

export function HeroSection({ searchQuery, sort }: HeroSectionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const update = useCallback(({ x, y }: { x: number; y: number }) => {
    if (!overlayRef.current) {
      return;
    }

    const { width, height } = overlayRef.current?.getBoundingClientRect() ?? {};
    const xOffset = x - width / 2;
    const yOffset = y - height / 2;

    overlayRef.current?.style.setProperty("--x", `${xOffset}px`);
    overlayRef.current?.style.setProperty("--y", `${yOffset}px`);
  }, []);

  useMousePosition(containerRef, update);

  return (
    <section
      ref={containerRef}
      className="group relative bg-gradient-to-b from-background via-muted/20 to-background -mt-10 pt-14 overflow-hidden z-20 pb-15"
    >
      {/* Grid Background */}
      <GridBackground className="z-0" gridSize={80} />

      <div className="absolute bottom-0 bg-gradient-to-t from-background to-transparent w-full h-20 z-50" />

      {/* Mouse Effect Overlay */}
      <div
        ref={overlayRef}
        className="absolute hidden md:block blur-3xl h-128 w-128 rounded-full bg-white/20 opacity-0 bg-blend-lighten transition-opacity group-hover:opacity-10 dark:group-hover:opacity-20 pointer-events-none"
        style={{
          transform: "translate(var(--x), var(--y))",
          zIndex: 15,
        }}
      />

      {/* Gradient Overlays for fade effect */}
      <div className="hidden md:block lg:block xl:block">
        <div className="absolute inset-x-0 top-0 h-1/4 bg-gradient-to-b from-background to-transparent z-50 pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-background to-transparent z-50 pointer-events-none" />
        <div className="absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-background to-transparent z-50 pointer-events-none" />
        <div className="absolute inset-y-0 right-0 w-1/4 bg-gradient-to-l from-background to-transparent z-50 pointer-events-none" />
      </div>
      <Container className="relative z-20 md:py-25">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Prompt Directory
          </h1>
          <p className="text-sm md:text-xl lg:text-xl xl:text-xl text-muted-foreground mb-6">
            Discover amazing prompts and rulesets for AI code editor, image
            generation, video creation, and more. Browse our curated collection
            of free ready to use prompts.
          </p>
          {/* Search Bar */}
          <form method="GET" className="relative max-w-xl mx-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              name="q"
              placeholder="Search prompts, categories, or tags..."
              defaultValue={searchQuery}
              className="px-10 py-6 text-lg border-2 rounded-xl focus:border-primary bg-background/90"
            />
            {/* Preserve sort parameter in search */}
            {sort !== "latest" && (
              <input type="hidden" name="sort" value={sort} />
            )}
            <Button
              type="submit"
              className="absolute right-2 top-1/2 transform -translate-y-1/2"
            >
              Search
            </Button>
          </form>
        </div>
      </Container>
    </section>
  );
}
