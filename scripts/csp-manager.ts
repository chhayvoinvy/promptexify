#!/usr/bin/env node

/**
 * CSP Manager CLI Tool
 * 
 * This tool helps manage Content Security Policy hashes and policies
 * without manually calculating hashes or editing configuration files.
 */

import { CSPHashGenerator, CSPPolicyBuilder } from '../lib/security/csp';
import fs from 'fs/promises';
import path from 'path';

interface CSPManagerOptions {
  action: 'generate-hash' | 'validate-hash' | 'add-hash' | 'list-hashes' | 'create-policy' | 'analyze-violation' | 'hash' | 'add';
  content?: string;
  hash?: string;
  type?: 'script' | 'style';
  file?: string;
  nonce?: string;
}

class CSPManager {
  private cspFilePath = path.join(process.cwd(), 'lib/security/csp.ts');

  /**
   * Generate hash for inline content
   */
  async generateHash(content: string): Promise<string> {
    const hash = await CSPHashGenerator.generateHash(content);
    console.log(`🔑 Generated hash: ${hash}`);
    return hash;
  }

  /**
   * Validate if a hash is properly formatted
   */
  validateHash(hash: string): boolean {
    const isValid = CSPHashGenerator.isValidHash(hash);
    console.log(`✅ Hash validation: ${isValid ? 'Valid' : 'Invalid'}`);
    return isValid;
  }

  /**
   * Add hash to CSP configuration file
   */
  async addHash(hash: string, type: 'script' | 'style'): Promise<void> {
    try {
      const content = await fs.readFile(this.cspFilePath, 'utf-8');
      const hashArray = type === 'script' ? 'CSP_HASHES.SCRIPTS' : 'CSP_HASHES.STYLES';
      
      // Find the array and add the hash
      const arrayRegex = new RegExp(`(${hashArray}\\s*=\\s*\\[)([^\\]]*)(\\])`, 's');
      const match = content.match(arrayRegex);
      
      if (!match) {
        throw new Error(`Could not find ${hashArray} array in CSP configuration`);
      }

      const [, prefix, existingHashes, suffix] = match;
      const hashes = existingHashes
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('//'))
        .map(line => line.replace(/,$/, ''));

      // Check if hash already exists
      if (hashes.includes(hash)) {
        console.log(`⚠️  Hash already exists in ${hashArray}`);
        return;
      }

      // Add new hash
      hashes.push(hash);
      const newArrayContent = hashes.map(h => `    ${h},`).join('\n');
      const newContent = content.replace(arrayRegex, `${prefix}\n${newArrayContent}\n  ${suffix}`);

      await fs.writeFile(this.cspFilePath, newContent, 'utf-8');
      console.log(`✅ Added hash to ${hashArray}: ${hash}`);
    } catch (error) {
      console.error(`❌ Failed to add hash: ${error}`);
      throw error;
    }
  }

  /**
   * List all current hashes
   */
  async listHashes(): Promise<void> {
    try {
      const content = await fs.readFile(this.cspFilePath, 'utf-8');
      
      // Extract script hashes
      const scriptMatch = content.match(/CSP_HASHES\.SCRIPTS\s*=\s*\[([\s\S]*?)\]/);
      if (scriptMatch) {
        console.log('\n📜 Script Hashes:');
        const scriptHashes = scriptMatch[1]
          .split('\n')
          .map(line => line.trim())
          .filter(line => line && !line.startsWith('//'))
          .map(line => line.replace(/,$/, ''));
        
        scriptHashes.forEach((hash, index) => {
          console.log(`  ${index + 1}. ${hash}`);
        });
      }

      // Extract style hashes
      const styleMatch = content.match(/CSP_HASHES\.STYLES\s*=\s*\[([\s\S]*?)\]/);
      if (styleMatch) {
        console.log('\n🎨 Style Hashes:');
        const styleHashes = styleMatch[1]
          .split('\n')
          .map(line => line.trim())
          .filter(line => line && !line.startsWith('//'))
          .map(line => line.replace(/,$/, ''));
        
        styleHashes.forEach((hash, index) => {
          console.log(`  ${index + 1}. ${hash}`);
        });
      }
    } catch (error) {
      console.error(`❌ Failed to list hashes: ${error}`);
    }
  }

  /**
   * Create a CSP policy
   */
  createPolicy(nonce?: string): void {
    const isProduction = process.env.NODE_ENV === 'production';
    
    if (isProduction && nonce) {
      const policy = CSPPolicyBuilder.createProductionPolicy(nonce);
      console.log('\n🔒 Production CSP Policy:');
      console.log(policy);
    } else {
      const policy = CSPPolicyBuilder.createDevelopmentPolicy();
      console.log('\n🔓 Development CSP Policy:');
      console.log(policy);
    }
  }

  /**
   * Analyze CSP violation from file
   */
  async analyzeViolation(filePath: string): Promise<void> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const violation = JSON.parse(content);
      
      if (violation['csp-report']) {
        const { CSPViolationHandler } = await import('../lib/security/csp');
        const analysis = await CSPViolationHandler.analyzeViolation(violation['csp-report']);
        
        console.log('\n🔍 CSP Violation Analysis:');
        console.log(`Type: ${analysis.type}`);
        console.log(`Suggested Fix: ${analysis.suggestedFix}`);
        
        if (analysis.hash) {
          console.log(`Generated Hash: ${analysis.hash}`);
        }
        
        if (analysis.domain) {
          console.log(`Domain: ${analysis.domain}`);
        }
      }
    } catch (error) {
      console.error(`❌ Failed to analyze violation: ${error}`);
    }
  }

  /**
   * Run the CLI tool
   */
  async run(options: CSPManagerOptions): Promise<void> {
    try {
      // Handle action aliases
      const action = options.action === 'hash' ? 'generate-hash' : 
                    options.action === 'add' ? 'add-hash' : 
                    options.action;

      switch (action) {
        case 'generate-hash':
          if (!options.content) {
            throw new Error('Content is required for generate-hash action');
          }
          await this.generateHash(options.content);
          break;

        case 'validate-hash':
          if (!options.hash) {
            throw new Error('Hash is required for validate-hash action');
          }
          this.validateHash(options.hash);
          break;

        case 'add-hash':
          if (!options.hash || !options.type) {
            throw new Error('Hash and type are required for add-hash action');
          }
          await this.addHash(options.hash, options.type);
          break;

        case 'list-hashes':
          await this.listHashes();
          break;

        case 'create-policy':
          this.createPolicy(options.nonce);
          break;

        case 'analyze-violation':
          if (!options.file) {
            throw new Error('File path is required for analyze-violation action');
          }
          await this.analyzeViolation(options.file);
          break;

        default:
          console.log('Unknown action. Use --help for usage information.');
      }
    } catch (error) {
      console.error(`❌ Error: ${error}`);
      process.exit(1);
    }
  }
}

