# CSP Best Practices for Next.js 15+

This document outlines the modern approach to implementing Content Security Policy (CSP) in Next.js 15+ applications, addressing the limitations of manual hash management and providing automated solutions.

## 🚀 Modern CSP Implementation

### Key Improvements Over Manual Hash Management

1. **Automated Hash Generation**: No more manual hash calculation
2. **Dynamic Policy Building**: Flexible, maintainable CSP policies
3. **Intelligent Violation Analysis**: Automatic fix suggestions
4. **CLI Tool Integration**: Command-line management of CSP
5. **Type-Safe Implementation**: Full TypeScript support

## 🛠️ New CSP Architecture

### 1. Automated Hash Generation

```typescript
import { CSPHashGenerator } from '@/lib/security/csp';

// Generate hash for inline content
const hash = await CSPHashGenerator.generateHash('console.log("hello")');
// Returns: 'sha256-abc123...'

// Generate multiple hashes
const hashes = await CSPHashGenerator.generateHashes([
  'console.log("script1")',
  'console.log("script2")'
]);

// Validate hash format
const isValid = CSPHashGenerator.isValidHash(hash);
```

### 2. Dynamic Policy Builder

```typescript
import { CSPPolicyBuilder } from '@/lib/security/csp';

// Create production policy with nonce
const productionPolicy = CSPPolicyBuilder.createProductionPolicy(nonce, {
  additionalScripts: ['https://new-service.com'],
  additionalStyles: ['https://new-cdn.com'],
  additionalDomains: {
    'connect-src': ['https://new-api.com']
  }
});

// Create development policy
const developmentPolicy = CSPPolicyBuilder.createDevelopmentPolicy();

// Build custom policy
const customPolicy = new CSPPolicyBuilder(nonce)
  .addScriptSources('https://custom-script.com')
  .addStyleSources('https://custom-style.com')
  .addDirective('img-src', 'self', 'https://custom-images.com')
  .build();
```

### 3. Intelligent Violation Analysis

```typescript
import { CSPViolationHandler } from '@/lib/security/csp';

// Analyze CSP violation
const analysis = await CSPViolationHandler.analyzeViolation({
  'violated-directive': 'script-src',
  'script-sample': 'console.log("blocked script")'
});

// Returns:
// {
//   type: 'script',
//   suggestedFix: 'Add hash to CSP_HASHES.SCRIPTS: \'sha256-abc123...\'',
//   hash: '\'sha256-abc123...\''
// }

// Generate configuration snippet
const snippet = CSPViolationHandler.generateConfigSnippet(analysis);
```

## 🖥️ CLI Tool Usage

### Basic Commands

```bash
# Generate hash for inline content
npm run csp:hash -c "console.log('hello')"

# Add hash to configuration
npm run csp:add -h "'sha256-abc123'" -t script

# List all current hashes
npm run csp:list

# Validate hash format
npm run csp:validate -h "'sha256-abc123'"

# Create CSP policy
npm run csp:policy -n "abc123"

# Analyze violation from file
npm run csp:analyze -f violation.json
```

### Advanced CLI Usage

```bash
# Generate and add hash in one command
npm run csp:hash -c "console.log('hello')" | xargs -I {} npm run csp:add -h "{}" -t script

# Batch process multiple violations
for file in violations/*.json; do
  npm run csp:analyze -f "$file"
done
```

## 🔧 Integration with Next.js 15+

### 1. Middleware Integration

```typescript
// middleware.ts
import { CSPNonce, SecurityHeaders } from '@/lib/security/csp';

export async function middleware(request: NextRequest) {
  const nonce = process.env.NODE_ENV === 'production' 
    ? CSPNonce.generate() 
    : null;

  const response = NextResponse.next();
  
  // Apply security headers with CSP
  const securityHeaders = SecurityHeaders.getSecurityHeaders(nonce);
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}
```

### 2. Layout Integration

```typescript
// app/layout.tsx
import { CSPNonce } from '@/lib/security/csp';

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Safe method for both static and dynamic contexts
  const nonce = await CSPNonce.getFromHeadersSafe();
  const isProduction = process.env.NODE_ENV === 'production';

  return (
    <html lang="en">
      <head>
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

### 3. Component Integration

```typescript
// components/secure-component.tsx
'use client';

import { useEffect, useState } from 'react';

