# Content Security Policy (CSP) Configuration

This document explains how the CSP is configured in this Next.js application to support all external services while maintaining security.

## Supported External Services

The CSP configuration includes support for:

### 🔐 Authentication & Database
- **Supabase**: API calls, storage, and realtime connections
- **Redis**: Cloud Redis services (if using HTTP API)

### 📊 Analytics & Advertising  
- **Google Analytics**: GA4 and Universal Analytics
- **Google AdSense**: Advertisement serving and tracking
- **Vercel Analytics**: Web vitals and performance monitoring

### 🎨 UI & Fonts
- **Google Fonts**: Font loading from Google's CDN
- **Google One Tap**: Authentication widget

### 📝 Content Management
- **Sanity**: CMS API calls and image serving

### 💳 Payments
- **Stripe**: Payment processing, checkout, and webhooks

### 📁 File Storage
- **AWS S3**: File uploads and serving
- **DigitalOcean Spaces**: Alternative file storage

### 🌐 CDN Support
- **CloudFront**: AWS CloudFront distributions
- **Cloudflare**: Cloudflare CDN
- **Custom CDN**: Any custom CDN configuration

## Environment Variables

Configure these environment variables for more specific (and secure) CSP rules:

```bash
# Required
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co

# Recommended
NEXT_PUBLIC_SANITY_PROJECT_ID=your-sanity-project-id

# Optional CDN Configuration (recommended for production)
NEXT_PUBLIC_CLOUDFRONT_URL=https://d1234567890.cloudfront.net
NEXT_PUBLIC_CLOUDFLARE_URL=https://your-domain.cdn.cloudflare.net
NEXT_PUBLIC_CDN_URL=https://cdn.yourdomain.com
```

## CSP Directives Breakdown

### `script-src`
Allows scripts from:
- Self (your domain)
- Google Analytics & AdSense
- Google One Tap authentication
- Stripe payment processing
- Vercel Analytics (`https://va.vercel-scripts.com`)
- Nonce-based inline scripts (recommended)

### `style-src`
Allows styles from:
- Self (your domain)
- Google Fonts
- Stripe checkout
- Nonce-based inline styles (recommended)

### `img-src`
Allows images from:
- Self (your domain)
- All HTTPS sources (fallback)
- Supabase storage
- Google services (profile pictures, etc.)
- AWS S3 and DigitalOcean Spaces
- Sanity CMS
- CDN domains (if configured)

### `connect-src`
Allows API connections to:
- Self (your domain)
- Supabase API and realtime
- Sanity CMS API
- Google Analytics
- Stripe API
- S3 and DigitalOcean Spaces
- Vercel Analytics (`https://vitals.vercel-insights.com`, `https://vitals.vercel-analytics.com`)
- CDN domains (if configured)

### `font-src`
Allows fonts from:
- Self (your domain)
- Google Fonts CDN

### `frame-src`
Allows iframes from:
- Google One Tap
- Stripe checkout
- Google AdSense (limited)

## Testing Your CSP

### 1. Debug Endpoint
Visit `/api/security/csp-debug` (development only, or admin-only in production) to see:
- Current CSP configuration
- Detected environment variables
- Recommendations for improvement

### 2. Browser DevTools
1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for CSP violation messages like:
   ```
   Content Security Policy: The page's settings blocked the loading of a resource at [URL]
   ```

### 3. Test Common Scenarios
- Load pages with Google Fonts
- Test Stripe checkout flow
- Verify Supabase authentication
- Check image loading from S3/DigitalOcean
- Test Google Analytics tracking
- Verify Vercel Analytics is working

## Common CSP Issues & Solutions

### Issue: Google Fonts not loading
**Solution**: Ensure both `fonts.googleapis.com` and `fonts.gstatic.com` are allowed in `font-src` and `style-src`.

### Issue: Stripe checkout fails
**Solution**: Verify `js.stripe.com` and `checkout.stripe.com` are in `script-src`, `connect-src`, and `frame-src`.

### Issue: Supabase authentication fails
**Solution**: Check that your `NEXT_PUBLIC_SUPABASE_URL` is correctly set and the domain is in `connect-src`.

### Issue: Images from S3/CDN not loading
**Solution**: Add your specific CDN domain to environment variables, or ensure the wildcard patterns match your URLs.

### Issue: Google Analytics not working
**Solution**: Verify `www.google-analytics.com` and `www.googletagmanager.com` are in both `script-src` and `connect-src`.

### Issue: Vercel Analytics not working
**Solution**: Verify `va.vercel-scripts.com` is in `script-src` and `vitals.vercel-insights.com` is in `connect-src`.

## Production Recommendations

1. **Set specific domains** instead of wildcards when possible
2. **Configure CDN URLs** via environment variables
3. **Monitor CSP violations** using the `/api/security/csp-report` endpoint
4. **Remove `https:` fallback** from `img-src` for stricter security
5. **Use nonces** for all inline scripts and styles
6. **Test thoroughly** before deploying to production

## Development vs Production

The CSP automatically adjusts based on `NODE_ENV`:

**Development:**
- Allows `unsafe-eval` for hot reloading
- Allows `unsafe-inline` as fallback
- Permits localhost connections
- More permissive for debugging

**Production:**
- Stricter rules with nonce-based security
- No unsafe directives
- More specific domain restrictions
- Enhanced monitoring

## CSP Violation Monitoring

CSP violations are automatically logged to:
- Console (development)
- Application logs (production)
- `/api/security/csp-report` endpoint

Consider integrating with monitoring services like:
- Sentry
- DataDog
- New Relic
- LogRocket

## Troubleshooting

If you encounter CSP issues:

1. Check the browser console for violation messages
2. Visit `/api/security/csp-debug` for configuration details
3. Verify environment variables are set correctly
4. Test with nonce-based inline scripts/styles
5. Review network requests in DevTools
6. Check that external service URLs match CSP allowlists

For additional help, refer to the CSP specification at: https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP 