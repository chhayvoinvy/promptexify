#!/usr/bin/env tsx

/**
 * CSP Violation Test Script
 * 
 * This script helps identify the exact inline script causing CSP violations
 * by testing common patterns and providing specific debugging information.
 */

import { CSPDebug } from '../lib/security/csp';

async function testCommonViolations() {
  console.log("🔍 Testing Common CSP Violation Patterns\n");

  // Common inline scripts that might be causing violations
  const testScripts = [
    // Layout scripts
    'window.__CSP_NONCE__ = "test-nonce";',
    'window.__CSP_NONCE__ = null; // Development mode - no CSP nonces',
    
    // Google Analytics patterns
    'window.dataLayer = window.dataLayer || [];',
    'function gtag(){dataLayer.push(arguments);}',
    'gtag("js", new Date());',
    'gtag("config", "GA_MEASUREMENT_ID");',
    
    // Vercel Analytics patterns
    'window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };',
    '!function(e,t,n,a,o,i,r){e.va=e.va||function(){(e.vaq=e.vaq||[]).push(arguments)}}(window);',
    
    // Theme/Dark mode scripts
    'document.documentElement.classList.add("dark");',
    'document.documentElement.classList.remove("dark");',
    'document.documentElement.setAttribute("data-theme", "dark");',
    
    // Google One Tap patterns
    'window.google.accounts.id.initialize({client_id: "example"});',
    
    // Common empty scripts
    '',
    ' ',
    '\n',
    
    // Third-party library patterns
    'console.log("test");',
    'alert("test");',
    'window.test = true;',
  ];

  console.log("📝 Testing inline script patterns:\n");

  for (const script of testScripts) {
    const hash = await CSPDebug.calculateHash(script);
    const displayScript = script.trim() || '(empty/whitespace)';
    console.log(`Script: ${displayScript.substring(0, 60)}${displayScript.length > 60 ? '...' : ''}`);
    console.log(`Hash: ${hash}`);
    console.log("---");
  }

  console.log("\n💡 To identify the exact violation:");
  console.log("1. Open browser DevTools (F12)");
  console.log("2. Go to Console tab");
  console.log("3. Look for CSP violation messages");
  console.log("4. Copy the exact script content from the error");
  console.log("5. Run: npm run csp:debug \"your exact error message\"");
  
  console.log("\n🔧 Common sources of inline scripts:");
  console.log("- GoogleAnalytics component");
  console.log("- Theme switching scripts");
  console.log("- Third-party library initialization");
  console.log("- Dynamic content injection");
  console.log("- Error tracking scripts");
}

async function main() {
  await testCommonViolations();
}

if (require.main === module) {
  main().catch(console.error);
}

export { testCommonViolations }; 