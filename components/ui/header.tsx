"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { Navbar } from "@/components/ui/navbar";
import { UserProfileDropdown } from "@/components/user-profile-dropdown";
import { useAuth } from "@/hooks/use-auth";
import { LogoCompact } from "@/components/ui/logo";

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const { user } = useAuth();

  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;

          // Only update state if there's a meaningful change
          if (Math.abs(currentScrollY - lastScrollY) > 5) {
            // Determine if header background should be shown
            setIsScrolled(currentScrollY > 0);

            // Determine scroll direction and visibility
            if (currentScrollY < lastScrollY || currentScrollY < 10) {
              // Scrolling up or near top - show header
              setIsVisible(true);
            } else if (currentScrollY > lastScrollY && currentScrollY > 80) {
              // Scrolling down and past threshold - hide header
              setIsVisible(false);
            }

            setLastScrollY(currentScrollY);
          }

          ticking = false;
        });
        ticking = true;
      }
    };

    // Set initial state
    handleScroll();

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  return (
    <header
      className={`sticky top-0 z-50 w-full border-b transition-all duration-300 ease-in-out transform ${
        isVisible ? "translate-y-0" : "-translate-y-full"
      } ${
        isScrolled
          ? "border-border/40 bg-background/75 backdrop-blur-sm supports-[backdrop-filter]:bg-background/75"
          : "border-transparent bg-transparent"
      }`}
    >
      <div className="container px-4 flex h-14 max-w-7xl mx-auto items-center justify-between">
        <div className="flex items-center space-x-2">
          <LogoCompact className="mr-6" priority />
        </div>
        <div className="flex items-center space-x-2">
          <nav className="flex items-center space-x-4">
            <Suspense fallback={<div className="w-96 h-10" />}>
              <Navbar />
            </Suspense>
          </nav>
        </div>
        <div className="flex items-center space-x-4">
          {user ? (
            <UserProfileDropdown user={user} />
          ) : (
            <Link
              href="/signin"
              className="text-sm font-medium text-foreground border border-border rounded-md px-4 py-2 transition-colors hover:text-foreground/80"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
