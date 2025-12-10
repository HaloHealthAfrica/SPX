# SPX Fusion Trading System - Deployment Script (PowerShell)
# This script helps prepare and deploy to Vercel

Write-Host "🚀 SPX Fusion Trading System - Deployment Script" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""

# Check if Vercel CLI is installed
try {
    $null = Get-Command vercel -ErrorAction Stop
} catch {
    Write-Host "⚠️  Vercel CLI not found. Installing..." -ForegroundColor Yellow
    npm install -g vercel
}

# Check if logged in
try {
    $null = vercel whoami 2>&1
} catch {
    Write-Host "⚠️  Not logged in to Vercel. Please login..." -ForegroundColor Yellow
    vercel login
}

# Step 1: Check for uncommitted changes
Write-Host "Step 1: Checking git status..." -ForegroundColor Green
$status = git status --porcelain
if ($status) {
    Write-Host "⚠️  You have uncommitted changes." -ForegroundColor Yellow
    $commit = Read-Host "Do you want to commit them? (y/n)"
    if ($commit -eq "y" -or $commit -eq "Y") {
        git add .
        $commitMsg = Read-Host "Commit message"
        git commit -m $commitMsg
    }
}

# Step 2: Run build locally to check for errors
Write-Host "Step 2: Running local build check..." -ForegroundColor Green
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed! Please fix errors before deploying." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Build successful!" -ForegroundColor Green

# Step 3: Check environment variables
Write-Host "Step 3: Checking environment variables..." -ForegroundColor Green
Write-Host "⚠️  Make sure you've set these in Vercel dashboard:" -ForegroundColor Yellow
Write-Host "  - DATABASE_URL"
Write-Host "  - At least one market data API key (ALPACA_API_KEY, TRADIER_API_KEY, etc.)"
Write-Host ""

# Step 4: Deploy
Write-Host "Step 4: Deploying to Vercel..." -ForegroundColor Green
$prod = Read-Host "Deploy to production? (y/n)"
if ($prod -eq "y" -or $prod -eq "Y") {
    vercel --prod
} else {
    vercel
}

# Step 5: Post-deployment
Write-Host "Step 5: Post-deployment checklist..." -ForegroundColor Green
Write-Host "⚠️  Don't forget to:" -ForegroundColor Yellow
Write-Host "  1. Run database migrations (if needed)"
Write-Host "  2. Verify environment variables are set"
Write-Host "  3. Test the /api/health endpoint"
Write-Host "  4. Check function logs for errors"
Write-Host ""

Write-Host "✅ Deployment complete!" -ForegroundColor Green
Write-Host "Visit your Vercel dashboard to monitor the deployment."

