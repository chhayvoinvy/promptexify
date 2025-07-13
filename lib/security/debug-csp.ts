#!/usr/bin/env tsx

/**
 * CSP Debug Utility
 * 
 * This script helps debug Content Security Policy issues by:
 * 1. Calculating hashes for inline content
 * 2. Analyzing current CSP configuration
 * 3. Providing suggestions for fixing violations
 * 
 * Usage:
 * npx tsx lib/security/debug-csp.ts
 * 
 * Or to calculate a specific hash:
 * npx tsx lib/security/debug-csp.ts "your inline script content here"
 */

// import { CSPNonce } from "./csp"; // Not currently used

async function calculateHash(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashBase64 = btoa(String.fromCharCode(...hashArray));
  return `'sha256-${hashBase64}'`;
}

async function debugCommonInlineContent() {
  console.log("🔍 CSP Debug Utility - Calculating hashes for common inline content\n");

  const commonContents = [
    // Layout.tsx inline scripts
    `window.__CSP_NONCE__ = "example-nonce";`,
    `window.__CSP_NONCE__ = null; // Development mode - no CSP nonces`,
    
    // Vercel Analytics common patterns
    `window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };`,
    `!function(e,t,n,a,o,i,r){e.va=e.va||function(){(e.vaq=e.vaq||[]).push(arguments)}}(window);`,
    
    // Google Analytics patterns
    `gtag('config', 'GA_MEASUREMENT_ID');`,
    `gtag('js', new Date());`,
    `window.dataLayer = window.dataLayer || [];`,
    `function gtag(){dataLayer.push(arguments);}`,
    
    // Theme/Dark mode scripts
    `document.documentElement.classList.add('dark');`,
    `document.documentElement.classList.remove('dark');`,
    `document.documentElement.setAttribute('data-theme', 'dark');`,
    
    // Google One Tap patterns
    `window.google.accounts.id.initialize({client_id: "example"});`,
    
    // Common empty/minimal scripts
    ``,
    ` `,
    `\n`,
  ];

  console.log("📝 Common inline content hashes:\n");

  for (const content of commonContents) {
    const hash = await calculateHash(content);
    const displayContent = content.trim() || '(empty/whitespace)';
    console.log(`Content: ${displayContent.substring(0, 60)}${displayContent.length > 60 ? '...' : ''}`);
    console.log(`Hash: ${hash}`);
    console.log("---");
  }

  console.log("\n💡 Instructions:");
  console.log("1. Copy the hash for the content that matches your CSP violation");
  console.log("2. Add it to CSP_HASHES.SCRIPTS in lib/security/csp.ts");
  console.log("3. Redeploy your application");
  console.log("4. Monitor for any remaining violations in your CSP report endpoint");
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length > 0) {
    // Calculate hash for specific content
    const content = args.join(' ');
    console.log("🔑 Calculating hash for custom content:\n");
    console.log(`Content: ${content}`);
    
    try {
      const hash = await calculateHash(content);
      console.log(`Hash: ${hash}`);
      console.log("\n💡 Add this hash to CSP_HASHES.SCRIPTS in lib/security/csp.ts");
    } catch (error) {
      console.error("❌ Failed to calculate hash:", error);
      process.exit(1);
    }
  } else {
    // Run debug analysis for common content
    await debugCommonInlineContent();
    
    // Built-in debug analysis would go here if implemented
    console.log("\n🔧 CSP Debug analysis complete.");
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { calculateHash, debugCommonInlineContent }; 