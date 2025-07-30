#!/usr/bin/env tsx

/**
 * Google One Tap Debug Script
 * 
 * This script helps identify and fix Google One Tap issues by:
 * 1. Checking environment variables
 * 2. Testing network connectivity to Google services
 * 3. Verifying CSP configuration
 * 4. Testing script loading
 * 
 * Usage:
 * npx tsx scripts/test-google-one-tap.ts
 */

// Load environment variables
import { config } from 'dotenv';
config({ path: '.env.local' });
config({ path: '.env' });

import { SecurityHeaders } from '../lib/security/csp';

async function testGoogleOneTap() {
  console.log("🔍 Google One Tap Debug Analysis\n");

  // Check environment variables
  console.log("📋 Environment Variables:");
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  console.log(`NEXT_PUBLIC_GOOGLE_CLIENT_ID: ${googleClientId ? '✅ Set' : '❌ Not set'}`);
  
  if (!googleClientId) {
    console.log("\n❌ Google Client ID is not configured!");
    console.log("Please set NEXT_PUBLIC_GOOGLE_CLIENT_ID in your .env file");
    console.log("You can get this from Google Cloud Console > APIs & Services > Credentials");
    return;
  }

  // Test network connectivity to Google services
  console.log("\n🌐 Network Connectivity Tests:");
  
  const googleServices = [
    'https://accounts.google.com',
    'https://apis.google.com',
    'https://oauth2.googleapis.com',
    'https://www.googleapis.com',
    'https://identitytoolkit.googleapis.com',
    'https://securetoken.googleapis.com',
  ];

  for (const service of googleServices) {
    try {
      const response = await fetch(`${service}/.well-known/openid_configuration`, {
        method: 'HEAD',
        mode: 'no-cors',
      });
      console.log(`✅ ${service}`);
    } catch (error) {
      console.log(`❌ ${service} - ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Check CSP configuration
  console.log("\n🛡️ CSP Configuration:");
  const cspDebugInfo = SecurityHeaders.getCSPDebugInfo();
  
  const googleDomainsInCSP = [
    'accounts.google.com',
    'apis.google.com',
    'oauth2.googleapis.com',
    'www.googleapis.com',
    'identitytoolkit.googleapis.com',
    'securetoken.googleapis.com',
  ];

  const scriptSrc = cspDebugInfo.directives['script-src'] || '';
  const connectSrc = cspDebugInfo.directives['connect-src'] || '';

  console.log("Script-src includes Google domains:");
  for (const domain of googleDomainsInCSP) {
    const included = scriptSrc.includes(domain);
    console.log(`  ${domain}: ${included ? '✅' : '❌'}`);
  }

  console.log("\nConnect-src includes Google domains:");
  for (const domain of googleDomainsInCSP) {
    const included = connectSrc.includes(domain);
    console.log(`  ${domain}: ${included ? '✅' : '❌'}`);
  }

  // Test script loading
  console.log("\n📜 Script Loading Test:");
  try {
    // Simulate script loading test
    const scriptTest = `
      // Test if Google Identity Services script can be loaded
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      
      return new Promise((resolve, reject) => {
        script.onload = () => resolve('Script loaded successfully');
        script.onerror = () => reject('Script failed to load');
        document.head.appendChild(script);
      });
    `;
    
    console.log("✅ Script loading test prepared");
    console.log("Note: Actual script loading test requires browser environment");
  } catch (error) {
    console.log(`❌ Script loading test failed: ${error}`);
  }

  // Recommendations
  console.log("\n💡 Recommendations:");
  
  if (!googleClientId) {
    console.log("1. Set NEXT_PUBLIC_GOOGLE_CLIENT_ID in your .env file");
    console.log("2. Get the Client ID from Google Cloud Console");
    console.log("3. Make sure the domain is authorized in the OAuth consent screen");
  }

  const missingScriptDomains = googleDomainsInCSP.filter(domain => !scriptSrc.includes(domain));
  const missingConnectDomains = googleDomainsInCSP.filter(domain => !connectSrc.includes(domain));

  if (missingScriptDomains.length > 0) {
    console.log(`4. Add missing script-src domains: ${missingScriptDomains.join(', ')}`);
  }

  if (missingConnectDomains.length > 0) {
    console.log(`5. Add missing connect-src domains: ${missingConnectDomains.join(', ')}`);
  }

  console.log("6. Check browser console for specific CSP violations");
  console.log("7. Verify that the Google One Tap component is properly initialized");
  console.log("8. Test in incognito mode to avoid cached authentication issues");

  console.log("\n🔧 Next steps:");
  console.log("1. Check browser developer console for specific error messages");
  console.log("2. Verify network tab for failed requests");
  console.log("3. Test with CSP debugging enabled");
  console.log("4. Check if the issue occurs in all browsers or just specific ones");
}

// Run the test
testGoogleOneTap().catch(console.error); 