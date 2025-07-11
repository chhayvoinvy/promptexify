# Sanity CMS Production Setup Guide

## 1. Create Sanity Project

### Step 1: Install Sanity CLI
```bash
npm install -g @sanity/cli
```

### Step 2: Login to Sanity
```bash
sanity login
```

### Step 3: Create New Project
```bash
# Create a new project (if you don't have one)
sanity init --project-name "Promptexify Production"

# Or use existing project ID
# Your current project ID from env.template: 8xwrk88i
```

## 2. Configure Production Dataset

### Create Production Dataset
```bash
# Using Sanity CLI
sanity dataset create production

# Or create staging dataset for testing
sanity dataset create staging
```

### Set Dataset Permissions
```bash
# Make production dataset public for reads
sanity dataset visibility set production public

# Keep staging private for testing
sanity dataset visibility set staging private
```

## 3. Generate API Tokens

### Create Write Token
1. Go to [Sanity Management Console](https://www.sanity.io/manage)
2. Select your project
3. Go to "API" → "Tokens"
4. Click "Add API token"
5. Configure:
   - **Name**: `Production Write Token`
   - **Permissions**: `Editor`
   - **Dataset**: `production`
6. Copy the token and add to your environment variables

### Create Webhook Secret
```bash
# Generate a secure webhook secret
openssl rand -hex 32
```

## 4. Configure CORS and Security

### CORS Settings
1. In Sanity Management Console
2. Go to "API" → "CORS origins"
3. Add your production domain:
   ```
   https://your-domain.com
   ```

### Security Configuration
Your current setup already includes security best practices:

- ✅ Vision tool disabled in production
- ✅ Delete actions restricted for critical content
- ✅ Input validation and sanitization
- ✅ Webhook signature verification
- ✅ CORS restrictions

## 5. Deploy Studio to Production

Your studio is embedded in the Next.js app, which provides better security and integration.

### Verify Studio Configuration
The studio will be available at:
```
https://your-domain.com/dashboard/pages/studio
```

### Environment-specific Features
- **Development**: Vision tool, Stega enabled
- **Production**: Optimized for performance, security-focused

## 6. Set Up Webhooks for ISR

### Configure Webhook in Sanity
1. Go to "API" → "Webhooks"
2. Click "Create webhook"
3. Configure:
   - **Name**: `Production ISR Webhook`
   - **URL**: `https://your-domain.com/api/webhooks/sanity`
   - **Dataset**: `production`
   - **Trigger on**: `Create`, `Update`, `Delete`
   - **Secret**: Your webhook secret from step 3

### Webhook Features
Your webhook handles:
- ✅ Signature verification
- ✅ Smart cache revalidation by content type
- ✅ Path-based revalidation
- ✅ Tag-based revalidation

## 7. Content Migration

### Export from Development
```bash
# Export dataset
sanity dataset export development backup.tar.gz
```

### Import to Production
```bash
# Import to production
sanity dataset import backup.tar.gz production
```

### Verify Content
Check that all content appears correctly in production.

## 8. CDN and Performance

### Image Optimization
Your setup includes optimized image handling:
- CDN usage in production
- WebP format support
- Automatic resizing and quality optimization

### Caching Strategy
- **Read operations**: CDN enabled in production
- **Write operations**: No CDN to ensure consistency
- **ISR**: 5-minute revalidation for dynamic content

## 9. Monitoring and Maintenance

### Health Checks
Your webhook includes health check endpoints:
```
GET /api/webhooks/sanity - Health check
```

### Error Monitoring
- Webhook errors are logged
- Failed mutations are tracked
- Revalidation metrics available

### Content Backup
Set up automated backups:
```bash
# Create backup script
sanity dataset export production "backup-$(date +%Y%m%d).tar.gz"
```

## 10. Security Checklist

- [ ] API tokens have minimal required permissions
- [ ] CORS is configured for production domains only
- [ ] Webhook secret is cryptographically secure
- [ ] Vision tool is disabled in production
- [ ] Input validation is enabled for all content types
- [ ] Delete actions are restricted for critical content

## 11. Environment Variables Summary

```bash
# Production Environment Variables
NEXT_PUBLIC_SANITY_PROJECT_ID=your_project_id
NEXT_PUBLIC_SANITY_DATASET=production
NEXT_PUBLIC_SANITY_API_VERSION=2024-03-15
SANITY_API_TOKEN=sk_your_write_token
SANITY_WEBHOOK_SECRET=your_webhook_secret
NODE_ENV=production
NEXT_PUBLIC_BASE_URL=https://your-domain.com
```

## 12. Deployment Steps

1. **Deploy to Vercel/Hosting Provider**
   ```bash
   # Set environment variables in hosting provider
   # Deploy your Next.js application
   ```

2. **Verify Studio Access**
   - Navigate to `/dashboard/pages/studio`
   - Ensure authentication works
   - Test content editing

3. **Test Webhook Integration**
   - Create/update content in studio
   - Verify pages revalidate correctly
   - Check webhook logs

4. **Performance Testing**
   - Test image optimization
   - Verify CDN usage
   - Check ISR functionality

## Support and Resources

- [Sanity Documentation](https://www.sanity.io/docs)
- [Next.js ISR Documentation](https://nextjs.org/docs/basic-features/data-fetching/incremental-static-regeneration)
- [Your Project's Sanity Configuration](../sanity.config.ts) 