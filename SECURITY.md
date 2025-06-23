# Security Implementation Guide

## Overview

This document outlines the comprehensive security measures implemented in the Promptexify application to protect against common web vulnerabilities and attacks. The security configuration automatically adapts to the environment (development vs production) to provide optimal security in production while maintaining development flexibility.

## 🌍 Environment-Aware Security

The application implements **production-ready security** that automatically adjusts based on the `NODE_ENV` environment variable:

### Production Environment (`NODE_ENV=production`)

- **Stricter CSP**: Removes `unsafe-inline` and `unsafe-eval` for maximum security
- **Enhanced Rate Limits**: Lower limits to prevent abuse
- **Restricted File Uploads**: Smaller file sizes and stricter type validation
- **Maximum Security Headers**: Full security header implementation
- **Error Masking**: Detailed errors hidden, only reference IDs shown
- **Performance Optimization**: Optimized for production workloads

### Development Environment (`NODE_ENV=development`)

- **Permissive CSP**: Allows inline scripts/styles for development tools
- **Lenient Rate Limits**: Higher limits for development workflow
- **Flexible File Uploads**: Larger sizes and additional formats for testing
- **Development Headers**: Less restrictive for local development
- **Detailed Errors**: Full error information for debugging
- **Development Tools**: Support for hot reload and dev servers

## 🔒 Security Measures Implemented

### 1. Input Validation & Sanitization

#### **Zod Schema Validation**

- **Location**: `lib/schemas.ts`
- **Protection**: Type-safe input validation for all API endpoints
- **Schemas Implemented**:
  - `createPostSchema`: Post creation with content length limits
  - `createTagSchema`: Tag validation with character restrictions
  - `createCategorySchema`: Category validation with safe characters
  - `fileUploadSchema`: File upload title validation
  - `searchSchema`: Search query validation with injection prevention
  - `updateUserProfileSchema`: User profile data validation

#### **Content Sanitization**

- **Location**: `lib/sanitize.ts`
- **Features**:
  - HTML entity escaping to prevent XSS
  - URL validation and protocol filtering
  - Filename sanitization for safe uploads
  - Search query sanitization
  - Slug generation with safe characters
  - Email validation and sanitization
  - JSON data recursive sanitization

### 2. Authentication & Authorization

#### **Multi-Layer Auth Protection**

- **Supabase Integration**: Secure magic link authentication
- **Role-Based Access Control**: USER and ADMIN role separation
- **Session Management**: Secure session handling with automatic cleanup
- **Protected Routes**: Middleware-based route protection

#### **Auth Security Features**

- Magic link expiration (1 hour)
- Account selection enforcement for OAuth
- Secure redirects with validation
- Session cleanup on logout

### 3. Rate Limiting

#### **Comprehensive Rate Limiting**

- **Location**: `lib/rate-limit.ts`
- **Implementation**: In-memory store with automatic cleanup
- **Rate Limits Configured**:
  - Authentication: 5 requests per 15 minutes
  - File Upload: 10 uploads per minute
  - Post Creation: 5 posts per minute
  - Tag Creation: 20 tags per minute
  - General API: 100 requests per minute
  - Search: 50 searches per minute
  - Interactions: 200 per minute

#### **Environment-Aware Rate Limits**

| Type           | Production | Development |
| -------------- | ---------- | ----------- |
| Authentication | 5/15min    | 10/15min    |
| File Upload    | 10/min     | 20/min      |
| Post Creation  | 3/min      | 10/min      |
| Tag Creation   | 15/min     | 50/min      |
| General API    | 60/min     | 200/min     |
| Search         | 30/min     | 100/min     |
| Interactions   | 100/min    | 500/min     |

#### **Rate Limit Features**

- User-based and IP-based identification
- Graceful degradation with retry headers
- Memory leak prevention with cleanup
- Detailed rate limit headers in responses
- Environment-aware configuration management

### 4. File Upload Security

#### **Environment-Aware File Upload Limits**

| File Type | Production | Development |
| --------- | ---------- | ----------- |
| Images    | 2MB        | 5MB         |
| Videos    | 10MB       | 50MB        |

