#!/bin/bash
# SPX Fusion Trading System - Deployment Script
# This script helps prepare and deploy to Vercel

set -e

echo "🚀 SPX Fusion Trading System - Deployment Script"
echo "================================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo -e "${YELLOW}⚠️  Vercel CLI not found. Installing...${NC}"
    npm install -g vercel
fi

# Check if logged in
if ! vercel whoami &> /dev/null; then
    echo -e "${YELLOW}⚠️  Not logged in to Vercel. Please login...${NC}"
    vercel login
fi

# Step 1: Check for uncommitted changes
echo -e "${GREEN}Step 1: Checking git status...${NC}"
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}⚠️  You have uncommitted changes.${NC}"
    read -p "Do you want to commit them? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git add .
        read -p "Commit message: " commit_msg
        git commit -m "$commit_msg"
    fi
fi

# Step 2: Run build locally to check for errors
echo -e "${GREEN}Step 2: Running local build check...${NC}"
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed! Please fix errors before deploying.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build successful!${NC}"

# Step 3: Check environment variables
echo -e "${GREEN}Step 3: Checking environment variables...${NC}"
echo -e "${YELLOW}⚠️  Make sure you've set these in Vercel dashboard:${NC}"
echo "  - DATABASE_URL"
echo "  - At least one market data API key (ALPACA_API_KEY, TRADIER_API_KEY, etc.)"
echo ""

# Step 4: Deploy
echo -e "${GREEN}Step 4: Deploying to Vercel...${NC}"
read -p "Deploy to production? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    vercel --prod
else
    vercel
fi

# Step 5: Post-deployment
echo -e "${GREEN}Step 5: Post-deployment checklist...${NC}"
echo -e "${YELLOW}⚠️  Don't forget to:${NC}"
echo "  1. Run database migrations (if needed)"
echo "  2. Verify environment variables are set"
echo "  3. Test the /api/health endpoint"
echo "  4. Check function logs for errors"
echo ""

echo -e "${GREEN}✅ Deployment complete!${NC}"
echo "Visit your Vercel dashboard to monitor the deployment."

