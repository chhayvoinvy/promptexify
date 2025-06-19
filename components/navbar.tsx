"use client";

import * as React from "react";
import Link from "next/link";

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
                    className="from-muted/50 to-muted flex h-full w-full flex-col justify-end rounded-md bg-gradient-to-b p-6 no-underline outline-none select-none focus:shadow-md"
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
              <ListItem href="/directory" title="All Prompts">
                Browse our complete collection of AI prompts.
              </ListItem>
              <ListItem href="/directory?category=chatgpt" title="ChatGPT">
                Prompts optimized for ChatGPT and text generation.
              </ListItem>
              <ListItem
                href="/directory?category=midjourney"
                title="Image Generation"
              >
                Creative prompts for Midjourney, DALL-E and more.
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
              >
                Creative writing, marketing copy, and content generation
                prompts.
              </ListItem>
              <ListItem
                href="/directory?category=claude"
                title="Claude Prompts"
              >
                Data analysis, research, and professional document prompts.
              </ListItem>
              <ListItem
                href="/directory?category=midjourney"
                title="Midjourney Prompts"
              >
                Photography styles, artistic concepts, and visual creativity.
              </ListItem>
              <ListItem href="/directory?category=dalle" title="DALL-E Prompts">
                Design concepts, illustrations, and digital art creation.
              </ListItem>
              <ListItem
                href="/directory?category=gemini"
                title="Gemini Prompts"
              >
                Business strategy, coding, and multilingual content.
              </ListItem>
              <ListItem href="/directory" title="View All Categories">
                Explore our complete collection of AI prompts across all
                platforms.
              </ListItem>
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
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
  ...props
}: React.ComponentPropsWithoutRef<"li"> & { href: string }) {
  return (
    <li {...props}>
      <NavigationMenuLink asChild>
        <Link href={href}>
          <div className="text-sm leading-none font-medium">{title}</div>
          <p className="text-muted-foreground line-clamp-2 text-sm leading-snug">
            {children}
          </p>
        </Link>
      </NavigationMenuLink>
    </li>
  );
}