#### **Multi-Layer File Validation**

- **Dynamic Size Limits**: Environment-based size restrictions
- **MIME Type Validation**: Strict allowlist of safe types
- **File Signature Validation**: Magic number verification
- **Extension Validation**: Dangerous extension blocking
- **Filename Sanitization**: Path traversal prevention

#### **Supported File Types**

| Environment     | Images          | Videos               |
| --------------- | --------------- | -------------------- |
| **Production**  | JPEG, PNG, WebP | MP4, WebM, QuickTime |
| **Development** | + GIF, BMP      | + AVI, MOV           |

- **Security**: File content validation against declared type

### 5. API Security

#### **Enhanced API Protection**

- **Input Validation**: Zod schemas for all endpoints
- **Rate Limiting**: Per-endpoint rate limiting
- **Security Headers**: Comprehensive security headers
- **Method Restriction**: Explicit method allowing/denying
- **Error Handling**: Secure error responses without information leakage

#### **Security Headers Implemented**

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Content-Security-Policy: (configured)
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
```

### 6. Database Security

#### **SQL Injection Prevention**

- **Prisma ORM**: Parameterized queries by default
- **Input Validation**: All inputs validated before database operations
- **Type Safety**: TypeScript ensuring type correctness
- **Sanitization**: User inputs sanitized before storage

#### **Data Access Control**

- **User Isolation**: Users can only access their own data
- **Admin Privileges**: Controlled admin access to all data
- **Soft Permissions**: Resource-level permission checks

### 7. Content Security Policy (CSP)

#### **Environment-Aware CSP Configuration**

| Directive         | Production                  | Development                                               |
| ----------------- | --------------------------- | --------------------------------------------------------- |
| `script-src`      | `'self' 'wasm-unsafe-eval'` | `'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval'` |
| `style-src`       | `'self'`                    | `'self' 'unsafe-inline'`                                  |
| `connect-src`     | Supabase URLs only          | + localhost, dev servers                                  |
| `img-src`         | `'self' data: https: blob:` | Same                                                      |
| `default-src`     | `'self'`                    | Same                                                      |
| `object-src`      | `'none'`                    | Same                                                      |
| `frame-ancestors` | `'none'`                    | Same                                                      |

#### **Production CSP Features**

- **No Unsafe Inline**: Removes `unsafe-inline` for scripts and styles
- **CSP Reporting**: Optional violation reporting to monitor attacks
- **Strict Policies**: Maximum security with minimal exceptions
- **CORS Protection**: Strict cross-origin policies

#### **Development CSP Features**

- **Development Tools**: Allows hot reload and dev server connections
- **Inline Styles**: Permits inline styles for development convenience
- **Flexible Connections**: Allows localhost and dev server connections

### 8. HTTPS & Transport Security

#### **Transport Layer Security**

- **HSTS**: Strict Transport Security enabled
- **Secure Cookies**: Supabase handles secure session cookies
- **Redirect Security**: HTTPS enforcement in production

## 🚨 Vulnerabilities Addressed

### 1. **Cross-Site Scripting (XSS)**

- **Protection**: Input sanitization, CSP headers, HTML entity escaping
- **Status**: ✅ Protected

### 2. **SQL Injection**

- **Protection**: Prisma ORM with parameterized queries, input validation
- **Status**: ✅ Protected

### 3. **Cross-Site Request Forgery (CSRF)**

- **Protection**: Supabase CSRF protection, SameSite cookies
- **Status**: ✅ Protected

### 4. **File Upload Attacks**

- **Protection**: File type validation, size limits, signature verification
- **Status**: ✅ Protected

### 5. **Denial of Service (DoS)**

- **Protection**: Rate limiting, file size limits, input length limits
- **Status**: ✅ Protected

### 6. **Information Disclosure**

- **Protection**: Secure error handling, minimal error information
- **Status**: ✅ Protected

### 7. **Path Traversal**

- **Protection**: Filename sanitization, path validation
- **Status**: ✅ Protected

### 8. **Authentication Bypass**

- **Protection**: Multi-layer auth checks, session validation
- **Status**: ✅ Protected

## 🔧 Environment Configuration

### Setting up Production Security

1. **Environment Variable**: Set `NODE_ENV=production`
2. **CSP Reporting** (Optional): Set `CSP_REPORT_URI` for violation monitoring
3. **Supabase URL**: Ensure `NEXT_PUBLIC_SUPABASE_URL` is correctly set
4. **HTTPS**: Deploy with HTTPS enabled for security headers to work properly

### Security Functions Available

```typescript
// Environment checks
isProduction(); // Returns true in production
isDevelopment(); // Returns true in development

