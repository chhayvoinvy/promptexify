# Content Security Policy (CSP) Fixes Summary

## Overview

This document summarizes the Content Security Policy fixes implemented to resolve CSP violations in production, particularly for Sanity CMS integration and various inline scripts.

## Issues Resolved

### 1. Static Site Generation (SSG) Conflicts
**Error**: `Dynamic server usage: Route couldn't be rendered statically because it used 'headers'`
**Affected Routes**: `/`, `/signin`, `/signup`, `/features`, `/help`, `/pricing`, `/prompt-generator`, etc.

**Root Cause**: The root layout was calling `CSPNonce.getFromHeaders()` which tries to access request headers during static site generation when no headers are available.

**Fix**: 
- Created `CSPNonce.getFromHeadersSafe()` method that gracefully handles static rendering
- Updated root layout to use the safe method
- Added proper error detection for static rendering contexts
- Static pages now build successfully without CSP nonce errors

### 2. Initial Inline Script Violation
**Error**: `Refused to execute inline script because it violates the following Content Security Policy directive`
**Hash Missing**: `'sha256-iOJJUj3iCtIlZA3XJK8dd9RNwaBp8ncWIqualJK/HUWSM='`

**Fix**: Added the missing hash to `CSP_HASHES.SCRIPTS` array in `lib/csp.ts`

### 2. Sanity CMS WebSocket Connection
**Error**: `Refused to connect to 'wss://q1et0guo.api.sanity.io/v2022-06-30/socket/production'`

**Fix**: Added `wss://*.api.sanity.io` to the `connect-src` directive for both production and development CSP policies.

### 3. Sanity CMS Inline Styles
**Error**: Multiple inline style violations from Sanity Studio
**Hashes Missing**: 
- `'sha256-0/TUJR2e8LYCBRhRHap5/yeWLDibr3I9vkHArk3DX9I='`
- `'sha256-H2xDirDcQVcpRmgDFGCE6G5DXZx14hy+aINR3qqO7Ms='`

**Fix**: Added missing hashes to `CSP_HASHES.STYLES` array and included `https://*.sanity.io` in style-src directive.

### 4. Sanity CMS General Support
**Fix**: Added comprehensive Sanity support to CSP:
- `script-src`: Added `https://*.sanity.io`
- `style-src`: Added `https://*.sanity.io`
- `frame-src`: Added `https://*.sanity.io`
- `connect-src`: Added `https://*.api.sanity.io` and `wss://*.api.sanity.io`

## Files Modified

### 1. `lib/csp.ts`
- **CSP_HASHES.SCRIPTS**: Added missing script hash
- **CSP_HASHES.STYLES**: Added Sanity inline style hashes
- **generateCSP()**: Enhanced with Sanity domains, better error handling, and validation
- **CSPNonce class**: Improved reliability with fallback mechanisms and validation
- **Debug utilities**: Added hash calculation utilities for debugging

### 2. `app/api/security/csp-report/route.ts`
- **Enhanced reporting**: Better violation logging with hash calculation for debugging
- **TypeScript interface**: Added proper typing for CSP violation reports
- **Debug information**: Automatic hash calculation for script samples in development

### 3. `scripts/debug-csp.ts` (New)
- **Hash calculator**: Utility script to calculate hashes for inline content
- **Common patterns**: Pre-configured patterns for common inline scripts
- **CLI tool**: Can be run with `npm run debug:csp`

### 4. `lib/dynamic-csp.ts` (New)
- **Utility functions**: Safe CSP nonce handling for both static and dynamic contexts
- **Helper functions**: Utilities for creating nonce-protected inline scripts and styles
- **Type definitions**: TypeScript interfaces for CSP contexts

### 5. `app/layout.tsx`
- **Safe nonce handling**: Updated to use `CSPNonce.getFromHeadersSafe()` instead of `getFromHeaders()`
- **Static rendering support**: Now supports both static generation and dynamic rendering

