"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Navbar } from "@/components/ui/navbar";
import { UserProfileDropdown } from "@/components/user-profile-dropdown";
import { useAuth } from "@/hooks/use-auth";

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setIsScrolled(scrollY > 0);
    };

    // Set initial state
    handleScroll();

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 w-full border-b transition-all duration-200 ${
        isScrolled
          ? "border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/90"
          : "border-transparent bg-transparent"
      }`}
    >
      <div className="container px-4 flex h-14 max-w-7xl mx-auto items-center justify-between">
        <div className="flex items-center space-x-2">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <span className="hidden font-bold sm:inline-block">/</span>
          </Link>
        </div>
        <div className="flex items-center space-x-2">
          <nav className="flex items-center space-x-4">
            <Navbar />
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
