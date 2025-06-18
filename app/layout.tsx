import type { Metadata } from "next";
import { GeistMono } from "geist/font/mono";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { GoogleOneTap } from "@/components/google-one-tap";
import "./globals.css";

export const metadata: Metadata = {
  title: "Promptexify",
  description:
    "Promptexify is a tool that helps you create prompts for your AI models.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={GeistMono.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <GoogleOneTap />
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
