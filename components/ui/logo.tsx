"use client";

import Image from "next/image";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface LogoProps {
  href?: string | null;
  className?: string;
  width?: number;
  height?: number;
  priority?: boolean;
}

export function Logo({
  href = "/",
  className,
  width = 180,
  height = 28,
  priority = false,
}: LogoProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch by waiting for theme to be resolved
  useEffect(() => {
    setMounted(true);
  }, []);

  // Determine which logo to show based on resolved theme
  const logoSrc = !mounted
    ? "/static/logo-dark.svg" // Default fallback
    : resolvedTheme === "dark"
    ? "/static/logo-white.svg"
    : "/static/logo-dark.svg";

  const logoElement = (
    <Image
      src={logoSrc}
      alt="Promptexify"
      width={width}
      height={height}
      priority={priority}
      className={cn("transition-opacity duration-200", className)}
    />
  );

  if (href) {
    return (
      <Link href={href} className="flex items-center">
        {logoElement}
      </Link>
    );
  }

  return logoElement;
}

// Compact version for smaller spaces
export function LogoCompact({
  href = "/",
  className,
  priority = false,
}: Omit<LogoProps, "width" | "height">) {
  return (
    <Logo
      href={href}
      className={className}
      width={120}
      height={19}
      priority={priority}
    />
  );
}

// Icon-only version (for very small spaces)
export function LogoIcon({
  href = "/",
  className,
  priority = false,
}: Omit<LogoProps, "width" | "height">) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const logoSrc = !mounted
    ? "/static/logo-dark.svg"
    : resolvedTheme === "dark"
    ? "/static/logo-white.svg"
    : "/static/logo-dark.svg";

  const logoElement = (
    <div className="flex items-center justify-center w-8 h-8 overflow-hidden">
      <Image
        src={logoSrc}
        alt="Promptexify"
        width={32}
        height={32}
        priority={priority}
        className={cn("object-contain", className)}
      />
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="flex items-center">
        {logoElement}
      </Link>
    );
  }

  return logoElement;
}
