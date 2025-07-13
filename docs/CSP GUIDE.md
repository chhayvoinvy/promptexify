Implementing a Content Security Policy (CSP) in Next.js 15+ is crucial for protecting your application against cross-site scripting (XSS) and other injection attacks. The best approach depends on your application's specific needs, balancing security with ease of implementation. For most modern Next.js applications, using middleware to dynamically set a nonce-based CSP is the recommended and most robust method.

However, for simpler applications with no inline scripts or styles, setting a static CSP in next.config.js can be a straightforward alternative.

Here's a breakdown of the best ways to work with CSP in Next.js 15+:

Middleware for a Dynamic, Nonce-Based CSP (Recommended)
Using middleware is the most secure and flexible way to implement CSP, especially when dealing with inline scripts, which are common in Next.js applications. A nonce (number used once) is a random string generated for each request, allowing you to approve specific inline scripts.

How it Works:
Generate a Nonce: In a middleware.ts file, you generate a unique, random string for each incoming request.

Set the CSP Header: You construct the CSP header string, including the generated nonce in the script-src and style-src directives.

Pass the Nonce: The nonce is passed to your application's components via a request header.

Apply the Nonce: In your root layout or individual components, you read the nonce from the headers and apply it to the nonce prop of any <Script> or <style> elements.

Example Implementation:
middleware.ts

TypeScript

