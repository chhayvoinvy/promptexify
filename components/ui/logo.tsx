"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface LogoProps {
  href?: string | null;
  className?: string;
  width?: number;
  height?: number;
}

function LogoImage({
  width = 180,
  height = 28,
  className,
}: {
  width?: number;
  height?: number;
  className?: string;
}) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return (
      <div
        className={cn("transition-opacity duration-200", className)}
        style={{ width, height }}
      />
    );
  }

  const isDark = resolvedTheme === "dark";
  const logoSrc = isDark
    ? "/static/logo/logo-white.svg"
    : "/static/logo/logo-dark.svg";

  return (
    <Image
      src={logoSrc}
      alt="Promptexify logo"
      width={width}
      height={height}
      style={{ width: "135px", height: "auto" }}
      className={cn("transition-opacity duration-200", className)}
      priority
    />
  );
}

function LogoIconSVG({
  width = 58,
  height = 58,
  className,
}: {
  width?: number;
  height?: number;
  className?: string;
}) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return (
      <div
        className={cn(
          "rounded-full transition-opacity duration-200",
          className
        )}
        style={{ width, height }}
      />
    );
  }

  const isDark = resolvedTheme === "dark";

  // Extract just the icon portion from the SVG
  return (
    <div className={cn("relative", className)} style={{ width, height }}>
      <svg
        width={width}
        height={height}
        viewBox="0 0 117 122"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="transition-opacity duration-200"
        aria-label="Promptexify icon"
        role="img"
      >
        <rect
          width="116.874"
          height="121.773"
          rx="58.4369"
          fill={isDark ? "#F1F1F1" : "#0E0E0E"}
        />
        <mask
          id={`mask-icon-${isDark ? "dark" : "light"}`}
          style={{ maskType: "alpha" }}
          maskUnits="userSpaceOnUse"
          x="0"
          y="0"
          width="117"
          height="122"
        >
          <rect width="116.874" height="121.773" rx="58.4369" fill="white" />
        </mask>
        <g mask={`url(#mask-icon-${isDark ? "dark" : "light"})`}>
          <rect
            x="63.8969"
            y="34.5255"
            width="6.95753"
            height="97.4055"
            fill={isDark ? "#0E0E0E" : "#E1E1E1"}
          />
          <rect
            width="37.7695"
            height="59.636"
            transform="matrix(-1 0 0 1 63.8969 34.5255)"
            fill={isDark ? "#0E0E0E" : "#E1E1E1"}
          />
          <rect
            width="22.8605"
            height="22.8605"
            transform="matrix(-1 0 0 1 102.66 34.5255)"
            fill="#67F3C2"
          />
          <rect
            width="10.9338"
            height="10.9338"
            transform="matrix(-1 0 0 1 90.7331 71.3011)"
            fill="#67F3C2"
          />
        </g>
      </svg>
    </div>
  );
}

export function Logo({
  href = "/",
  className,
  width = 180,
  height = 28,
}: LogoProps) {
  const logoElement = (
    <LogoImage width={width} height={height} className={className} />
  );

  if (href === null) {
    return logoElement;
  }

  return (
    <Link href={href} className="block">
      {logoElement}
    </Link>
  );
}

export function LogoCompact({
  href = "/",
  className,
  width = 130,
  height = 22,
}: LogoProps) {
  return (
    <Logo href={href} className={className} width={width} height={height} />
  );
}

export function LogoIcon({
  href = "/",
  className,
}: Omit<LogoProps, "width" | "height">) {
  const logoElement = (
    <LogoIconSVG width={58} height={58} className={className} />
  );

  if (href === null) {
    return logoElement;
  }

  return (
    <Link href={href} className="block">
      {logoElement}
    </Link>
  );
}
