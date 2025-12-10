#!/usr/bin/env node
/**
 * Auto-Deploy Script for Vercel
 * Automated deployment with checks and verification
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const colors = {
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  reset: '\x1b[0m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function exec(command, options = {}) {
  try {
    return execSync(command, { 
      stdio: 'inherit', 
      encoding: 'utf8',
      ...options 
    });
  } catch (error) {
    if (!options.ignoreErrors) {
      throw error;
    }
  }
}

async function main() {
  log('🚀 SPX Fusion - Auto-Deploy to Vercel', 'green');
  log('======================================', 'green');
  log('');

  // Check if Vercel CLI is installed
  try {
    execSync('vercel --version', { stdio: 'ignore' });
  } catch {
    log('Installing Vercel CLI...', 'yellow');
    exec('npm install -g vercel');
  }

  // Check if logged in
  try {
    const user = execSync('vercel whoami', { encoding: 'utf8' }).trim();
    log(`Logged in as: ${user}`, 'green');
  } catch {
    log('Not logged in. Please login first:', 'yellow');
    log('Run: vercel login', 'yellow');
    process.exit(1);
  }

  log('');

  // Check git status
  try {
    const status = execSync('git status --porcelain', { encoding: 'utf8' });
    if (status.trim()) {
      log('⚠️  Uncommitted changes detected', 'yellow');
      log('Auto-committing changes...', 'yellow');
      exec('git add .');
      const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
      exec(`git commit -m "Auto-deploy: ${timestamp}"`, { ignoreErrors: true });
    }
  } catch {
    log('⚠️  Not a git repository, skipping git operations', 'yellow');
  }

  // Push to git if needed
  try {
    exec('git push origin main', { ignoreErrors: true });
  } catch {
    try {
      exec('git push origin master', { ignoreErrors: true });
    } catch {}
  }

  // Run build check
  log('Running build check...', 'green');
  try {
    exec('npm run build');
    log('✅ Build successful!', 'green');
  } catch (error) {
    log('❌ Build failed!', 'red');
    process.exit(1);
  }

  log('');

  // Check if project is linked
  const vercelDir = path.join(process.cwd(), '.vercel');
  if (!fs.existsSync(path.join(vercelDir, 'project.json'))) {
    log('Project not linked. Linking now...', 'yellow');
    exec('vercel link --yes');
  }

  // Deploy
  const deployEnv = process.argv[2] || 'production';
  if (deployEnv === 'production') {
    log('Deploying to PRODUCTION...', 'green');
    exec('vercel --prod --yes');
  } else {
    log('Deploying to PREVIEW...', 'green');
    exec('vercel --yes');
  }

  log('');
  log('✅ Deployment complete!', 'green');
  log('');
  log('Next steps:', 'yellow');
  log('1. Check deployment in Vercel dashboard');
  log('2. Run database migrations if needed');
  log('3. Verify /api/health endpoint');
}

main().catch((error) => {
  log(`❌ Error: ${error.message}`, 'red');
  process.exit(1);
});

