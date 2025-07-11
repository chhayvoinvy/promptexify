import * as Sentry from "@sentry/nextjs";

export function register() {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampler: (samplingContext) => {
      if (samplingContext.location?.pathname?.includes("/api/")) {
        // High-importance transactions
        return 0.5;
      }
      // Default sample rate for other transactions
      return 0.1;
    },
    debug: false,
    spotlight: process.env.NODE_ENV === "development",
    replaysOnErrorSampleRate: 0.5,
    replaysSessionSampleRate: 0.01,
  });

  // Remove Redis verification from instrumentation to prevent build-time issues
  // Redis verification will be handled by individual API routes if needed
}

export { captureRequestError as onRequestError } from "@sentry/nextjs";
