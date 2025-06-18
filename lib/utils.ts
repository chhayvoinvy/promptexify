import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getBaseUrl() {
  if (typeof window !== "undefined") {
    // Browser should use relative path
    return window.location.origin;
  }

  if (process.env.NEXT_PUBLIC_BASE_URL) {
    // SSR should use NEXT_PUBLIC_BASE_URL
    return process.env.NEXT_PUBLIC_BASE_URL;
  }

  if (process.env.VERCEL_URL) {
    // Vercel deployment
    return `https://${process.env.VERCEL_URL}`;
  }

  // Default to localhost for development
  return "http://localhost:3000";
}
