/**
 * Tests for sanitize module with DOMPurify integration
 * Run with: npx tsx lib/security/sanitize.test.ts
 */

import {
  sanitizeInput,
  sanitizeContent,
  sanitizeRichContent,
  sanitizeBasicHtml,
  sanitizeSearchQuery,
  escapeHtml,
  sanitizeUrl,
  sanitizeFilename,
  sanitizeTagName,
  sanitizeTagSlug,
  validateTagSlug,
  sanitizeSlug,
  sanitizeEmail,
  sanitizeJsonData,
  validateFileExtension,
  isDOMPurifyAvailable,
  getDOMPurifyConfig,
} from "./sanitize";

/**
 * Test helper function
 */
function testSanitization(
  testName: string,
  input: string,
  expectedOutput: string,
  sanitizer: (input: string) => string
) {
  const result = sanitizer(input);
  const passed = result === expectedOutput;
  console.log(`${passed ? "✅" : "❌"} ${testName}`);
  if (!passed) {
    console.log(`  Input: "${input}"`);
    console.log(`  Expected: "${expectedOutput}"`);
    console.log(`  Got: "${result}"`);
  }
  return passed;
}

/**
 * Test helper for async functions
 */
async function testAsyncSanitization(
  testName: string,
  input: string,
  expectedOutput: string,
  sanitizer: (input: string) => Promise<string>
) {
  const result = await sanitizer(input);
  const passed = result === expectedOutput;
  console.log(`${passed ? "✅" : "❌"} ${testName}`);
  if (!passed) {
    console.log(`  Input: "${input}"`);
    console.log(`  Expected: "${expectedOutput}"`);
    console.log(`  Got: "${result}"`);
  }
  return passed;
}

/**
 * Run all tests
 */
