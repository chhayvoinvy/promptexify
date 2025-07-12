# Sanitize Module Guide

This guide covers the enhanced sanitize module with DOMPurify integration for robust XSS protection.

## Overview

The sanitize module provides comprehensive content sanitization utilities to prevent XSS attacks and ensure safe content handling. It now integrates DOMPurify for superior HTML sanitization while maintaining backward compatibility with existing functionality.

## Key Features

- **DOMPurify Integration**: Uses DOMPurify for robust HTML sanitization
- **Server-Side Compatible**: Works in both Node.js and browser environments
- **Fallback Protection**: Falls back to regex-based sanitization if DOMPurify fails
- **Environment-Aware**: Different configurations for production and development
- **Comprehensive Coverage**: Handles XSS, SQL injection, file uploads, and more

## DOMPurify Configurations

### Strict Configuration
- **Use Case**: General input sanitization
- **Allowed Tags**: None (removes all HTML)
- **Allowed Attributes**: None
- **Best For**: User input that should not contain any HTML

### Basic Configuration
- **Use Case**: Minimal HTML formatting
- **Allowed Tags**: `p`, `br`, `strong`, `em`, `u`, `a`, `ul`, `ol`, `li`
- **Allowed Attributes**: `href`, `title`
- **Best For**: Simple text formatting needs

### Rich Configuration
- **Use Case**: Rich HTML content (comments, user-generated content)
- **Allowed Tags**: Extensive list including headings, lists, tables, images, etc.
- **Allowed Attributes**: Safe attributes like `href`, `title`, `alt`, `src`, etc.
- **Custom Hooks**: Automatically adds `target="_blank"` and `rel="noopener noreferrer"` to external links
- **Best For**: Content that legitimately needs HTML formatting

## Core Functions

### Basic Sanitization

#### `sanitizeInput(input: string): string`
General-purpose input sanitization with DOMPurify integration.

```typescript
import { sanitizeInput } from '@/lib/security/sanitize';

const userInput = '<script>alert("xss")</script>Hello World';
const safe = sanitizeInput(userInput); // Returns: "Hello World"
```

#### `escapeHtml(text: string): string`
Escape HTML entities for safe display.

```typescript
import { escapeHtml } from '@/lib/security/sanitize';

const text = '<script>alert("xss")</script>';
const escaped = escapeHtml(text); // Returns: "&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;"
```

### Content Sanitization

#### `sanitizeContent(content: string): string`
Sanitize markdown/rich text content with strict DOMPurify configuration.

```typescript
import { sanitizeContent } from '@/lib/security/sanitize';

const content = '<iframe src="evil.com"></iframe><p>Safe content</p>';
const safe = sanitizeContent(content); // Returns: "Safe content"
```

#### `sanitizeRichContent(content: string): string`
Sanitize user-generated HTML content while preserving safe formatting.

```typescript
import { sanitizeRichContent } from '@/lib/security/sanitize';

const content = '<p>Hello <strong>World</strong> <a href="https://example.com">Link</a></p>';
const safe = sanitizeRichContent(content); // Preserves safe HTML
```

#### `sanitizeBasicHtml(content: string): string`
Sanitize content with minimal HTML formatting allowed.

```typescript
import { sanitizeBasicHtml } from '@/lib/security/sanitize';

const content = '<p>Hello <strong>World</strong></p><script>alert(1)</script>';
const safe = sanitizeBasicHtml(content); // Returns: "<p>Hello <strong>World</strong></p>"
```

### URL and File Sanitization

#### `sanitizeUrl(url: string): string | null`
Validate and sanitize URLs.

```typescript
import { sanitizeUrl } from '@/lib/security/sanitize';

const safeUrl = sanitizeUrl('https://example.com'); // Returns: "https://example.com"
const dangerousUrl = sanitizeUrl('javascript:alert(1)'); // Returns: null
```

#### `sanitizeFilename(filename: string): string`
Sanitize filenames for safe file uploads.

```typescript
import { sanitizeFilename } from '@/lib/security/sanitize';

const filename = '../../../etc/passwd';
const safe = sanitizeFilename(filename); // Returns: "etcpasswd"
```

#### `validateFileExtension(filename: string): boolean`
Check if file extension is safe.

```typescript
import { validateFileExtension } from '@/lib/security/sanitize';

const isSafe = validateFileExtension('document.pdf'); // Returns: true
const isDangerous = validateFileExtension('malware.exe'); // Returns: false
```

### Tag and Slug Sanitization

#### `sanitizeTagName(tagName: string): string`
Sanitize tag names with strict validation.

```typescript
import { sanitizeTagName } from '@/lib/security/sanitize';

const tagName = 'My Tag Name 123';
const safe = sanitizeTagName(tagName); // Returns: "My Tag Name 123"
```

#### `sanitizeTagSlug(input: string): string`
Generate safe tag slugs.

```typescript
import { sanitizeTagSlug } from '@/lib/security/sanitize';

const input = 'My Tag Name 123';
const slug = sanitizeTagSlug(input); // Returns: "my-tag-name-123"
```

#### `validateTagSlug(slug: string): boolean`
Validate tag slug format.

