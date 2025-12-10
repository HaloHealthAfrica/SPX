#!/bin/bash
# Setup Git Repository for Vercel Deployment

set -e

echo "🔧 Setting up Git repository for Vercel..."
echo ""

# Check if already a git repo
if [ -d ".git" ]; then
    echo "✅ Git repository already initialized"
else
    echo "Initializing Git repository..."
    git init
    echo "✅ Git repository initialized"
fi

# Check if .gitignore exists
if [ ! -f ".gitignore" ]; then
    echo "Creating .gitignore..."
    cat > .gitignore << 'EOF'
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
EOF
    echo "✅ .gitignore created"
fi

# Add all files
echo "Adding files to git..."
git add .

# Check if there are changes to commit
if [ -n "$(git status --porcelain)" ]; then
    echo "Committing files..."
    git commit -m "Initial commit: SPX Fusion Trading System"
    echo "✅ Files committed"
else
    echo "✅ All files already committed"
fi

echo ""
echo "📋 Next Steps:"
echo "1. Create a repository on GitHub:"
echo "   - Go to github.com/new"
echo "   - Create new repository (don't initialize with README)"
echo ""
echo "2. Add remote and push:"
echo "   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git"
echo "   git branch -M main"
echo "   git push -u origin main"
echo ""
echo "3. Then go to vercel.com/new and import your repository"
echo ""

