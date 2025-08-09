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
                href="/directory?category=vibe-coding"
                title="Vibe Coding Prompts"
                isActive={isActive("/directory?category=vibe-coding")}
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
          <NavigationMenuTrigger>Prompts</NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="grid w-[400px] gap-2 md:w-[500px] md:grid-cols-2 lg:w-[600px]">
              <ListItem
                href="/directory?category=business"
                title="Business"
                isActive={isActive("/directory?category=business")}
              >
                Leverage AI to streamline operations, gain market insights, and
                drive growth. From automated ad copy to sales forecasting, these
                prompts are designed to give your business a competitive edge.
              </ListItem>
              <ListItem
                href="/directory?category=marketing"
                title="Marketing"
                isActive={isActive("/directory?category=marketing")}
              >
                Boost your marketing efforts with AI-powered insights and
                automation. From social media content to email marketing, these
                prompts help you create engaging campaigns and drive results.
              </ListItem>
              <ListItem
                href="/directory?category=education"
                title="Education"
                isActive={isActive("/directory?category=education")}
              >
                Enhance your educational content with AI-driven tools. From
                lesson planning to personalized learning, these prompts help you
                create engaging and effective educational materials.
              </ListItem>
              <ListItem
                href="/directory?category=health"
                title="Health"
                isActive={isActive("/directory?category=health")}
              >
                Stay on top of your health with AI-driven insights and
                personalized recommendations. From symptom analysis to
                medication tracking, these prompts help you manage your health
                effectively.
              </ListItem>
              <ListItem
                href="/directory?category=social-media"
                title="Social Media"
                isActive={isActive("/directory?category=social-media")}
              >
                Elevate your social media presence with AI-driven content
                creation. From content ideas to engagement strategies, these
                prompts help you create content that resonates with your
                audience.
              </ListItem>
              <ListItem
                href="/directory?category=music"
                title="Music"
                isActive={isActive("/directory?category=music")}
              >
                Create music with AI-driven tools. From melody generation to
                instrumentals, these prompts help you create music that
                resonates with your audience.
              </ListItem>
              <ListItem
                href="/directory?category=writing"
                title="Writing"
                isActive={isActive("/directory?category=writing")}
              >
                Write with AI-driven tools. From story ideas to content
                creation, these prompts help you create content that resonates
                with your audience.
              </ListItem>
              <ListItem
                href="/directory?category=productivity"
                title="Productivity"
                isActive={isActive("/directory?category=productivity")}
              >
                Boost your productivity with AI-driven tools. From task
                management to time tracking, these prompts help you stay on
                track and achieve your goals.
              </ListItem>
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuTrigger>Rules</NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="grid w-[200px] gap-2 md:w-[250px] md:grid-cols-1 lg:w-[250px]">
              <ListItem
                href="/directory?category=vibe-coding"
                title="Vibe Coding"
                isActive={isActive("/directory?category=vibe-coding")}
              >
                Rules for Vibe Coding AI Code Editor to enhance your coding
                productivity.
              </ListItem>
              <ListItem
                href="/directory?category=vibe-coding&subcategory=claude-code"
                title="Claude Code"
                isActive={isActive(
                  "/directory?category=vibe-coding&subcategory=claude-code"
                )}
              >
                Rules for Claude AI Code Editor to streamline development.
              </ListItem>
              <ListItem
                href="/directory?category=vibe-coding&subcategory=cursor"
                title="Cursor"
                isActive={isActive(
                  "/directory?category=vibe-coding&subcategory=cursor"
                )}
              >
                Rules for Cursor AI Code Editor to enhance your coding
                productivity.
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