import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic';
    style-src 'self' 'nonce-${nonce}';
    img-src 'self' blob: data:;
    font-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    block-all-mixed-content;
    upgrade-insecure-requests;
  `;

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set(
    'Content-Security-Policy',
    // Replace newline characters and spaces
    cspHeader.replace(/\s{2,}/g, ' ').trim()
  );

  return NextResponse.next({
    headers: requestHeaders,
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    {
      source: '/((?!api|_next/static|_next/image|favicon.ico).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
app/layout.tsx

TypeScript

import { headers } from 'next/headers';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const nonce = headers().get('x-nonce') || '';

  return (
    <html lang="en">
      <head>
        {/* Add any other head elements */}
      </head>
      <body>{children}</body>
    </html>
  );
}
Key CSP Directives Used:
'strict-dynamic': This is a powerful directive that allows trusted scripts to load other scripts, which simplifies CSP management in modern applications.

'nonce-${nonce}': Specifies the randomly generated nonce, allowing whitelisted inline scripts and styles to execute.

'self': Restricts loading resources to the same origin.

next.config.js for a Static CSP
If your application does not rely on inline scripts or styles, or if you have a very limited and known set of external sources, you can define a static CSP in your next.config.js file. This method is simpler but less flexible.

How it Works:
You define a headers function in your next.config.js file that returns an array of header objects.

Example Implementation:
next.config.mjs

JavaScript

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    const cspHeader = `
      default-src 'self';
      script-src 'self';
      style-src 'self';
      img-src 'self' blob: data:;
      font-src 'self';
      object-src 'none';
      base-uri 'self';
      form-action 'self';
      frame-ancestors 'none';
      block-all-mixed-content;
      upgrade-insecure-requests;
    `;

    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: cspHeader.replace(/\s{2,}/g, ' ').trim(),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
When to Use This Method:
For simple applications with no inline scripting or styling.

When all your scripts and styles are loaded from the same origin.

If you have a small, fixed set of external domains to whitelist.

Handling Common Challenges
Inline Styles from UI Libraries
Many UI libraries, such as Material-UI (MUI), inject inline styles, which can be challenging with a strict CSP. To address this, you'll need to configure the library to use the nonce generated in your middleware. This often involves a custom setup with a CacheProvider.

Reporting Violations
During development and even in production, it's beneficial to report CSP violations rather than enforcing them immediately. This allows you to identify what resources are being blocked. You can achieve this by using the Content-Security-Policy-Report-Only header instead of Content-Security-Policy. You can also specify a report-uri or report-to directive to send violation reports to a specified endpoint.


Sources





How can I allow specific header for NODE_ENV development and apply rules above regularly for production?



Show thinking
Of course. You can apply different Content Security Policy (CSP) headers for development and production by checking the process.env.NODE_ENV variable. This allows you to have a more relaxed policy during development for features like hot-reloading and a strict policy for production.

The best place to manage this is in your middleware.ts file, as it handles dynamic CSP generation.

Environment-Based CSP in Middleware
Here’s how you can modify your middleware.ts to apply different CSP rules based on the environment. In development, we'll add 'unsafe-eval' to script-src to allow for features like eval() which are used by Next.js for fast refresh.

middleware.ts

TypeScript

import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Base CSP directives
  let cspDirectives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    `style-src 'self' 'nonce-${nonce}'`,
    "img-src 'self' blob: data:",
    "font-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    'block-all-mixed-content',
    'upgrade-insecure-requests',
  ];

  // Add 'unsafe-eval' in development for hot-reloading
  if (isDevelopment) {
    cspDirectives[1] = `script-src 'self' 'unsafe-eval' 'nonce-${nonce}' 'strict-dynamic'`;
  }

  const cspHeader = cspDirectives.join('; ');

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set(
    'Content-Security-Policy',
    // Replace newline characters and spaces
    cspHeader.replace(/\s{2,}/g, ' ').trim()
  );

  return NextResponse.next({
    headers: requestHeaders,
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    {
      source: '/((?!api|_next/static|_next/image|favicon.ico).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
Key Changes:
Check NODE_ENV: We determine if the application is running in development mode by checking process.env.NODE_ENV === 'development'. Next.js automatically sets this for you.

Conditional Directive: An if statement checks if it's the development environment. If it is, it modifies the script-src directive to include 'unsafe-eval'.

Clean and Readable: This approach keeps your CSP rules organized and makes it clear which rules are environment-specific.

Now, when you run npm run dev, the more permissive CSP will be applied. When you build and run your application for production (npm run build and npm run start), the stricter CSP will be enforced.


Sources






What you're proposed above is the latest update following nextjs docs? and Based on above suggestions, how are hashes being generated?



Show thinking
Yes, the proposed method of using middleware for a dynamic, nonce-based Content Security Policy (CSP) is the latest and most robust approach recommended by the Next.js documentation for modern applications. It aligns perfectly with the dynamic nature of Next.js and the App Router.

How Nonces (Not Hashes) Are Generated
It's important to clarify that the recommended approach uses a nonce, not a hash. They serve a similar purpose but work differently. The code you were given generates a nonce for each request.

A nonce is a unique, random string generated for every single HTTP request. This nonce is added to the CSP header and also applied to individual script or style tags. The browser then allows only those tags with the correct nonce to execute.


Here is how the nonce is generated in the middleware.ts file:

TypeScript

// middleware.ts

// 1. A cryptographically secure random UUID is generated.
//    Example: "a1b2c3d4-e5f6-7890-1234-567890abcdef"
const randomUUID = crypto.randomUUID();

// 2. The UUID is converted to a Base64 string to ensure it's
//    a safe value for an HTTP header.
//    Example: "YTFiMmMzZDQtZTVmNi03ODkwLTEyMzQtNTY3ODkwYWJjZGVm"
const nonce = Buffer.from(randomUUID).toString('base64');
This nonce value is then inserted into the Content-Security-Policy header.

Nonce vs. Hash
While both are used to secure inline scripts, their implementation differs significantly:

Aspect

Nonce-Based CSP (Recommended for Next.js)

Hash-Based CSP

How it Works

A unique, random string is generated on every request. This nonce is added to the CSP header and to the script tags.

A cryptographic hash (e.g., SHA256) of the content of each inline script is calculated. These hashes are added to the CSP header.

Generation

Generated dynamically on the server for each request.

Calculated from the static content of the script, usually at build time.

Use Case

Ideal for dynamic, server-rendered pages where content can change on each request. This is the common case for Next.js apps.

Best for fully static pages where the script content never changes.

Maintenance

Easier to maintain. You generate one nonce and apply it where needed.

Becomes difficult to manage if scripts change, as you must regenerate and update all corresponding hashes in your policy.


Export to Sheets
Because Next.js applications are highly dynamic and often involve server-side rendering, a nonce-based approach is far more practical and secure. It adapts to the dynamic content without requiring you to pre-calculate hashes of every possible script variation.