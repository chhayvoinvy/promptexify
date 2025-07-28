#!/usr/bin/env tsx

/**
 * CSP Violation Debug Script
 * 
 * This script helps identify and fix CSP violations by:
 * 1. Analyzing the error message from the CSP violation
 * 2. Calculating hashes for common inline content
 * 3. Providing specific fixes for the violation
 * 
 * Usage:
 * npx tsx scripts/debug-csp-violation.ts "your CSP error message here"
 */

import { CSPDebug } from '../lib/security/csp';

async function analyzeCSPViolation(errorMessage: string) {
  console.log("🔍 CSP Violation Analysis\n");
  console.log(`Error: ${errorMessage}\n`);

  // Extract information from the error message
  const scriptSrcMatch = errorMessage.match(/script-src[^']*'nonce-([^']+)'/);
  const nonce = scriptSrcMatch ? scriptSrcMatch[1] : null;

  if (nonce) {
    console.log(`✅ Nonce found: ${nonce}`);
    console.log("This suggests the CSP is properly configured with nonces.\n");
  } else {
    console.log("❌ No nonce found in CSP directive");
    console.log("This suggests the CSP might not be properly configured.\n");
  }

  // Check for common inline script patterns
  const commonPatterns = CSPDebug.getCommonPatterns();
  
  console.log("📝 Common inline script patterns and their hashes:\n");
  
  for (const script of commonPatterns.scripts) {
    const hash = await CSPDebug.calculateHash(script);
    const displayScript = script.length > 60 ? script.substring(0, 60) + '...' : script;
    console.log(`Script: ${displayScript}`);
    console.log(`Hash: ${hash}`);
    console.log("---");
  }

  console.log("\n💡 Recommendations:");
  console.log("1. Check if any inline scripts are missing the nonce attribute");
  console.log("2. Ensure all <script> tags have nonce={nonce}");
  console.log("3. For static content, add the appropriate hash to CSP_HASHES.SCRIPTS");
  console.log("4. Verify that the nonce is being properly passed to all components");
  
  console.log("\n🔧 Next steps:");
  console.log("1. Check your browser's developer console for the specific blocked script");
  console.log("2. Look for any <script> tags without nonce attributes");
  console.log("3. Check for any dynamically created scripts that need nonces");
  console.log("4. Verify that third-party scripts are properly configured");
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log("🔍 CSP Violation Debug Tool\n");
    console.log("Usage: npx tsx scripts/debug-csp-violation.ts \"your CSP error message\"\n");
    console.log("Example:");
    console.log('npx tsx scripts/debug-csp-violation.ts "Refused to execute inline script because it violates the following Content Security Policy directive: script-src \'self\' \'nonce-LLYfo6qYa67cVcoYVLFTVJJxzIK9jfTo\' \'strict-dynamic\'"');
    process.exit(1);
  }

  const errorMessage = args.join(' ');
  await analyzeCSPViolation(errorMessage);
}

if (require.main === module) {
  main().catch(console.error);
}

export { analyzeCSPViolation }; 