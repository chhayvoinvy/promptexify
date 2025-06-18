"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useTheme } from "next-themes";
import { usePathname } from "next/navigation";
import { DarkModeToggle } from "@/components/darkmode-toggle";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface MenuItem {
  href: string;
  label: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const menuItems: MenuItem[] = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
];

// ============================================================================
// COMPONENT
// ============================================================================

export default function Footer() {
  const pathname = usePathname();
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState<boolean>(false);

  // Avoid hydration mismatch with theme
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <footer className="bg-gray-50 dark:bg-gray-800 py-8 mt-15 px-15 lg:px-20 border-t border-gray-200 dark:border-gray-700/80">
        <div className="container mx-auto max-w-6xl py-5">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded mb-8"></div>
            <div className="grid grid-cols-3 gap-x-3 gap-y-4 md:flex md:flex-row md:gap-10 lg:gap-24">
              {[...Array(4)].map((_, i) => (
                <div key={`skeleton-column-${i}`}>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
                  <div className="space-y-2">
                    {[...Array(4)].map((_, j) => (
                      <div
                        key={`skeleton-item-${i}-${j}`}
                        className="h-3 bg-gray-200 dark:bg-gray-700 rounded"
                      ></div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </footer>
    );
  }

  return (
    <>
      {/* Copyright Section */}
      <footer className="bg-gray-50 dark:bg-gray-800 py-8 mt-15 px-15 lg:px-20 border-t border-gray-200 dark:border-gray-700/80">
        <div className="container mx-auto max-w-6xl py-5 flex flex-col md:flex-row md:items-start md:justify-between gap-4 md:gap-8">
          <div className="flex flex-col items-start">
            <Link href="/" className="mb-2 inline-flex">
              <Image
                src={
                  resolvedTheme === "dark"
                    ? "/logo-white.svg"
                    : "/logo-dark.svg"
                }
                alt="Recipes Cabinet Logo"
                width={90}
                height={24}
                className="h-6 w-auto"
                priority
              />
            </Link>
            <p className="text-gray-500 dark:text-gray-500 text-xs">
              Copyright © {new Date().getFullYear()} - Recipes Cabinet
            </p>
          </div>
          {/* Navigation Links Section */}
          <div className="mt-6 md:mt-0">
            <div className="grid grid-cols-3 gap-x-3 gap-y-4 md:flex md:flex-row md:gap-10 lg:gap-24">
              {/* Categories Column */}
              <div className="flex flex-col">
                <h5 className="text-xs md:text-sm lg:text-md text-gray-500 dark:text-gray-500 mb-3 md:mb-6">
                  Categories
                </h5>
                <ul className="space-y-1 md:space-y-2">
                  {menuItems.map((feature) => {
                    return (
                      <li key={feature.label}>
                        <Link
                          href={feature.href}
                          className="text-xs md:text-sm text-gray-500 dark:text-gray-300 hover:opacity-75 transition-opacity hover:text-green dark:hover:text-green dark:hover:opacity-75 duration-300"
                          prefetch={false}
                        >
                          {feature.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {/* Features Column */}
              <div className="flex flex-col">
                <h5 className="text-xs md:text-sm text-gray-500 dark:text-gray-500 mb-3 md:mb-6">
                  Features
                </h5>
                <ul className="space-y-1 md:space-y-2">
                  {menuItems.map((feature) => {
                    const isActive = pathname === feature.href;
                    return (
                      <li key={feature.label}>
                        <Link
                          href={feature.href}
                          className={`text-xs md:text-sm ${
                            isActive
                              ? "text-green dark:text-green-700"
                              : "text-gray-500 dark:text-gray-300"
                          } hover:opacity-75 transition-opacity hover:text-green dark:hover:text-green dark:hover:opacity-75 duration-300`}
                          prefetch={false}
                        >
                          {feature.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {/* Company Column */}
              <div className="flex flex-col">
                <h5 className="text-xs md:text-sm text-gray-500 dark:text-gray-500 mb-3 md:mb-6">
                  Company
                </h5>
                <ul className="space-y-1 md:space-y-2">
                  {menuItems.map((item, index) => {
                    const isActive = pathname === `/page/${item.slug}`;
                    return (
                      <li key={item.label || item.id || `page-${index}`}>
                        <Link
                          href={`/page/${item.slug}`}
                          className={`text-xs md:text-sm ${
                            isActive
                              ? "text-green dark:text-green-700"
                              : "text-gray-500 dark:text-gray-300"
                          } hover:opacity-75 transition-opacity hover:text-green dark:hover:text-green dark:hover:opacity-75 duration-300`}
                          prefetch={false}
                        >
                          {item.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {/* Language and Theme Column */}
              <div className="flex flex-col items-center">
                <div className="mb-1 md:mb-4">
                  <DarkModeToggle />
                </div>
                <button className="text-xs md:text-sm border-2 border-gray-200 dark:border-gray-700/80 rounded-4xl px-4 py-1 text-gray-500 dark:text-gray-500">
                  English
                </button>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
