import type { Metadata } from "next";
import { GeistMono } from "geist/font/mono";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

import { ThemeProvider } from "@/components/ui/theme";
import { Toaster } from "@/components/ui/sonner";
import { GoogleOneTap } from "@/components/google-one-tap";
import { getBaseUrl } from "@/lib/utils";

export const metadata: Metadata = {
  metadataBase: new URL(getBaseUrl()),
  title: {
    default:
      "Promptexify - AI Prompt Directory for ChatGPT, Claude, Midjourney & DALL-E",
    template: "%s | Promptexify",
  },
  description:
    "Discover and share high-quality AI prompts for ChatGPT, Claude, Midjourney, and DALL-E. Browse our comprehensive directory of tested prompts for creative writing, business, design, and more.",
  keywords: [
    "AI prompts",
    "ChatGPT prompts",
    "Claude prompts",
    "Midjourney prompts",
    "DALL-E prompts",
    "prompt engineering",
    "AI tools",
    "prompt directory",
    "prompt library",
  ],
  authors: [{ name: "Promptexify Team" }],
  creator: "Promptexify",
  publisher: "Promptexify",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://promptexify.com",
    siteName: "Promptexify",
    title: "Promptexify - AI Prompt Directory",
    description:
      "Discover and share high-quality AI prompts for ChatGPT, Claude, Midjourney, and DALL-E.",
    images: [
      {
        url: "/static/auth-marketing.png",
        width: 1200,
        height: 630,
        alt: "Promptexify - AI Prompt Directory",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Promptexify - AI Prompt Directory",
    description:
      "Discover and share high-quality AI prompts for ChatGPT, Claude, Midjourney, and DALL-E.",
    images: ["/static/auth-marketing.png"],
  },
  alternates: {
    canonical: "https://promptexify.com",
  },
  icons: {
    icon: [
      {
        url: "/static/favicon/favicon-16x16.png",
        sizes: "16x16",
        type: "image/png",
      },
      {
        url: "/static/favicon/favicon-32x32.png",
        sizes: "32x32",
        type: "image/png",
      },
      { url: "/static/favicon/favicon.ico", sizes: "any" },
    ],
    apple: [
      {
        url: "/static/favicon/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
    other: [
      {
        rel: "android-chrome-192x192",
        url: "/static/favicon/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        rel: "android-chrome-512x512",
        url: "/static/favicon/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  },
  manifest: "/static/favicon/site.webmanifest",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* All security headers are now handled by middleware and Next.js config */}
        {/* Only keep favicon and theme-related meta tags */}
        <link
          rel="icon"
          type="image/x-icon"
          href="/static/favicon/favicon.ico"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href="/static/favicon/favicon-16x16.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/static/favicon/favicon-32x32.png"
        />
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/static/favicon/apple-touch-icon.png"
        />
        <link rel="manifest" href="/static/favicon/site.webmanifest" />
        <meta name="theme-color" content="#ffffff" />
        <meta name="msapplication-TileColor" content="#ffffff" />
      </head>
      <body className={GeistMono.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <GoogleOneTap />
          <Analytics />
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
