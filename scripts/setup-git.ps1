# Setup Git Repository for Vercel Deployment (PowerShell)

Write-Host "🔧 Setting up Git repository for Vercel..." -ForegroundColor Green
Write-Host ""

# Check if already a git repo
if (Test-Path ".git") {
    Write-Host "✅ Git repository already initialized" -ForegroundColor Green
} else {
    Write-Host "Initializing Git repository..." -ForegroundColor Yellow
    git init
    Write-Host "✅ Git repository initialized" -ForegroundColor Green
}

# Check if .gitignore exists
if (-not (Test-Path ".gitignore")) {
    Write-Host "Creating .gitignore..." -ForegroundColor Yellow
    @"
# dependencies
/node_modules
/.pnp
.pnp.js

# testing
/coverage

# next.js
/.next/
/out/

# production
/build

# misc
.DS_Store
*.pem

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# local env files
.env*.local
.env

# vercel
.vercel

# typescript
*.tsbuildinfo
next-env.d.ts
"@ | Out-File -FilePath ".gitignore" -Encoding utf8
    Write-Host "✅ .gitignore created" -ForegroundColor Green
}

# Add all files
Write-Host "Adding files to git..." -ForegroundColor Yellow
git add .

# Check if there are changes to commit
$status = git status --porcelain
if ($status) {
    Write-Host "Committing files..." -ForegroundColor Yellow
    git commit -m "Initial commit: SPX Fusion Trading System"
    Write-Host "✅ Files committed" -ForegroundColor Green
} else {
    Write-Host "✅ All files already committed" -ForegroundColor Green
}

Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Create a repository on GitHub:"
Write-Host "   - Go to github.com/new"
Write-Host "   - Create new repository (don't initialize with README)"
Write-Host ""
Write-Host "2. Add remote and push:"
Write-Host "   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git"
Write-Host "   git branch -M main"
Write-Host "   git push -u origin main"
Write-Host ""
Write-Host "3. Then go to vercel.com/new and import your repository"
Write-Host ""