async function runTests() {
  console.log("🧪 Running sanitize module tests...\n");

  let passedTests = 0;
  let totalTests = 0;

  // Test DOMPurify availability
  console.log("🔧 DOMPurify Integration Tests:");
  const isAvailable = isDOMPurifyAvailable();
  console.log(`${isAvailable ? "✅" : "❌"} DOMPurify is available`);
  passedTests += isAvailable ? 1 : 0;
  totalTests += 1;

  const config = getDOMPurifyConfig("strict");
  console.log(`${config ? "✅" : "❌"} DOMPurify config is accessible`);
  passedTests += config ? 1 : 0;
  totalTests += 1;

  console.log();

  // Test basic sanitization
  console.log("🔒 Basic Sanitization Tests:");
  
  totalTests += testSanitization(
    "sanitizeInput - removes script tags",
    '<script>alert("xss")</script>Hello World',
    "Hello World",
    sanitizeInput
  ) ? 1 : 0;
  passedTests += 1;

  totalTests += testSanitization(
    "sanitizeInput - removes javascript URLs",
    'Click <a href="javascript:alert(1)">here</a>',
    "Click here",
    sanitizeInput
  ) ? 1 : 0;
  passedTests += 1;

  totalTests += testSanitization(
    "escapeHtml - escapes HTML entities",
    '<script>alert("xss")</script>',
    "&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;",
    escapeHtml
  ) ? 1 : 0;
  passedTests += 1;

  console.log();

  // Test content sanitization
  console.log("📝 Content Sanitization Tests:");
  
  totalTests += testSanitization(
    "sanitizeContent - removes dangerous HTML",
    '<iframe src="evil.com"></iframe><p>Safe content</p>',
    "Safe content",
    sanitizeContent
  ) ? 1 : 0;
  passedTests += 1;

  totalTests += testSanitization(
    "sanitizeRichContent - allows safe HTML",
    '<p>Hello <strong>World</strong> <a href="https://example.com">Link</a></p>',
    '<p>Hello <strong>World</strong> <a href="https://example.com">Link</a></p>',
    sanitizeRichContent
  ) ? 1 : 0;
  passedTests += 1;

  totalTests += testSanitization(
    "sanitizeBasicHtml - allows limited HTML",
    '<p>Hello <strong>World</strong></p><script>alert(1)</script>',
    "<p>Hello <strong>World</strong></p>",
    sanitizeBasicHtml
  ) ? 1 : 0;
  passedTests += 1;

  console.log();

  // Test URL and filename sanitization
  console.log("🔗 URL & Filename Tests:");
  
  totalTests += testSanitization(
    "sanitizeUrl - allows safe URLs",
    "https://example.com",
    "https://example.com",
    (input) => sanitizeUrl(input) || ""
  ) ? 1 : 0;
  passedTests += 1;

  totalTests += testSanitization(
    "sanitizeUrl - blocks javascript URLs",
    "javascript:alert(1)",
    "",
    (input) => sanitizeUrl(input) || ""
  ) ? 1 : 0;
  passedTests += 1;

  totalTests += testSanitization(
    "sanitizeFilename - sanitizes filename",
    "../../../etc/passwd",
    "etcpasswd",
    sanitizeFilename
  ) ? 1 : 0;
  passedTests += 1;

  console.log();

  // Test tag sanitization
  console.log("🏷️ Tag Sanitization Tests:");
  
  totalTests += testSanitization(
    "sanitizeTagName - allows safe characters",
    "My Tag Name 123",
    "My Tag Name 123",
    sanitizeTagName
  ) ? 1 : 0;
  passedTests += 1;

  totalTests += testSanitization(
    "sanitizeTagSlug - creates valid slug",
    "My Tag Name 123",
    "my-tag-name-123",
    sanitizeTagSlug
  ) ? 1 : 0;
  passedTests += 1;

  totalTests += testSanitization(
    "validateTagSlug - validates slug format",
    "my-tag-name-123",
    "true",
    (input) => validateTagSlug(input).toString()
  ) ? 1 : 0;
  passedTests += 1;

  console.log();

  // Test search query sanitization
  console.log("🔍 Search Query Tests:");
  
  totalTests += await testAsyncSanitization(
    "sanitizeSearchQuery - removes SQL injection",
    "'; DROP TABLE users; --",
    "",
    sanitizeSearchQuery
  ) ? 1 : 0;
  passedTests += 1;

  totalTests += await testAsyncSanitization(
    "sanitizeSearchQuery - allows safe queries",
    "hello world",
    "hello world",
    sanitizeSearchQuery
  ) ? 1 : 0;
  passedTests += 1;

  console.log();

  // Test other utilities
  console.log("🛠️ Utility Tests:");
  
  totalTests += testSanitization(
    "sanitizeSlug - creates URL slug",
    "My Page Title!",
    "my-page-title",
    sanitizeSlug
  ) ? 1 : 0;
  passedTests += 1;

  totalTests += testSanitization(
    "sanitizeEmail - validates email",
    "user@example.com",
    "user@example.com",
    (input) => sanitizeEmail(input) || ""
  ) ? 1 : 0;
  passedTests += 1;

  totalTests += testSanitization(
    "validateFileExtension - blocks dangerous files",
    "malware.exe",
    "false",
    (input) => validateFileExtension(input).toString()
  ) ? 1 : 0;
  passedTests += 1;

  console.log();

  // Test JSON sanitization
  console.log("📄 JSON Sanitization Tests:");
  
  const testData = {
    name: '<script>alert("xss")</script>John',
    email: "user@example.com",
    tags: ["<script>", "safe-tag"]
  };
  
  const sanitizedData = sanitizeJsonData(testData) as {
    name: string;
    email: string;
    tags: string[];
  };
  const jsonTest = sanitizedData.name === "John" && 
                   sanitizedData.email === "user@example.com" &&
                   sanitizedData.tags[0] === "" &&
                   sanitizedData.tags[1] === "safe-tag";
  
  console.log(`${jsonTest ? "✅" : "❌"} sanitizeJsonData - sanitizes nested objects`);
  passedTests += jsonTest ? 1 : 0;
  totalTests += 1;

  console.log();
  console.log(`📊 Test Results: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log("🎉 All tests passed! DOMPurify integration is working correctly.");
  } else {
    console.log("⚠️ Some tests failed. Please review the output above.");
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

export { runTests }; 