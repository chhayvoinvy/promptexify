"use client";

import { useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface AnimatedBackgroundProps {
  className?: string;
}

interface Dot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

export function AnimatedBackground({ className }: AnimatedBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameId = useRef<number>();

  const createDot = useCallback((canvas: HTMLCanvasElement): Dot => {
    return {
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: -0.5 + Math.random(),
      vy: -0.5 + Math.random(),
      radius: 1,
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const section = canvas.closest("section");
    const dotColor = "rgba(255, 255, 255, 0.5)";
    const lineColor = "rgba(255, 255, 255, 0.1)";
    const maxDistance = 150;
    let dots: Dot[] = [];

    const resizeCanvas = () => {
      canvas.width = section?.clientWidth || window.innerWidth;
      canvas.height = section?.clientHeight || window.innerHeight;
      const dotCount = Math.floor((canvas.width * canvas.height) / 9000);
      dots = Array.from({ length: dotCount }, () => createDot(canvas));
    };

    const drawDot = (dot: Dot) => {
      ctx.beginPath();
      ctx.arc(dot.x, dot.y, dot.radius, 0, Math.PI * 2, false);
      ctx.fillStyle = dotColor;
      ctx.fill();
    };

    const updateDot = (dot: Dot) => {
      dot.x += dot.vx;
      dot.y += dot.vy;

      if (dot.x < 0) dot.x = canvas.width;
      if (dot.x > canvas.width) dot.x = 0;
      if (dot.y < 0) dot.y = canvas.height;
      if (dot.y > canvas.height) dot.y = 0;
    };

    const connectDots = () => {
      for (let i = 0; i < dots.length; i++) {
        for (let j = i + 1; j < dots.length; j++) {
          const distance = Math.sqrt(
            Math.pow(dots[i].x - dots[j].x, 2) +
              Math.pow(dots[i].y - dots[j].y, 2)
          );

          if (distance < maxDistance) {
            ctx.beginPath();
            ctx.moveTo(dots[i].x, dots[i].y);
            ctx.lineTo(dots[j].x, dots[j].y);
            ctx.strokeStyle = lineColor;
            ctx.lineWidth = 1 - distance / maxDistance;
            ctx.stroke();
          }
        }
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      dots.forEach(updateDot);
      connectDots();
      dots.forEach(drawDot);
      animationFrameId.current = requestAnimationFrame(animate);
    };

    resizeCanvas();
    animate();

    window.addEventListener("resize", resizeCanvas);
    return () => {
      window.removeEventListener("resize", resizeCanvas);
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [createDot]);

  return (
    <canvas ref={canvasRef} className={cn("absolute inset-0", className)} />
  );
}
