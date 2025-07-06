declare module "@sentry/nextjs" {
  import * as SentryCore from "@sentry/types";
  export * from "@sentry/types";
  export const init: typeof SentryCore.init;
  export const captureException: typeof SentryCore.captureException;
  export const captureMessage: typeof SentryCore.captureMessage;
  export const captureEvent: typeof SentryCore.captureEvent;
  export const withScope: typeof SentryCore.withScope;
  export const configureScope: typeof SentryCore.configureScope;
}