// CLI argument parsing
function parseArgs(): CSPManagerOptions {
  const args = process.argv.slice(2);
  const options: CSPManagerOptions = { action: 'list-hashes' };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--action':
      case '-a':
        options.action = args[++i] as any;
        break;
      case '--content':
      case '-c':
        options.content = args[++i];
        break;
      case '--hash':
      case '-h':
        options.hash = args[++i];
        break;
      case '--type':
      case '-t':
        options.type = args[++i] as 'script' | 'style';
        break;
      case '--file':
      case '-f':
        options.file = args[++i];
        break;
      case '--nonce':
      case '-n':
        options.nonce = args[++i];
        break;
      case '--help':
        showHelp();
        process.exit(0);
      default:
        // Handle positional arguments for backward compatibility
        if (!options.action || options.action === 'list-hashes') {
          options.action = arg as any;
        } else if (!options.content && (options.action === 'generate-hash' || options.action === 'hash')) {
          options.content = arg;
        } else if (!options.hash && (options.action === 'add-hash' || options.action === 'add')) {
          options.hash = arg;
        } else if (!options.type && (options.action === 'add-hash' || options.action === 'add')) {
          options.type = arg as 'script' | 'style';
        } else {
          console.log(`Unknown argument: ${arg}`);
          showHelp();
          process.exit(1);
        }
    }
  }

  return options;
}

function showHelp(): void {
  console.log(`
CSP Manager CLI Tool

Usage: npx tsx scripts/csp-manager.ts [options]

Actions:
  generate-hash    Generate hash for inline content
  validate-hash    Validate if a hash is properly formatted
  add-hash         Add hash to CSP configuration
  list-hashes      List all current hashes
  create-policy    Create CSP policy
  analyze-violation Analyze CSP violation from file

Options:
  -a, --action     Action to perform
  -c, --content    Content for hash generation
  -h, --hash       Hash to validate or add
  -t, --type       Type of hash (script|style)
  -f, --file       File path for violation analysis
  -n, --nonce      Nonce for policy creation
  --help           Show this help message

Examples:
  # Generate hash for inline script
  npx tsx scripts/csp-manager.ts -a generate-hash -c "console.log('hello')"

  # Add script hash to configuration
  npx tsx scripts/csp-manager.ts -a add-hash -h "'sha256-abc123'" -t script

  # List all hashes
  npx tsx scripts/csp-manager.ts -a list-hashes

  # Create production policy
  npx tsx scripts/csp-manager.ts -a create-policy -n "abc123"

  # Analyze violation from file
  npx tsx scripts/csp-manager.ts -a analyze-violation -f violation.json
`);
}

// Run the CLI tool
if (require.main === module) {
  const options = parseArgs();
  const manager = new CSPManager();
  manager.run(options);
} 