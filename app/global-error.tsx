"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RefreshCwIcon, HomeIcon, AlertTriangleIcon } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
          <div className="max-w-2xl w-full">
            <Card className="shadow-2xl border-0 bg-card/50 backdrop-blur-sm">
              <CardHeader className="text-center space-y-6 pb-8">
                <div className="mx-auto w-24 h-24 bg-destructive/10 rounded-full flex items-center justify-center">
                  <AlertTriangleIcon className="w-12 h-12 text-destructive" />
                </div>
                <div className="space-y-2">
                  <CardTitle className="text-3xl font-bold text-foreground">
                    Something went wrong
                  </CardTitle>
                  <CardDescription className="text-lg text-muted-foreground max-w-md mx-auto">
                    We encountered an unexpected error. Our team has been
                    notified and is working on a fix. Please try again later.
                  </CardDescription>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Error details for development */}
                {process.env.NODE_ENV === "development" && (
                  <div className="bg-muted/30 rounded-lg p-4">
                    <p className="text-sm font-mono text-muted-foreground">
                      Error: {error.message}
                    </p>
                    {error.digest && (
                      <p className="text-xs font-mono text-muted-foreground mt-2">
                        Digest: {error.digest}
                      </p>
                    )}
                  </div>
                )}

                {/* Action buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Button
                    onClick={reset}
                    variant="default"
                    size="lg"
                    className="h-14"
                  >
                    <RefreshCwIcon className="w-5 h-5 mr-3" />
                    <div className="text-left">
                      <div className="font-semibold">Try Again</div>
                      <div className="text-xs opacity-90">Reload the page</div>
                    </div>
                  </Button>

                  <Button
                    onClick={() => (window.location.href = "/")}
                    variant="outline"
                    size="lg"
                    className="h-14"
                  >
                    <HomeIcon className="w-5 h-5 mr-3" />
                    <div className="text-left">
                      <div className="font-semibold">Go Home</div>
                      <div className="text-xs opacity-70">Back to safety</div>
                    </div>
                  </Button>
                </div>

                {/* Contact support */}
                <div className="bg-muted/30 rounded-lg p-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    If the problem persists, please{" "}
                    <a
                      href="/contact"
                      className="text-primary hover:underline font-medium"
                    >
                      contact our support team
                    </a>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </body>
    </html>
  );
}
