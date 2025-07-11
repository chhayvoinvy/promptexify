#!/usr/bin/env tsx

/**
 * Production Setup Script for Sanity CMS
 * 
 * This script helps set up Sanity for production deployment
 * Run with: npx tsx scripts/setup-sanity-production.ts
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

interface SetupConfig {
  projectId: string;
  dataset: string;
  apiVersion: string;
  domain: string;
  webhookSecret?: string;
}

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bright: '\x1b[1m'
};

function log(message: string, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function generateWebhookSecret(): string {
  try {
    return execSync('openssl rand -hex 32', { encoding: 'utf8' }).trim();
  } catch {
    // Fallback if openssl is not available
    return require('crypto').randomBytes(32).toString('hex');
  }
}

function checkSanityInstallation(): boolean {
  try {
    execSync('sanity --version', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

function installSanityCLI(): void {
  log('Installing Sanity CLI...', colors.yellow);
  try {
    execSync('npm install -g @sanity/cli', { stdio: 'inherit' });
    log('✅ Sanity CLI installed successfully', colors.green);
  } catch (error) {
    log('❌ Failed to install Sanity CLI', colors.red);
    throw error;
  }
}

function createDataset(projectId: string, dataset: string): void {
  log(`Creating dataset: ${dataset}...`, colors.yellow);
  try {
    execSync(`sanity dataset create ${dataset} --project-id ${projectId}`, { 
      stdio: 'inherit' 
    });
    log(`✅ Dataset ${dataset} created successfully`, colors.green);
  } catch (error) {
    log(`ℹ️  Dataset ${dataset} may already exist`, colors.cyan);
  }
}

function setDatasetVisibility(projectId: string, dataset: string, visibility: 'public' | 'private'): void {
  log(`Setting dataset visibility to ${visibility}...`, colors.yellow);
  try {
    execSync(`sanity dataset visibility set ${dataset} ${visibility} --project-id ${projectId}`, { 
      stdio: 'inherit' 
    });
    log(`✅ Dataset visibility set to ${visibility}`, colors.green);
  } catch (error) {
    log(`⚠️  Could not set dataset visibility: ${error}`, colors.yellow);
  }
}

function updateEnvironmentFile(config: SetupConfig): void {
  log('Updating environment variables...', colors.yellow);
  
  const envPath = join(process.cwd(), '.env.local');
  let envContent = '';
  
  try {
    envContent = readFileSync(envPath, 'utf8');
  } catch {
    // File doesn't exist, start with empty content
  }

  // Update or add environment variables
  const envVars = {
    NEXT_PUBLIC_SANITY_PROJECT_ID: config.projectId,
    NEXT_PUBLIC_SANITY_DATASET: config.dataset,
    NEXT_PUBLIC_SANITY_API_VERSION: config.apiVersion,
    SANITY_WEBHOOK_SECRET: config.webhookSecret || generateWebhookSecret(),
    NEXT_PUBLIC_BASE_URL: `https://${config.domain}`,
  };

  for (const [key, value] of Object.entries(envVars)) {
    const regex = new RegExp(`^${key}=.*$`, 'm');
    const line = `${key}=${value}`;
    
    if (regex.test(envContent)) {
      envContent = envContent.replace(regex, line);
    } else {
      envContent += `\n${line}`;
    }
  }

  writeFileSync(envPath, envContent.trim() + '\n');
  log('✅ Environment variables updated in .env.local', colors.green);
}

function generateSetupSummary(config: SetupConfig): string {
  return `
${colors.bright}${colors.cyan}🚀 Sanity Production Setup Complete!${colors.reset}

${colors.bright}Next Steps:${colors.reset}

${colors.yellow}1. Configure API Token:${colors.reset}
   • Go to: https://www.sanity.io/manage/personal/project/${config.projectId}
   • Navigate to "API" → "Tokens"
   • Create a new token with "Editor" permissions
   • Add to your environment: SANITY_API_TOKEN=your_token_here

${colors.yellow}2. Configure CORS:${colors.reset}
   • In Sanity Management Console → "API" → "CORS origins"
   • Add: https://${config.domain}

${colors.yellow}3. Set Up Webhook:${colors.reset}
   • In Sanity Management Console → "API" → "Webhooks"
   • Create webhook:
     - URL: https://${config.domain}/api/webhooks/sanity
     - Secret: ${config.webhookSecret}
     - Trigger on: Create, Update, Delete

${colors.yellow}4. Deploy Your Application:${colors.reset}
   • Your studio will be available at: https://${config.domain}/dashboard/pages/studio
   • Test content creation and webhook functionality

${colors.bright}Environment Variables Added:${colors.reset}
${Object.entries({
  NEXT_PUBLIC_SANITY_PROJECT_ID: config.projectId,
  NEXT_PUBLIC_SANITY_DATASET: config.dataset,
  NEXT_PUBLIC_SANITY_API_VERSION: config.apiVersion,
  SANITY_WEBHOOK_SECRET: config.webhookSecret,
  NEXT_PUBLIC_BASE_URL: `https://${config.domain}`,
}).map(([key, value]) => `   ${colors.cyan}${key}${colors.reset}=${value}`).join('\n')}

${colors.green}✅ Setup complete! Check the documentation at docs/sanity-production-setup.md for detailed instructions.${colors.reset}
`;
}

async function main(): Promise<void> {
  log(`${colors.bright}${colors.magenta}🎯 Sanity Production Setup${colors.reset}\n`);

  // Check if Sanity CLI is installed
  if (!checkSanityInstallation()) {
    log('Sanity CLI not found. Installing...', colors.yellow);
    installSanityCLI();
  } else {
    log('✅ Sanity CLI is installed', colors.green);
  }

  // Get configuration from user or environment
  const config: SetupConfig = {
    projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || '8xwrk88i', // From env.template
    dataset: 'production',
    apiVersion: '2024-03-15',
    domain: process.env.NEXT_PUBLIC_BASE_URL?.replace('https://', '') || 'your-domain.com',
    webhookSecret: generateWebhookSecret(),
  };

  // Validate project ID
  if (!config.projectId || config.projectId === 'your_project_id') {
    log('❌ Please set NEXT_PUBLIC_SANITY_PROJECT_ID in your environment', colors.red);
    process.exit(1);
  }

  log(`Using project ID: ${config.projectId}`, colors.cyan);
  log(`Using dataset: ${config.dataset}`, colors.cyan);
  log(`Using domain: ${config.domain}`, colors.cyan);

  try {
    // Create production dataset
    createDataset(config.projectId, config.dataset);
    
    // Set dataset to public for read access
    setDatasetVisibility(config.projectId, config.dataset, 'public');
    
    // Update environment variables
    updateEnvironmentFile(config);
    
    // Show setup summary
    console.log(generateSetupSummary(config));
    
  } catch (error) {
    log(`❌ Setup failed: ${error}`, colors.red);
    process.exit(1);
  }
}

// Run the setup
if (require.main === module) {
  main().catch((error) => {
    console.error('Setup failed:', error);
    process.exit(1);
  });
} 