### 6. `package.json`
- **New scripts**: Added `debug:csp` and `debug:csp-hash` commands

## Current CSP Configuration

### Production CSP Directives

```csp
default-src 'self';
script-src 'self' 'nonce-{NONCE}' 'strict-dynamic' {SCRIPT_HASHES} https://www.googletagmanager.com https://www.google-analytics.com https://accounts.google.com https://vitals.vercel-insights.com https://va.vercel-scripts.com https://securepubads.g.doubleclick.net https://pagead2.googlesyndication.com https://*.sanity.io;
style-src 'self' 'nonce-{NONCE}' 'unsafe-hashes' https://fonts.googleapis.com https://accounts.google.com https://*.sanity.io {STYLE_HASHES} https://pagead2.googlesyndication.com;
img-src 'self' blob: data: https: https://*.s3.amazonaws.com https://*.cloudfront.net https://cdn.sanity.io/ https://pagead2.googlesyndication.com;
font-src 'self' https://fonts.gstatic.com;
connect-src 'self' https://api.stripe.com https://*.supabase.co wss://*.supabase.co https://*.s3.amazonaws.com https://*.cloudfront.net https://vitals.vercel-analytics.com wss://vitals.vercel-analytics.com https://accounts.google.com https://*.api.sanity.io wss://*.api.sanity.io https://pagead2.googlesyndication.com;
frame-src 'self' https://accounts.google.com https://googleads.g.doubleclick.net https://tpc.googlesyndication.com https://pagead2.googlesyndication.com https://*.sanity.io;
media-src 'self' blob: data: https://*.s3.amazonaws.com https://*.cloudfront.net;
object-src 'none';
base-uri 'self';
form-action 'self';
frame-ancestors 'none';
upgrade-insecure-requests;
report-uri /api/security/csp-report;
worker-src 'self' blob:;
```

### Development CSP
Development mode uses more permissive policies with `'unsafe-inline'` and `'unsafe-eval'` for easier development, while still including Sanity domains and the CSP report endpoint for debugging.

## Static vs Dynamic Page Handling

### Static Pages (SSG)
Static pages are generated at build time and don't have access to request headers. Our CSP implementation gracefully handles this:

- **Root Layout**: Uses `CSPNonce.getFromHeadersSafe()` which returns `null` during static generation
- **No Nonce Required**: Static pages don't need nonces since they don't execute inline scripts at request time
- **Build Success**: Pages can be statically generated without CSP-related errors

### Dynamic Pages (SSR)
Pages that need CSP nonces at runtime must be marked as dynamic:

```typescript
// For pages that require nonces
export const dynamic = 'force-dynamic';

// Or use the utility
import { requireDynamicCSP } from '@/lib/dynamic-csp';
export const dynamic = requireDynamicCSP();
```

### Safe CSP Usage Patterns

```typescript
// ✅ Safe for both static and dynamic contexts
import { useSafeCSPNonce } from '@/lib/dynamic-csp';
const nonce = await useSafeCSPNonce();

// ✅ For pages that must be dynamic
import { useDynamicCSPNonce } from '@/lib/dynamic-csp';
export const dynamic = 'force-dynamic';
const nonce = await useDynamicCSPNonce();

// ❌ Don't use directly in layouts or static pages
const nonce = await CSPNonce.getFromHeaders(); // Can break SSG
```

## Debugging CSP Violations

### 1. Using the Debug Script
```bash
# Calculate hashes for common inline content
npm run debug:csp

# Calculate hash for specific content
npm run debug:csp-hash "your inline script here"
```

### 2. CSP Violation Reports
Monitor the `/api/security/csp-report` endpoint for violations. In development, detailed information including calculated hashes is logged to the console.

### 3. Browser Console
CSP violations appear in the browser console with details about:
- The blocked content
- The violated directive
- Suggested hashes (in our enhanced reporting)

## Ongoing Maintenance

### When Adding New Inline Content

