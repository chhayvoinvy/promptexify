import React from "react";
import { ErrorBoundary, CompactErrorFallback } from "./error-boundary";

interface SafeAsyncProps {
  children: React.ReactNode;
  variant?: "default" | "compact";
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

/**
 * SafeAsync component that wraps async components with proper error handling
 * to prevent Suspense boundary errors from causing fallback to client rendering.
 * 
 * This component should wrap async server components that are placed inside Suspense boundaries.
 * Uses built-in error fallbacks to avoid client/server component conflicts.
 */
export function SafeAsync({ children, variant = "default", onError }: SafeAsyncProps) {
  // Use the appropriate built-in fallback based on variant
  const fallback = variant === "compact" ? CompactErrorFallback : undefined;
  
  return (
    <ErrorBoundary fallback={fallback} onError={onError}>
      {children}
    </ErrorBoundary>
  );
}

/**
 * Higher-order component that wraps async components with SafeAsync
 */
export function withSafeAsync<P extends object>(
  AsyncComponent: React.ComponentType<P>,
  options: {
    variant?: "default" | "compact";
    onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  } = {}
) {
  return function SafeAsyncWrapper(props: P) {
    return (
      <SafeAsync {...options}>
        <AsyncComponent {...props} />
      </SafeAsync>
    );
  };
}

/**
 * Utility function to handle Promise.all errors gracefully
 * Returns partial results with error information for failed promises
 */
export async function safePromiseAll<T>(
  promises: Promise<T>[],
  options: {
    throwOnAllFailed?: boolean;
    logErrors?: boolean;
  } = {}
): Promise<{ results: (T | Error)[]; hasErrors: boolean; successCount: number }> {
  const { throwOnAllFailed = true, logErrors = true } = options;
  
  const settledPromises = await Promise.allSettled(promises);
  const results: (T | Error)[] = [];
  let successCount = 0;
  
  for (const settled of settledPromises) {
    if (settled.status === "fulfilled") {
      results.push(settled.value);
      successCount++;
    } else {
      const error = new Error(settled.reason?.message || "Promise failed");
      results.push(error);
      if (logErrors) {
        console.error("Promise in safePromiseAll failed:", settled.reason);
      }
    }
  }
  
  const hasErrors = successCount < promises.length;
  
  // If all promises failed and throwOnAllFailed is true, throw the first error
  if (successCount === 0 && throwOnAllFailed && results.length > 0) {
    const firstError = results[0] as Error;
    throw firstError;
  }
  
  return { results, hasErrors, successCount };
} 