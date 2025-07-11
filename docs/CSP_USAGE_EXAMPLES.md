# CSP Usage Examples

This document provides practical examples of how to use the Content Security Policy (CSP) utilities in different scenarios.

## Basic Usage Patterns

### 1. Safe CSP Nonce in Layouts

Use this pattern in layouts and components that might be statically rendered:

```typescript
// app/layout.tsx
import { CSPNonce } from '@/lib/csp';

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // ✅ Safe method - handles both static and dynamic contexts
  const nonce = await CSPNonce.getFromHeadersSafe();
  const isProduction = process.env.NODE_ENV === "production";

  return (
    <html lang="en">
      <head>
        {/* Only add nonce script if we have a nonce (dynamic context) */}
        {nonce && isProduction && (
          <script
            nonce={nonce}
            dangerouslySetInnerHTML={{
              __html: `window.__CSP_NONCE__ = "${nonce}";`,
            }}
          />
        )}
      </head>
      <body>{children}</body>
    </html>
  );
}
```

### 2. Dynamic Pages Requiring Nonces

For pages that need CSP nonces at runtime, mark them as dynamic:

```typescript
// app/dashboard/analytics/page.tsx
import { useDynamicCSPNonce } from '@/lib/dynamic-csp';

// ✅ Force this page to be server-rendered
export const dynamic = 'force-dynamic';

export default async function AnalyticsPage() {
  // ✅ Safe to use getFromHeaders() since page is marked dynamic
  const nonce = await useDynamicCSPNonce();

  return (
    <div>
      <h1>Analytics Dashboard</h1>
      {nonce && (
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: `
              // Analytics initialization with nonce
              gtag('config', 'GA_MEASUREMENT_ID');
            `,
          }}
        />
      )}
    </div>
  );
}
```

### 3. Components with Conditional CSP Content

```typescript
// components/analytics-tracker.tsx
import { getCSPContext } from '@/lib/dynamic-csp';

export async function AnalyticsTracker() {
  const { nonce, isProduction, hasNonce } = await getCSPContext();

  if (!isProduction) {
    return null; // Don't render analytics in development
  }

  return (
    <>
      {hasNonce && (
        <script
          nonce={nonce!}
          dangerouslySetInnerHTML={{
            __html: `
              gtag('js', new Date());
              gtag('config', '${process.env.NEXT_PUBLIC_GA_ID}');
            `,
          }}
        />
      )}
    </>
  );
}
```

### 4. Client Components with CSP Nonces

```typescript
// components/dynamic-chart.tsx
'use client';

import { useEffect, useState } from 'react';

export function DynamicChart() {
  const [nonce, setNonce] = useState<string | null>(null);

  useEffect(() => {
    // ✅ Get nonce from window global (set by layout)
    const cspNonce = (window as any).__CSP_NONCE__;
    setNonce(cspNonce);
  }, []);

  useEffect(() => {
    if (!nonce) return;

    // ✅ Dynamically create script with nonce
    const script = document.createElement('script');
    script.nonce = nonce;
    script.textContent = `
      // Chart initialization code
      initializeChart();
    `;
    document.head.appendChild(script);

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, [nonce]);

  return <div id="chart-container">Loading chart...</div>;
}
```

## Advanced Patterns

### 5. Conditional Rendering Based on CSP Context

```typescript
// components/secure-content.tsx
import { withCSPNonce } from '@/lib/dynamic-csp';

export async function SecureContent() {
  return withCSPNonce(async (nonce) => {
    if (nonce) {
      // We have a secure context, render enhanced content
      return (
        <div>
          <h2>Enhanced Secure Content</h2>
          <script
            nonce={nonce}
            dangerouslySetInnerHTML={{
              __html: `console.log('Secure script executed');`,
            }}
          />
        </div>
      );
    } else {
      // Static context, render basic content
      return (
        <div>
          <h2>Basic Content</h2>
          <p>Static version - no inline scripts</p>
        </div>
      );
    }
  });
}
```

### 6. CSP-Aware Third-Party Integration

```typescript
// components/google-analytics.tsx
import { getCSPContext } from '@/lib/dynamic-csp';

export async function GoogleAnalytics() {
  const { nonce, isProduction } = await getCSPContext();

  if (!isProduction || !process.env.NEXT_PUBLIC_GA_ID) {
    return null;
  }

  return (
    <>
      {/* External script - no nonce needed */}
      <script
        async
        src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`}
      />
      
      {/* Inline script - needs nonce */}
      {nonce && (
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${process.env.NEXT_PUBLIC_GA_ID}');
            `,
          }}
        />
      )}
    </>
  );
}
```

### 7. Custom Hook for CSP Nonce in Client Components

```typescript
// hooks/use-csp-nonce.ts
'use client';

import { useEffect, useState } from 'react';

export function useCSPNonce() {
  const [nonce, setNonce] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const cspNonce = (window as any).__CSP_NONCE__;
    setNonce(cspNonce);
    setIsLoaded(true);
  }, []);

  return { nonce, isLoaded };
}

// Usage in component:
export function MyComponent() {
  const { nonce, isLoaded } = useCSPNonce();

  if (!isLoaded) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      {nonce ? (
        <div>Secure mode enabled</div>
      ) : (
        <div>Basic mode</div>
      )}
    </div>
  );
}
```

## Common Mistakes to Avoid

### ❌ Wrong: Using getFromHeaders() in Static Contexts

```typescript
// This will break static site generation
export default async function StaticPage() {
  const nonce = await CSPNonce.getFromHeaders(); // ❌ Will cause build error
  return <div>Page content</div>;
}
```

### ✅ Correct: Using Safe Method

```typescript
// This works in both static and dynamic contexts
export default async function StaticPage() {
  const nonce = await CSPNonce.getFromHeadersSafe(); // ✅ Safe
  return (
    <div>
      Page content
      {/* Handle both cases gracefully */}
      {nonce && <script nonce={nonce}>/* secure script */</script>}
    </div>
  );
}
```

### ❌ Wrong: Not Handling Null Nonces

```typescript
// This will break when nonce is null
const nonce = await CSPNonce.getFromHeadersSafe();
return <script nonce={nonce}>/* script */</script>; // ❌ nonce might be null
```

### ✅ Correct: Graceful Null Handling

```typescript
// This handles null nonces gracefully
const nonce = await CSPNonce.getFromHeadersSafe();
return (
  <>
    {nonce && <script nonce={nonce}>/* script */</script>} {/* ✅ Safe */}
  </>
);
```

## Best Practices

1. **Use Safe Methods**: Always use `getFromHeadersSafe()` in layouts and potentially static components
2. **Mark Dynamic Pages**: Use `export const dynamic = 'force-dynamic'` for pages that require nonces
3. **Handle Null Values**: Always check if nonce exists before using it
4. **Separate Concerns**: Keep CSP-dependent code separate from static content
5. **Test Both Modes**: Test your application in both static and dynamic rendering modes
6. **Monitor CSP Reports**: Regularly check CSP violation reports for missing hashes

## Migration Guide

If you're migrating from the old CSP implementation:

1. Replace `CSPNonce.getFromHeaders()` with `CSPNonce.getFromHeadersSafe()` in layouts
2. Add `export const dynamic = 'force-dynamic'` to pages that require nonces
3. Add null checks for all nonce usage
4. Test the build process to ensure no static generation errors
5. Monitor CSP violation reports for any new issues

---

For more information, see the [CSP Fixes Summary](./CSP_FIXES_SUMMARY.md). 