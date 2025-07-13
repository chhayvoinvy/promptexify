import { useCallback, useRef } from "react";
import { useMousePosition } from "@/hooks/use-mouse-position";
import { cn } from "@/lib/utils";

interface PostTextBaseCardProps {
  title: string;
  className?: string;
}

export function PostTextBaseCard({ title, className }: PostTextBaseCardProps) {
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
    <div
      ref={containerRef}
      className={cn(
        "group relative bg-gradient-to-br from-muted/50 to-muted/80 flex flex-col items-center justify-center gap-2 pt-12 pb-18 rounded-lg overflow-hidden",
        className
      )}
    >
      <div
        ref={overlayRef}
        className="absolute h-48 w-48 rounded-full bg-white/30 opacity-0 bg-blend-soft-light blur-3xl transition-opacity group-hover:opacity-10 dark:group-hover:opacity-20 pointer-events-none"
        style={{
          transform: "translate(var(--x), var(--y))",
          zIndex: 1,
        }}
      />

      <p className="relative text-muted-foreground text-lg font-medium text-center leading-relaxed line-clamp-3 px-8 pb-5 z-10">
        {title}
      </p>
    </div>
  );
}
