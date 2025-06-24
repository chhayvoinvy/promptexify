import Link from "next/link";
import { Github, Twitter, Instagram, Youtube, Facebook } from "lucide-react";
import { LogoCompact } from "@/components/ui/logo";

export function Footer() {
  return (
    <footer className="border-t border-border/40 bg-background">
      <div className="container mx-auto px-5 py-6 max-w-7xl md:py-16">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-7 lg:grid-cols-7 lg:gap-10 xl:gap-13 items-top justify-center">
          {/* Brand and Description */}
          <div className="space-y-4 col-span-3 lg:col-span-4">
            <LogoCompact />
            <p className="text-xs text-muted-foreground max-w-md">
              A comprehensive collection of AI prompts to enhance your
              creativity and productivity across various platforms.
            </p>
            <div className="flex space-x-4">
              <Link
                href="https://github.com"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="GitHub"
              >
                <Github className="h-4 w-4" />
              </Link>
              <Link
                href="https://twitter.com"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Twitter"
              >
                <Twitter className="h-4 w-4" />
              </Link>
              <Link
                href="mailto:contact@promptexify.com"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Email"
              >
                <Instagram className="h-4 w-4" />
              </Link>
              <Link
                href="https://www.youtube.com/@promptexify"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="YouTube"
              >
                <Youtube className="h-4 w-4" />
              </Link>
              <Link
                href="https://www.facebook.com/promptexify"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* Categories */}
          <div className="space-y-4">
            <h3 className="font-semibold text-xs">Prompts Directory</h3>
            <ul className="space-y-2 text-xs">
              <li>
                <Link
                  href="/directory?category=text-to-image"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Text to Image
                </Link>
              </li>
              <li>
                <Link
                  href="/directory?category=text-to-video"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Text to Video
                </Link>
              </li>
              <li>
                <Link
                  href="/directory?category=text-to-audio"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Text to Audio
                </Link>
              </li>
              <li>
                <Link
                  href="/directory?category=chatgpt"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  ChatGPT Prompts
                </Link>
              </li>
              <li>
                <Link
                  href="/directory?category=claude"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Claude Prompts
                </Link>
              </li>
              <li>
                <Link
                  href="/directory?category=midjourney"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Midjourney Prompts
                </Link>
              </li>
              <li>
                <Link
                  href="/directory?category=dalle"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  DALL-E Prompts
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-xs">Rules</h3>
            <ul className="space-y-2 text-xs">
              <li>
                <Link
                  href="/directory?category=chatgpt"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cursor Rules
                </Link>
              </li>
              <li>
                <Link
                  href="/directory?category=claude"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Windsurf Rules
                </Link>
              </li>
              <li>
                <Link
                  href="/directory?category=midjourney"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  ChatGPT Rules
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div className="space-y-4">
            <h3 className="font-semibold text-xs">Legal</h3>
            <ul className="space-y-2 text-xs">
              <li>
                <Link
                  href="/privacy-policy"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/terms-of-use"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Terms of Use
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Contact Us
                </Link>
              </li>
              <li>
                <Link
                  href="/about"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  About Us
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 border-t border-border/40 pt-8">
          <div className="flex flex-col items-center justify-between space-y-4 md:flex-row md:space-y-0">
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} Promptexify. All rights reserved.
            </p>
            <p className="text-xs text-muted-foreground">
              Prompts can generate inaccurate results. Please process with
              caution.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
