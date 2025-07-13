import type { Metadata } from "next";
import { GeistMono } from "geist/font/mono";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

import { ThemeProvider } from "@/components/ui/theme";
import { Toaster } from "@/components/ui/sonner";
import { GoogleOneTap } from "@/components/google-one-tap";
import { getBaseUrl } from "@/lib/utils";
import { headers } from 'next/headers';

export const metadata: Metadata = {
  metadataBase: new URL(getBaseUrl()),
  title: {
    default:
      "Promptexify - AI Prompt Directory for ChatGPT, Claude, Gemini, AI Code Editor, and more",
    template: "%s | Promptexify",
  },
  description:
    "Discover and share high-quality AI prompts for ChatGPT, Claude, Gemini, AI Code Editor, and more. Browse our comprehensive directory of tested prompts for creative writing, business, design, and more.",
  keywords: [
    "AI prompts",
    "ChatGPT prompts",
    "Claude prompts",
    "Gemini prompts",
    "AI Code Editor prompts",
    "prompt engineering",
    "AI tools",
    "AI prompt directory",
    "AI prompt library",
    "AI prompt engine",
    "AI prompt generator",
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
    url: getBaseUrl(),
    title: "Promptexify - AI Prompt Directory",
    description:
      "Discover and share high-quality AI prompts for ChatGPT, Claude, Gemini, and more. The comprehensive AI prompt directory for all your needs.",
    siteName: "Promptexify",
    images: [
      {
        url: "/static/og-image.png",
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
      "Discover and share high-quality AI prompts for ChatGPT, Claude, Gemini, and more.",
    images: ["/static/og-image.png"],
    creator: "@promptexify",
  },
  icons: {
    icon: "/static/favicon/favicon.ico",
    shortcut: "/static/favicon/favicon-16x16.png",
    apple: "/static/favicon/apple-touch-icon.png",
  },
  manifest: "/static/favicon/site.webmanifest",
};

export default async function RootLayout({
  children,
  modal,
}: Readonly<{
  children: React.ReactNode;
  modal: React.ReactNode;
}>) {
  // Get CSP nonce for inline scripts/styles following csp.md approach
  const headersList = await headers();
  const nonce = headersList.get('x-nonce') || '';
  const isProduction = process.env.NODE_ENV === "production";

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* All security headers are now handled by middleware following csp.md */}
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
        
        {/* CSP nonce handling following csp.md approach */}
        {nonce && isProduction && (
          <script
            nonce={nonce}
            suppressHydrationWarning={true}
            dangerouslySetInnerHTML={{
              __html: `window.__CSP_NONCE__ = "${nonce}";`,
            }}
          />
        )}
        {/* In development, set global without nonce to avoid CSP conflicts */}
        {!isProduction && (
          <script
            suppressHydrationWarning={true}
            dangerouslySetInnerHTML={{
              __html: `window.__CSP_NONCE__ = null; // Development mode - no CSP nonces`,
            }}
          />
        )}
      </head>
      <body className={GeistMono.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          {modal}
          <GoogleOneTap />
          <Analytics />
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