// Configuration getters
getRateLimitConfig(); // Environment-aware rate limits
getFileUploadConfig(); // Environment-aware file upload settings
getContentLimits(); // Environment-aware content length limits
getLoggingConfig(); // Environment-aware logging settings
getSecurityHeaders(); // Environment-aware security headers
generateCSPHeader(); // Dynamic CSP header generation
```

## 📋 Security Checklist

### ✅ Completed Items

- [x] **Environment-Aware Security**: Production vs development configuration
- [x] **Input validation** with Zod schemas
- [x] **Content sanitization** utilities with XSS protection
- [x] **Rate limiting** implementation with environment-based limits
- [x] **File upload security** with dynamic size and type restrictions
- [x] **Authentication & authorization** with Supabase integration
- [x] **Security headers** implementation with environment awareness
- [x] **Error handling security** with production error masking
- [x] **Database security** with Prisma ORM
- [x] **Content Security Policy** with production-ready configuration
- [x] **HTTPS enforcement** with HSTS headers
- [x] **Production optimizations** with stricter limits and policies

### 🔄 Ongoing Maintenance

- [ ] Regular security audits
- [ ] Dependency updates for vulnerabilities
- [ ] Rate limit monitoring and adjustment
- [ ] CSP policy refinement
- [ ] Performance monitoring of security measures

## 🛠️ Implementation Files

### Core Security Files

- `lib/schemas.ts` - Input validation schemas
- `lib/sanitize.ts` - Content sanitization utilities
- `lib/rate-limit.ts` - Rate limiting implementation
- `lib/auth.ts` - Authentication utilities
- `middleware.ts` - Route protection middleware

### Updated API Files

- `app/api/tags/route.ts` - Enhanced tags API
- `app/api/posts/route.ts` - Enhanced posts API
- `app/api/upload/image/route.ts` - Secure image upload
- `app/api/upload/video/route.ts` - Secure video upload

## 🔍 Monitoring & Logging

### Security Monitoring

- Rate limit violations logged
- Authentication failures tracked
- File upload attempts monitored
- Error patterns analyzed

### Recommended Monitoring

- Set up alerts for unusual rate limit patterns
- Monitor failed authentication attempts
- Track file upload failures
- Watch for injection attempt patterns

## 📚 Best Practices

### For Developers

1. **Always validate inputs** using Zod schemas
2. **Sanitize user content** before storage/display
3. **Check authentication** before sensitive operations
4. **Use rate limiting** for public endpoints
5. **Validate file uploads** thoroughly
6. **Handle errors securely** without information leakage

### For Deployment

1. **Enable HTTPS** in production
2. **Configure CSP** properly
3. **Set secure headers** on the server
4. **Monitor rate limits** and adjust as needed
5. **Regular security updates** for dependencies
6. **Backup and disaster recovery** plans

## 🆘 Incident Response

### Security Incident Steps

1. **Identify** the type and scope of the incident
2. **Contain** the threat immediately
3. **Investigate** the root cause
4. **Remediate** the vulnerability
5. **Monitor** for similar attempts
6. **Document** lessons learned

### Emergency Contacts

- Development Team Lead
- System Administrator
- Security Officer (if applicable)

## 📞 Security Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Security Best Practices](https://nextjs.org/docs/pages/building-your-application/configuring/security-headers)
- [Prisma Security Guidelines](https://www.prisma.io/docs/concepts/components/prisma-client/working-with-prismaclient/generating-prisma-client#the-location-of-prisma-client)
- [Supabase Security](https://supabase.com/docs/guides/platform/security)

---

**Last Updated**: December 2024
**Version**: 1.0
**Maintainer**: Development Team