1. **Check for CSP violations** in browser console
2. **Use the debug script** to calculate the hash:
   ```bash
   npm run debug:csp-hash "your new inline content"
   ```
3. **Add the hash** to the appropriate array in `lib/csp.ts`:
   - Scripts: `CSP_HASHES.SCRIPTS`
   - Styles: `CSP_HASHES.STYLES`
4. **Test thoroughly** in both development and production

### When Adding New Third-Party Services

1. **Identify required domains** from error messages
2. **Add domains to appropriate CSP directives**:
   - Scripts: Add to `script-src`
   - Styles: Add to `style-src`
   - Images: Add to `img-src`
   - API calls: Add to `connect-src`
   - Frames/iframes: Add to `frame-src`
3. **Test in production** environment

### Regular Monitoring

1. **Check CSP violation reports** regularly
2. **Monitor browser console** for new violations
3. **Review and update hashes** when content changes
4. **Audit CSP directives** periodically for unnecessary permissions

## Security Considerations

### Best Practices Implemented

1. **Strict nonce-based CSP** in production
2. **Hash-based allowlisting** for static inline content
3. **Minimal permissions** - only required domains are allowed
4. **Environment-aware policies** - stricter in production
5. **Comprehensive violation reporting** for monitoring
6. **Validation and error handling** for nonce generation

### Security Features

- **`'strict-dynamic'`**: Allows dynamically loaded scripts that are loaded by trusted scripts
- **`'unsafe-hashes'`**: Required for event handlers and some library styles
- **Nonce validation**: Ensures nonces are properly formatted and secure
- **Emergency fallback**: Graceful degradation if CSP generation fails
- **No `'unsafe-inline'`** in production for maximum security

## Troubleshooting Common Issues

### Issue: New CSP violations after deployment
**Solution**: 
1. Check CSP violation reports
2. Use debug script to calculate missing hashes
3. Add hashes to CSP configuration
4. Redeploy

### Issue: Sanity Studio not loading
**Solution**:
1. Verify all Sanity domains are in CSP directives
2. Check WebSocket connections are allowed
3. Ensure frame-src includes `https://*.sanity.io`

### Issue: Analytics not working
**Solution**:
1. Verify analytics domains in script-src and connect-src
2. Check for missing inline script hashes
3. Ensure proper nonce application

### Issue: CSP too restrictive for development
**Solution**:
1. Development mode uses permissive CSP with `'unsafe-inline'`
2. Can enable debug logging with `DEBUG_CSP=true`
3. CSP violations still reported for debugging

### Issue: Build errors with "Dynamic server usage" and CSP headers
**Error**: `Route couldn't be rendered statically because it used 'headers'`
**Solution**:
1. Use `CSPNonce.getFromHeadersSafe()` instead of `getFromHeaders()` in layouts
2. For pages that need nonces, mark them as dynamic:
   ```typescript
   export const dynamic = 'force-dynamic';
   ```
3. Check that components using CSP nonces handle `null` values gracefully
4. Static pages don't need nonces - they're generated at build time

### Issue: Pages not rendering after CSP changes
**Solution**:
1. Clear Next.js cache: `rm -rf .next`
2. Rebuild the application: `npm run build`
3. Check that dynamic exports are properly configured
4. Verify middleware is applying CSP headers correctly

## Environment Variables

- `NODE_ENV`: Determines CSP strictness level
- `DEBUG_CSP`: Enable detailed CSP logging (optional)

## Testing

### Manual Testing
1. **Open browser console** and check for CSP violations
2. **Test all interactive features** (forms, analytics, etc.)
3. **Verify Sanity Studio functionality** in `/dashboard/pages/studio`
4. **Check third-party integrations** (Google Auth, Stripe, etc.)

### Automated Testing
CSP violations are automatically reported to `/api/security/csp-report` and can be monitored through logging systems.

---

**Last Updated**: {Current Date}
**Next Review**: Schedule quarterly CSP audits to ensure continued security and functionality. 