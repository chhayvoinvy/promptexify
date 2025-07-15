"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "@/components/ui/icons";

/**
 * AsyncErrorFallback specifically designed for data loading errors
 * This is a client component that can handle user interactions
 */
export function AsyncErrorFallback({ error, retry }: { error: Error; retry: () => void }) {
  const isNetworkError = error.message.includes("fetch") || error.message.includes("network");
  const isDatabaseError = error.message.includes("database") || error.message.includes("connection");
  
  let errorTitle = "Loading Error";
  let errorDescription = "We encountered an issue while loading this content.";
  
  if (isNetworkError) {
    errorTitle = "Network Error";
    errorDescription = "Unable to connect to the server. Please check your internet connection.";
  } else if (isDatabaseError) {
    errorTitle = "Database Error";
    errorDescription = "We're experiencing database connectivity issues. Please try again in a moment.";
  }

  return (
    <Card className="w-full">
      <CardContent className="flex flex-col items-center justify-center py-8">
        <div className="w-12 h-12 mb-4 bg-destructive/10 rounded-full flex items-center justify-center">
          <AlertTriangle className="w-6 h-6 text-destructive" />
        </div>
        <h3 className="text-lg font-semibold mb-2">{errorTitle}</h3>
        <p className="text-muted-foreground text-center mb-4 max-w-md">
          {errorDescription}
        </p>
        {process.env.NODE_ENV === "development" && (
          <div className="mb-4 p-3 bg-muted rounded-md max-w-md w-full">
            <p className="text-xs font-mono text-muted-foreground break-all">
              {error.message}
            </p>
          </div>
        )}
        <Button onClick={retry} variant="default">
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </Button>
      </CardContent>
    </Card>
  );
}

/**
 * Compact error fallback for smaller components
 * This is a client component for interactive error handling
 */
export function CompactAsyncErrorFallback({ retry }: { error: Error; retry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center p-6 text-center bg-muted/50 rounded-lg border border-dashed border-muted-foreground/25">
      <AlertTriangle className="w-8 h-8 text-destructive mb-2" />
      <p className="text-sm text-muted-foreground mb-3">
        Failed to load content
      </p>
      <Button variant="outline" size="sm" onClick={retry}>
        <RefreshCw className="w-3 h-3 mr-1" />
        Retry
      </Button>
    </div>
  );
}

/**
 * Simple error fallback without retry functionality
 * For cases where retry doesn't make sense
 */
export function SimpleAsyncErrorFallback({ error }: { error: Error }) {
  const isNetworkError = error.message.includes("fetch") || error.message.includes("network");
  
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <AlertTriangle className="w-12 h-12 text-destructive mb-4" />
      <h3 className="text-lg font-semibold mb-2">
        {isNetworkError ? "Connection Error" : "Something went wrong"}
      </h3>
      <p className="text-muted-foreground max-w-md">
        {isNetworkError 
          ? "Please check your internet connection and refresh the page." 
          : "We encountered an error while loading this content."}
      </p>
      {process.env.NODE_ENV === "development" && (
        <div className="mt-4 p-3 bg-muted rounded-md max-w-md w-full">
          <p className="text-xs font-mono text-muted-foreground break-all">
            {error.message}
          </p>
        </div>
      )}
    </div>
  );
} 