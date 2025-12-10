#!/bin/bash
# Auto-Deploy Script for Vercel
# This script automates the deployment process

set -e

echo "🚀 SPX Fusion - Auto-Deploy to Vercel"
echo "======================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo -e "${YELLOW}Installing Vercel CLI...${NC}"
    npm install -g vercel
fi

# Check if logged in
if ! vercel whoami &> /dev/null; then
    echo -e "${YELLOW}Not logged in. Please login first:${NC}"
    echo "Run: vercel login"
    exit 1
fi

# Get current user
USER=$(vercel whoami)
echo -e "${GREEN}Logged in as: $USER${NC}"
echo ""

# Check git status
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}⚠️  Uncommitted changes detected${NC}"
    echo "Auto-committing changes..."
    git add .
    git commit -m "Auto-deploy: $(date +%Y-%m-%d\ %H:%M:%S)" || true
fi

# Push to git if needed
if [ -n "$(git log origin/main..HEAD 2>/dev/null)" ]; then
    echo -e "${YELLOW}Pushing to git...${NC}"
    git push origin main || git push origin master || true
fi

# Run build check
echo -e "${GREEN}Running build check...${NC}"
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed!${NC}"
    exit 1
fi

# Deploy to Vercel
echo -e "${GREEN}Deploying to Vercel...${NC}"
echo ""

# Check if project is linked
if [ ! -f ".vercel/project.json" ]; then
    echo -e "${YELLOW}Project not linked. Linking now...${NC}"
    vercel link --yes
fi

# Deploy
DEPLOY_ENV=${1:-production}
if [ "$DEPLOY_ENV" = "production" ]; then
    echo -e "${GREEN}Deploying to PRODUCTION...${NC}"
    vercel --prod --yes
else
    echo -e "${GREEN}Deploying to PREVIEW...${NC}"
    vercel --yes
fi

echo ""
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Check deployment in Vercel dashboard"
echo "2. Run database migrations if needed"
echo "3. Verify /api/health endpoint"

