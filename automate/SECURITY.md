# Automation System Security Guide

## 🔒 Security Improvements Implemented

### 1. Environment Variable Configuration

Add these to your `.env` file:

```bash
# Required: User ID to be used as author for generated content
AUTOMATION_AUTHOR_ID=your-user-id-here

# Optional: Security limits (defaults shown)
AUTOMATION_MAX_FILE_SIZE=5242880  # 5MB in bytes
AUTOMATION_MAX_POSTS_PER_FILE=50
AUTOMATION_RATE_LIMIT_PER_HOUR=10

# Optional: Performance tuning
AUTOMATION_BATCH_SIZE=10
AUTOMATION_MAX_CONCURRENT_FILES=3
AUTOMATION_TRANSACTION_TIMEOUT=30000
```

### 2. Security Features

#### ✅ Input Validation & Sanitization

- **Zod Schema Validation**: All content files validated against strict schemas
- **Content Sanitization**: Automatic removal of dangerous scripts/tags
- **File Size Limits**: Prevents memory exhaustion attacks
- **Extension Validation**: Only `.json` files accepted

#### ✅ Access Control

- **Admin-Only Access**: Only users with `ADMIN` role can use automation
- **Rate Limiting**: Prevents abuse with configurable limits
- **Security Logging**: All actions logged with security events

#### ✅ Secure Execution

- **Spawn vs Exec**: Uses `spawn()` instead of `exec()` for better security
- **Environment Isolation**: Limited environment variables passed to child process
- **Timeout Protection**: 60-second timeout prevents hanging processes

#### ✅ Data Protection

- **Transaction Safety**: Database operations wrapped in transactions
- **Duplicate Prevention**: Slug uniqueness enforced
- **Error Handling**: Comprehensive error logging without data exposure

### 3. Performance Optimizations

#### ⚡ Database Performance

- **Batch Processing**: Posts processed in configurable batches
- **Concurrent File Processing**: Multiple files processed simultaneously
- **Transaction Timeouts**: Prevents long-running transactions
- **Query Optimization**: Efficient upsert operations

#### ⚡ Memory Management

- **Streaming File Reads**: Large files handled efficiently
- **Size Validation**: Files validated before loading into memory
- **Garbage Collection**: Resources properly cleaned up

### 4. Security Events Monitored

The system monitors and logs these security events:

- `UNAUTHORIZED_ACCESS`: Non-admin users attempting automation
- `RATE_LIMIT_EXCEEDED`: Users exceeding rate limits
- `MALICIOUS_PAYLOAD`: Suspicious content or JSON parsing errors
- `SUSPICIOUS_REQUEST`: File operations and bulk actions

### 5. Configuration Options

Update `automate/configuration.ts` to customize:

```typescript
export const seedConfig: SeedConfig = {
  security: {
    maxFileSize: 5 * 1024 * 1024, // 5MB
    maxPostsPerFile: 50,
    maxContentLength: 10000,
    allowedFileExtensions: [".json"],
    rateLimitPerHour: 10,
  },
  performance: {
    batchSize: 10,
    maxConcurrentFiles: 3,
    transactionTimeout: 30000,
  },
};
```

### 6. Content Validation Rules

#### File Structure Requirements:

- **Category**: Lowercase alphanumeric with dashes/underscores only
- **Tags**: Max 20 tags, unique slugs, validated format
- **Posts**: Max 50 posts per file, unique slugs, content length limits
- **URLs**: Only HTTPS URLs from approved domains

#### Forbidden Content:

- Script tags (`<script>`, `<iframe>`, etc.)
- JavaScript protocols (`javascript:`, `vbscript:`)
- Event handlers (`onclick`, `onload`, etc.)
- DOM manipulation functions (`eval`, `Function`, etc.)

### 7. Error Handling

The system provides detailed error messages for:

- Schema validation failures
- File size/format violations
- Security policy violations
- Database transaction errors
- Rate limit exceeded scenarios

### 8. Monitoring Integration

Ready for integration with:

- **Sentry**: Error tracking and performance monitoring
- **DataDog**: Security event aggregation
- **Custom Webhooks**: Real-time security alerts

### 9. Best Practices

1. **Regular Security Audits**: Review logs for suspicious patterns
2. **Rate Limit Tuning**: Adjust limits based on usage patterns
3. **Content Review**: Periodically audit generated content
4. **Environment Separation**: Use different configs for dev/prod
5. **Backup Strategy**: Regular database backups before bulk operations

### 10. Troubleshooting

#### Common Issues:

**"AUTOMATION_AUTHOR_ID environment variable is required"**

- Add a valid user ID to `.env` file (this user will be the author of generated posts)

**"Generation rate limit exceeded"**

- Wait for the rate limit window to reset
- Adjust `rateLimitPerHour` if needed

**"File content too large"**

- Split large files into smaller ones
- Increase `maxFileSize` if appropriate

**"Schema validation failed"**

- Check JSON structure against the schema
- Ensure all required fields are present
- Validate content for forbidden patterns

### 11. Development vs Production

**Development Mode:**

- More verbose logging
- Relaxed some limits for testing
- Additional debug information

**Production Mode:**

- Strict security enforcement
- Comprehensive monitoring
- Performance optimizations enabled

## 🚨 Security Checklist

Before deploying to production:

- [ ] Set `AUTOMATION_AUTHOR_ID` environment variable
- [ ] Configure appropriate rate limits
- [ ] Set up security monitoring
- [ ] Test with sample content files
- [ ] Review security logs
- [ ] Backup database
- [ ] Test rate limiting
- [ ] Validate all content schemas
