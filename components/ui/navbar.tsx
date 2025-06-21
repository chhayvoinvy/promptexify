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

  const isActive = (href: string) => {
    // Handle root path
    if (href === "/" && pathname === "/") {
      return true;
    }

    // Handle directory with category
    if (href.includes("?category=")) {
      const [path, categoryParam] = href.split("?category=");
      return pathname === path && category === categoryParam;
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
                href="/directory"
                title="All Prompts"
                isActive={isActive("/directory")}
              >
                Browse our complete collection of AI prompts.
              </ListItem>
              <ListItem
                href="/directory?category=video"
                title="Video Generation"
                isActive={isActive("/directory?category=chatgpt")}
              >
                Prompts optimized for Video Generation.
              </ListItem>
              <ListItem
                href="/directory?category=image"
                title="Image Generation"
                isActive={isActive("/directory?category=image")}
              >
                Creative prompts for Image Generation.
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
                href="/directory?category=midjourney"
                title="Midjourney Prompts"
                isActive={isActive("/directory?category=midjourney")}
              >
                Photography styles, artistic concepts, and visual creativity.
              </ListItem>
              <ListItem
                href="/directory?category=dalle"
                title="DALL-E Prompts"
                isActive={isActive("/directory?category=dalle")}
              >
                Design concepts, illustrations, and digital art creation.
              </ListItem>
              <ListItem
                href="/directory?category=gemini"
                title="Gemini Prompts"
                isActive={isActive("/directory?category=gemini")}
              >
                Business strategy, coding, and multilingual content.
              </ListItem>
              <ListItem
                href="/directory"
                title="View All Categories"
                isActive={isActive("/directory")}
              >
                Explore our complete collection of AI prompts across all
                platforms.
              </ListItem>
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuTrigger>Rules</NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="grid w-[200px] gap-2 md:w-[250px] md:grid-cols-1 lg:w-[250px]">
              <ListItem
                href="/directory?category=cursor"
                title="Cursor AI Code Editor"
                isActive={isActive("/directory?category=cursor")}
              >
                Rules for Cursor - AI Code Editor is a powerful tool that allows
                you to write, edit, and debug code with ease.
              </ListItem>
              <ListItem
                href="/directory?category=windsurf"
                title="Windsurf AI Code Editor"
                isActive={isActive("/directory?category=windsurf")}
              >
                Rules for Windsurf - AI Code Editor is a powerful tool that
                allows you to write, edit, and debug code with ease.
              </ListItem>
              <ListItem
                href="/directory?category=trae"
                title="Trae AI Code Editor"
                isActive={isActive("/directory?category=trae")}
              >
                Rules for Trae - AI Code Editor is a powerful tool that allows
                you to write, edit, and debug code with ease.
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
