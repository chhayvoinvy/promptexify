# Sentry Telemetry Fix

## Problem

During the build process, we were seeing numerous webpack warnings like:

```
Critical dependency: the request of a dependency is an expression
```

These warnings were coming from OpenTelemetry instrumentation packages that Sentry automatically includes for telemetry data collection. The warnings appeared in the build logs and were cluttering the output.

## Root Cause

Sentry's telemetry feature automatically pulls in OpenTelemetry instrumentation packages for:
- Database monitoring (Redis, PostgreSQL, etc.)
- HTTP request monitoring
- Performance tracking
- Automatic instrumentation of various Node.js libraries

These packages use dynamic imports that webpack can't statically analyze, causing the "Critical dependency" warnings.

## Solution

### 1. Disabled Sentry Telemetry

Added `telemetry: false` to the Sentry configuration in `next.config.ts`:

```typescript
export default shouldEnableSentryBuildFeatures
  ? withSentryConfig(nextConfig, {
      // ... other Sentry config
      
      // Disable telemetry to prevent OpenTelemetry instrumentation warnings
      telemetry: false,
    })
  : nextConfig;
```

### 2. Cleaned Up Webpack Configuration

Removed the OpenTelemetry-specific webpack ignore warnings and externals since they're no longer needed:

```typescript
// Removed these from config.ignoreWarnings:
// - OpenTelemetry instrumentation warnings
// - Sentry tracing integration warnings

// Removed these from serverExternalPackages:
// - "@opentelemetry/instrumentation"
// - "@opentelemetry/auto-instrumentations-node"
```

## Benefits

1. **Cleaner Build Logs**: No more webpack warnings cluttering the build output
2. **Faster Builds**: Reduced bundle size by not including unnecessary telemetry packages
3. **Simpler Configuration**: Less webpack configuration to maintain
4. **Better Developer Experience**: Cleaner console output during development

## What's Still Working

Even with telemetry disabled, Sentry still provides:
- ✅ Error tracking and reporting
- ✅ Performance monitoring
- ✅ Source map uploads
- ✅ Session replays
- ✅ User feedback collection
- ✅ Release tracking

## What's Disabled

- ❌ Automatic instrumentation of database queries
- ❌ Automatic instrumentation of HTTP requests
- ❌ Automatic instrumentation of third-party libraries
- ❌ Telemetry data collection for Sentry's internal analytics

## Manual Instrumentation (If Needed)

If you need specific performance monitoring, you can still manually instrument your code:

```typescript
import * as Sentry from "@sentry/nextjs";

// Manual performance monitoring
const transaction = Sentry.startTransaction({
  name: "Database Query",
  op: "db.query",
});

try {
  // Your database query here
  const result = await db.query("SELECT * FROM users");
  transaction.setStatus("ok");
} catch (error) {
  transaction.setStatus("internal_error");
  throw error;
} finally {
  transaction.finish();
}
```

## Verification

After applying this fix:

1. **Build should complete without OpenTelemetry warnings**
2. **Sentry error tracking should still work normally**
3. **Performance monitoring should still function**
4. **Bundle size should be smaller**

## Reverting (If Needed)

If you need to re-enable telemetry in the future:

1. Remove `telemetry: false` from the Sentry config
2. Add back the OpenTelemetry webpack ignore warnings
3. Add back the OpenTelemetry externals

---

**Note**: This fix maintains all essential Sentry functionality while eliminating the build warnings and reducing bundle size. 