export function SecureComponent() {
  const [nonce, setNonce] = useState<string | null>(null);

  useEffect(() => {
    // Get nonce from window global
    const cspNonce = (window as any).__CSP_NONCE__;
    setNonce(cspNonce);
  }, []);

  useEffect(() => {
    if (!nonce) return;

    // Create secure script with nonce
    const script = document.createElement('script');
    script.nonce = nonce;
    script.textContent = 'console.log("secure script");';
    document.head.appendChild(script);

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, [nonce]);

  return <div>Secure Component</div>;
}
```

## 🔍 Automated Violation Handling

### Enhanced CSP Report Endpoint

```typescript
// app/api/security/csp-report/route.ts
import { CSPViolationHandler } from '@/lib/security/csp';

export async function POST(request: NextRequest) {
  const report = await request.json();
  
  if (report && report['csp-report']) {
    // Automated analysis
    const analysis = await CSPViolationHandler.analyzeViolation(report['csp-report']);
    
    console.log(`🔍 Analysis: ${analysis.type}`);
    console.log(`💡 Suggested Fix: ${analysis.suggestedFix}`);
    
    if (analysis.hash) {
      console.log(`🔑 Generated Hash: ${analysis.hash}`);
    }
  }

  return new Response(null, { status: 204 });
}
```

## 📊 Monitoring and Analytics

### CSP Violation Tracking

```typescript
// lib/security/csp-monitor.ts
export class CSPMonitor {
  static async trackViolation(violation: any) {
    // Send to analytics service
    await analytics.track('csp_violation', {
      directive: violation['violated-directive'],
      blocked_uri: violation['blocked-uri'],
      timestamp: new Date().toISOString()
    });
  }

  static async generateReport() {
    // Generate CSP compliance report
    const violations = await this.getViolations();
    return {
      total_violations: violations.length,
      by_directive: this.groupByDirective(violations),
      by_domain: this.groupByDomain(violations)
    };
  }
}
```

## 🚀 Performance Optimizations

### 1. Nonce Caching

```typescript
// lib/security/csp-cache.ts
export class CSPNonceCache {
  private static cache = new Map<string, string>();
  private static TTL = 60 * 60 * 1000; // 1 hour

  static set(key: string, nonce: string): void {
    this.cache.set(key, nonce);
    setTimeout(() => this.cache.delete(key), this.TTL);
  }

  static get(key: string): string | null {
    return this.cache.get(key) || null;
  }
}
```

### 2. Policy Pre-computation

```typescript
// lib/security/csp-policy-cache.ts
export class CSPPolicyCache {
  private static productionPolicy: string | null = null;

  static getProductionPolicy(nonce: string): string {
    if (!this.productionPolicy) {
      this.productionPolicy = CSPPolicyBuilder.createProductionPolicy(nonce);
    }
    return this.productionPolicy.replace('{NONCE}', nonce);
  }
}
```

## 🔒 Security Best Practices

### 1. Nonce Security

```typescript
// Ensure nonces are cryptographically secure
const nonce = crypto.randomUUID(); // ✅ Secure
const nonce = Date.now().toString(); // ❌ Predictable
```

### 2. Hash Validation

```typescript
// Always validate hashes before adding
const hash = await CSPHashGenerator.generateHash(content);
if (CSPHashGenerator.isValidHash(hash)) {
  await addHashToConfig(hash, type);
}
```

### 3. Policy Validation

```typescript
// Validate CSP policy before deployment
const policy = CSPPolicyBuilder.createProductionPolicy(nonce);
const isValid = this.validatePolicy(policy);
if (!isValid) {
  throw new Error('Invalid CSP policy');
}
```

## 🧪 Testing CSP Implementation

### 1. Unit Tests

```typescript
// __tests__/csp.test.ts
import { CSPHashGenerator, CSPPolicyBuilder } from '@/lib/security/csp';

describe('CSP Implementation', () => {
  test('generates valid hashes', async () => {
    const hash = await CSPHashGenerator.generateHash('test');
    expect(CSPHashGenerator.isValidHash(hash)).toBe(true);
  });

  test('creates valid policies', () => {
    const policy = CSPPolicyBuilder.createProductionPolicy('test-nonce');
    expect(policy).toContain('script-src');
    expect(policy).toContain('nonce-test-nonce');
  });
});
```

### 2. Integration Tests

```typescript
// __tests__/csp-integration.test.ts
describe('CSP Integration', () => {
  test('middleware applies CSP headers', async () => {
    const response = await fetch('/api/test');
    expect(response.headers.get('Content-Security-Policy')).toBeTruthy();
  });
});
```

## 📈 Migration Guide

### From Manual Hash Management

1. **Replace manual hash calculation**:
   ```bash
   # Old way
   echo -n "console.log('hello')" | openssl dgst -sha256 -binary | base64
   
   # New way
   npm run csp:hash -c "console.log('hello')"
   ```

2. **Update CSP configuration**:
   ```typescript
   // Old way
   const csp = [
     "script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'sha256-abc123'",
     // ... manual configuration
   ];

   // New way
   const csp = CSPPolicyBuilder.createProductionPolicy(nonce);
   ```

3. **Automate violation handling**:
   ```typescript
   // Old way
   console.log('CSP violation:', violation);

   // New way
   const analysis = await CSPViolationHandler.analyzeViolation(violation);
   console.log('Suggested fix:', analysis.suggestedFix);
   ```

## 🎯 Benefits of Modern CSP Implementation

### 1. **Reduced Maintenance**
- No more manual hash calculation
- Automated violation analysis
- CLI tool for common tasks

### 2. **Improved Security**
- Type-safe implementation
- Automatic validation
- Secure nonce generation

### 3. **Better Developer Experience**
- Clear error messages
- Automated fix suggestions
- Comprehensive documentation

### 4. **Enhanced Monitoring**
- Detailed violation reports
- Performance metrics
- Compliance tracking

## 🔮 Future Enhancements

### 1. **Machine Learning Integration**
- Predict common violations
- Suggest policy optimizations
- Automatic domain allowlisting

### 2. **Real-time Monitoring**
- Live violation tracking
- Instant alerting
- Performance impact analysis

### 3. **Policy Optimization**
- Automatic policy optimization
- Performance impact assessment
- Security vs functionality balancing

---

This modern CSP implementation provides a robust, maintainable, and secure approach to Content Security Policy management in Next.js 15+ applications, significantly reducing the manual overhead while improving security and developer experience. 