```typescript
import { validateTagSlug } from '@/lib/security/sanitize';

const isValid = validateTagSlug('my-tag-name-123'); // Returns: true
const isInvalid = validateTagSlug('my--tag'); // Returns: false (consecutive hyphens)
```

### Search Query Sanitization

#### `sanitizeSearchQuery(query: string, options?): Promise<string>`
Sanitize search queries with SQL injection protection.

```typescript
import { sanitizeSearchQuery } from '@/lib/security/sanitize';

const safeQuery = await sanitizeSearchQuery('hello world'); // Returns: "hello world"
const dangerousQuery = await sanitizeSearchQuery("'; DROP TABLE users; --"); // Returns: ""
```

### Email and Data Sanitization

#### `sanitizeEmail(email: string): string | null`
Validate and sanitize email addresses.

```typescript
import { sanitizeEmail } from '@/lib/security/sanitize';

const email = sanitizeEmail('user@example.com'); // Returns: "user@example.com"
const invalidEmail = sanitizeEmail('invalid-email'); // Returns: null
```

#### `sanitizeJsonData(data: unknown): unknown`
Recursively sanitize JSON data.

```typescript
import { sanitizeJsonData } from '@/lib/security/sanitize';

const data = {
  name: '<script>alert("xss")</script>John',
  email: 'user@example.com',
  tags: ['<script>', 'safe-tag']
};

const sanitized = sanitizeJsonData(data);
// Returns: { name: "John", email: "user@example.com", tags: ["", "safe-tag"] }
```

## Utility Functions

### `isDOMPurifyAvailable(): boolean`
Check if DOMPurify is available and working.

```typescript
import { isDOMPurifyAvailable } from '@/lib/security/sanitize';

const isAvailable = isDOMPurifyAvailable(); // Returns: true/false
```

### `getDOMPurifyConfig(type: "strict" | "basic" | "rich"): object`
Get DOMPurify configuration by type.

```typescript
import { getDOMPurifyConfig } from '@/lib/security/sanitize';

const strictConfig = getDOMPurifyConfig('strict');
const richConfig = getDOMPurifyConfig('rich');
```

## Environment-Aware Functions

### Rate Limiting
```typescript
import { getRateLimitConfig } from '@/lib/security/sanitize';

const config = getRateLimitConfig();
// Returns different limits for production vs development
```

### File Upload Configuration
```typescript
import { getFileUploadConfig } from '@/lib/security/sanitize';

const config = getFileUploadConfig();
// Returns size limits and allowed file types
```

### Content Limits
```typescript
import { getContentLimits } from '@/lib/security/sanitize';

const limits = getContentLimits();
// Returns character limits for different content types
```

## Security Headers

```typescript
import { SECURITY_HEADERS } from '@/lib/security/sanitize';

// Use in API routes or middleware
export async function GET() {
  return new Response('Hello', {
    headers: SECURITY_HEADERS
  });
}
```

## Best Practices

### 1. Choose the Right Sanitizer
- Use `sanitizeInput` for general user input
- Use `sanitizeContent` for markdown-like content
- Use `sanitizeRichContent` for user-generated HTML
- Use `sanitizeBasicHtml` for minimal formatting needs

### 2. Always Sanitize User Input
```typescript
// ❌ Bad
const userInput = req.body.content;

// ✅ Good
const userInput = sanitizeInput(req.body.content);
```

### 3. Validate File Uploads
```typescript
// ✅ Good
if (!validateFileExtension(filename)) {
  throw new Error('Invalid file type');
}
const safeFilename = sanitizeFilename(filename);
```

### 4. Use Environment-Aware Configurations
```typescript
// ✅ Good
const limits = getContentLimits();
if (content.length > limits.postContent) {
  throw new Error('Content too long');
}
```

### 5. Handle DOMPurify Failures Gracefully
The module automatically falls back to regex-based sanitization if DOMPurify fails, but you should monitor for these events in production.

## Testing

Run the test suite to verify DOMPurify integration:

```bash
npx tsx lib/security/sanitize.test.ts
```

## Migration Guide

### From Previous Version
The module maintains backward compatibility. Existing code will continue to work, but now benefits from enhanced DOMPurify protection.

### Performance Considerations
- DOMPurify adds some overhead but provides superior protection
- Fallback to regex sanitization ensures reliability
- Consider caching sanitized content for frequently accessed data

### Monitoring
Monitor for DOMPurify failures in production:
```typescript
// Check logs for warnings like:
// [SECURITY] DOMPurify failed, using fallback sanitization
```

## Security Considerations

1. **DOMPurify is the primary defense** - regex sanitization is fallback only
2. **Environment-specific configurations** - stricter in production
3. **Comprehensive input validation** - validate before sanitizing
4. **Regular updates** - keep DOMPurify and dependencies updated
5. **Monitoring** - watch for sanitization failures and suspicious patterns

## Troubleshooting

### DOMPurify Not Working
1. Check if `dompurify` and `jsdom` are installed
2. Verify server-side compatibility
3. Check for TypeScript compilation errors

### Sanitization Too Aggressive
1. Use `sanitizeRichContent` instead of `sanitizeContent`
2. Customize DOMPurify configuration
3. Check allowed tags and attributes

### Performance Issues
1. Consider caching sanitized content
2. Use appropriate content limits
3. Monitor DOMPurify performance in production 