"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";

export function Navbar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const category = searchParams.get("category");
  const subcategory = searchParams.get("subcategory");

  const isActive = (href: string) => {
    // Handle root path
    if (href === "/" && pathname === "/") {
      return true;
    }

    // Handle directory with category and subcategory
    if (href.includes("?category=") && href.includes("&subcategory=")) {
      const url = new URL(href, "https://promptexify.com");
      const hrefCategory = url.searchParams.get("category");
      const hrefSubcategory = url.searchParams.get("subcategory");
      return (
        pathname === url.pathname &&
        category === hrefCategory &&
        subcategory === hrefSubcategory
      );
    }

    // Handle directory with category only
    if (href.includes("?category=")) {
      const [path, categoryParam] = href.split("?category=");
      return pathname === path && category === categoryParam && !subcategory;
    }

    // Handle directory without category
    if (href === "/directory") {
      return pathname === "/directory" && !category;
    }

    return false;
  };

  return (
    <NavigationMenu viewport={false}>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger>Browse</NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="grid gap-2 md:w-[400px] lg:w-[500px] lg:grid-cols-[.75fr_1fr]">
              <li className="row-span-3">
                <NavigationMenuLink asChild>
                  <Link
                    className={cn(
                      "from-muted/50 to-muted flex h-full w-full flex-col justify-end rounded-md bg-gradient-to-b p-6 no-underline outline-none select-none focus:shadow-md",
                      isActive("/") && "ring-2 ring-primary"
                    )}
                    href="/"
                  >
                    <div className="mt-4 mb-2 text-lg font-medium">
                      Promptexify
                    </div>
                    <p className="text-muted-foreground text-sm leading-tight">
                      Discover amazing AI prompts for creativity and
                      productivity.
                    </p>
                  </Link>
                </NavigationMenuLink>
              </li>
              <ListItem
                href="/directory?category=ai-code-editor"
                title="AI Code Editors"
                isActive={isActive("/directory?category=ai-code-editor")}
              >
                Browse our complete collection of rules and instructions for AI
                Code Editors.
              </ListItem>
              <ListItem
                href="/directory?category=text-to-image"
                title="Text to Image"
                isActive={isActive("/directory?category=text-to-image")}
              >
                Prompts optimized for image generation platforms.
              </ListItem>
              <ListItem
                href="/directory?category=text-to-video"
                title="Text to Video"
                isActive={isActive("/directory?category=text-to-video")}
              >
                Creative prompts for video generation platforms.
              </ListItem>
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuTrigger>Categories</NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="grid w-[400px] gap-2 md:w-[500px] md:grid-cols-2 lg:w-[600px]">
              <ListItem
                href="/directory?category=chatgpt"
                title="ChatGPT Prompts"
                isActive={isActive("/directory?category=chatgpt")}
              >
                Creative writing, marketing copy, and content generation
                prompts.
              </ListItem>
              <ListItem
                href="/directory?category=claude"
                title="Claude Prompts"
                isActive={isActive("/directory?category=claude")}
              >
                Data analysis, research, and professional document prompts.
              </ListItem>
              <ListItem
                href="/directory?category=gemini"
                title="Gemini Prompts"
                isActive={isActive("/directory?category=gemini")}
              >
                Business strategy, coding, and multilingual content.
              </ListItem>
              <ListItem
                href="/directory?category=text-to-image"
                title="Text to Image Prompts"
                isActive={isActive("/directory?category=text-to-image")}
              >
                Photography styles, artistic concepts, and visual creativity.
              </ListItem>
              <ListItem
                href="/directory?category=text-to-video"
                title="Text to Video Prompts"
                isActive={isActive("/directory?category=text-to-video")}
              >
                Video creation prompts and cinematographic concepts.
              </ListItem>
              <ListItem
                href="/directory?category=text-to-audio"
                title="Text to Audio Prompts"
                isActive={isActive("/directory?category=text-to-audio")}
              >
                Audio generation, music creation, and sound design prompts.
              </ListItem>
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuTrigger>Rules</NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="grid w-[200px] gap-2 md:w-[250px] md:grid-cols-1 lg:w-[250px]">
              <ListItem
                href="/directory?category=ai-code-editor&subcategory=cursor-rules"
                title="Cursor Rules"
                isActive={isActive(
                  "/directory?category=ai-code-editor&subcategory=cursor-rules"
                )}
              >
                Rules for Cursor AI Code Editor to enhance your coding
                productivity.
              </ListItem>
              <ListItem
                href="/directory?category=ai-code-editor&subcategory=windsurf-rules"
                title="Windsurf Rules"
                isActive={isActive(
                  "/directory?category=ai-code-editor&subcategory=windsurf-rules"
                )}
              >
                Rules for Windsurf AI Code Editor to streamline development.
              </ListItem>
              <ListItem
                href="/directory?category=ai-code-editor&subcategory=chatgpt-rules"
                title="ChatGPT Rules"
                isActive={isActive(
                  "/directory?category=ai-code-editor&subcategory=chatgpt-rules"
                )}
              >
                Custom rules and instructions for ChatGPT interactions.
              </ListItem>
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuLink
            asChild
            className={cn(
              navigationMenuTriggerStyle(),
              isActive("/directory") && "bg-accent text-accent-foreground"
            )}
          >
            <Link href="/directory">Directory</Link>
          </NavigationMenuLink>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
}

function ListItem({
  title,
  children,
  href,
  isActive = false,
  ...props
}: React.ComponentPropsWithoutRef<"li"> & {
  href: string;
  isActive?: boolean;
}) {
  return (
    <li {...props}>
      <NavigationMenuLink asChild>
        <Link
          href={href}
          className={cn(
            "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
            isActive && "bg-accent text-accent-foreground"
          )}
        >
          <div className="text-sm leading-none font-medium">{title}</div>
          <p className="text-muted-foreground line-clamp-2 text-sm leading-snug">
            {children}
          </p>
        </Link>
      </NavigationMenuLink>
    </li>
  );
}
