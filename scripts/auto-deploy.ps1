# Auto-Deploy Script for Vercel (PowerShell)
# This script automates the deployment process

Write-Host "🚀 SPX Fusion - Auto-Deploy to Vercel" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green
Write-Host ""

# Check if Vercel CLI is installed
try {
    $null = Get-Command vercel -ErrorAction Stop
} catch {
    Write-Host "Installing Vercel CLI..." -ForegroundColor Yellow
    npm install -g vercel
}

# Check if logged in
try {
    $user = vercel whoami 2>&1
    Write-Host "Logged in as: $user" -ForegroundColor Green
} catch {
    Write-Host "Not logged in. Please login first:" -ForegroundColor Yellow
    Write-Host "Run: vercel login" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Check git status
$status = git status --porcelain
if ($status) {
    Write-Host "⚠️  Uncommitted changes detected" -ForegroundColor Yellow
    Write-Host "Auto-committing changes..." -ForegroundColor Yellow
    git add .
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    git commit -m "Auto-deploy: $timestamp" -ErrorAction SilentlyContinue
}

# Push to git if needed
try {
    $ahead = git rev-list --count origin/main..HEAD 2>$null
    if ($ahead -gt 0) {
        Write-Host "Pushing to git..." -ForegroundColor Yellow
        git push origin main -ErrorAction SilentlyContinue
    }
} catch {
    try {
        git push origin master -ErrorAction SilentlyContinue
    } catch {}
}

# Run build check
Write-Host "Running build check..." -ForegroundColor Green
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    exit 1
}

# Deploy to Vercel
Write-Host "Deploying to Vercel..." -ForegroundColor Green
Write-Host ""

# Check if project is linked
if (-not (Test-Path ".vercel/project.json")) {
    Write-Host "Project not linked. Linking now..." -ForegroundColor Yellow
    vercel link --yes
}

# Deploy
$deployEnv = $args[0]
if (-not $deployEnv) { $deployEnv = "production" }

if ($deployEnv -eq "production") {
    Write-Host "Deploying to PRODUCTION..." -ForegroundColor Green
    vercel --prod --yes
} else {
    Write-Host "Deploying to PREVIEW..." -ForegroundColor Green
    vercel --yes
}

Write-Host ""
Write-Host "✅ Deployment complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:"
Write-Host "1. Check deployment in Vercel dashboard"
Write-Host "2. Run database migrations if needed"
Write-Host "3. Verify /api/health endpoint"

