# Auto-Deploy Setup Guide

## 🤖 Automated Deployment Options

This guide explains how to set up automated deployment to Vercel.

---

## Option 1: Manual Auto-Deploy Script (Recommended for Testing)

### Setup

1. **Install Vercel CLI** (if not already installed)
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel** (one-time setup)
   ```bash
   vercel login
   ```

3. **Link Project** (one-time setup)
   ```bash
   vercel link
   ```
   - Select your Vercel account
   - Select or create project
   - Confirm settings

### Usage

**Windows (PowerShell):**
```powershell
.\scripts\auto-deploy.ps1
# Or for preview:
.\scripts\auto-deploy.ps1 preview
```

**Linux/Mac:**
```bash
chmod +x scripts/auto-deploy.sh
./scripts/auto-deploy.sh
# Or for preview:
./scripts/auto-deploy.sh preview
```

**Node.js (Cross-platform):**
```bash
npm run deploy:auto
# Or:
node scripts/auto-deploy.js production
```

### What It Does

1. ✅ Checks Vercel CLI installation
2. ✅ Verifies login status
3. ✅ Auto-commits uncommitted changes
4. ✅ Pushes to git
5. ✅ Runs build check
6. ✅ Links project if needed
7. ✅ Deploys to Vercel

---

## Option 2: GitHub Actions (Fully Automated)

### Setup

1. **Get Vercel Token**
   - Go to [vercel.com/account/tokens](https://vercel.com/account/tokens)
   - Create new token
   - Copy token

2. **Add GitHub Secret**
   - Go to your GitHub repository
   - Settings → Secrets and variables → Actions
   - New repository secret
   - Name: `VERCEL_TOKEN`
   - Value: Your Vercel token

3. **Commit Workflow File**
   - The `.github/workflows/deploy.yml` file is already created
   - Commit and push to enable

### How It Works

- **Automatic:** Deploys on every push to `main`/`master`
- **Manual:** Can trigger from Actions tab
- **Builds:** Runs build check before deploying
- **Deploys:** Uses Vercel CLI to deploy

### Trigger Deployment

**Automatic:**
```bash
git push origin main
# Automatically triggers deployment
```

**Manual:**
- Go to GitHub → Actions tab
- Select "Deploy to Vercel" workflow
- Click "Run workflow"

---

## Option 3: Vercel Git Integration (Easiest)

### Setup

1. **Connect Repository**
   - Go to Vercel Dashboard
   - Add New Project
   - Import from GitHub/GitLab/Bitbucket
   - Select repository

2. **Configure Auto-Deploy**
   - Vercel automatically deploys on:
     - Push to main branch → Production
     - Pull requests → Preview
     - Manual redeploy from dashboard

### How It Works

- **No scripts needed** - Vercel handles everything
- **Automatic builds** - On every push
- **Preview deployments** - For pull requests
- **Production deployments** - For main branch

### Trigger Deployment

```bash
git push origin main
# Vercel automatically:
# 1. Detects push
# 2. Runs build
# 3. Deploys to production
```

---

## 🔧 Configuration

### Environment Variables

Set in Vercel Dashboard:
- Project Settings → Environment Variables
- Add all required variables
- Set for Production, Preview, Development

### Build Settings

Already configured in `vercel.json`:
- Build command: `npm run build`
- Output directory: `.next`
- Framework: Next.js

### Function Timeouts

Configured in `vercel.json`:
- Default: 30 seconds
- Decision engine: 60 seconds
- Can be increased if needed

---

## 🚀 Quick Deploy Commands

### One-Time Setup
```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Link project
vercel link
```

### Deploy Commands
```bash
# Manual deploy (production)
npm run deploy
# Or:
vercel --prod

# Preview deploy
npm run deploy:preview
# Or:
vercel

# Auto-deploy script
npm run deploy:auto
# Or:
node scripts/auto-deploy.js
```

---

## 📊 Deployment Methods Comparison

| Method | Automation | Setup Complexity | Best For |
|--------|-----------|------------------|----------|
| **Vercel Git Integration** | ✅ Full | ⭐ Easy | Most users |
| **GitHub Actions** | ✅ Full | ⭐⭐ Medium | CI/CD pipelines |
| **Auto-Deploy Script** | ⚠️ Semi | ⭐ Easy | Testing/Manual |
| **Vercel CLI** | ❌ Manual | ⭐ Easy | Quick deploys |

---

## ✅ Recommended Setup

### For Most Users: Vercel Git Integration

1. Connect repository in Vercel dashboard
2. Set environment variables
3. Push to git → Auto-deploys

**Pros:**
- Zero configuration
- Automatic deployments
- Preview deployments for PRs
- Built-in monitoring

### For Advanced Users: GitHub Actions

1. Add `VERCEL_TOKEN` to GitHub secrets
2. Commit `.github/workflows/deploy.yml`
3. Push to git → Auto-deploys via Actions

**Pros:**
- Full control over build process
- Can add custom steps
- Works with any CI/CD

---

## 🔍 Verification

After deployment:

1. **Check Deployment**
   - Visit Vercel dashboard
   - Check latest deployment status
   - Review build logs

2. **Test Endpoints**
   - `/api/health` - Should return `{ "status": "ok" }`
   - `/api/signals/list` - Should return signals
   - `/api/paper/list` - Should return trades

3. **Check Logs**
   - Vercel Dashboard → Deployments → Functions
   - Look for any errors
   - Verify environment variables loaded

---

## 🛠️ Troubleshooting

### Auto-Deploy Script Fails

**Issue:** Not logged in
```bash
vercel login
```

**Issue:** Project not linked
```bash
vercel link
```

**Issue:** Build fails
```bash
npm run build
# Fix errors, then retry
```

### GitHub Actions Fails

**Issue:** Missing VERCEL_TOKEN
- Add token to GitHub Secrets
- Name must be exactly `VERCEL_TOKEN`

**Issue:** Build fails
- Check Actions logs
- Fix build errors locally first

### Vercel Git Integration Not Working

**Issue:** Not connected
- Re-import repository in Vercel
- Check repository permissions

**Issue:** Environment variables missing
- Add in Vercel dashboard
- Redeploy after adding

---

## 📝 Next Steps

1. **Choose deployment method**
   - Vercel Git Integration (easiest)
   - GitHub Actions (most control)
   - Auto-deploy script (testing)

2. **Set up environment variables**
   - Add in Vercel dashboard
   - See `.env.example` for list

3. **Deploy**
   - Push to git (if using Git Integration)
   - Or run deploy script
   - Or trigger GitHub Action

4. **Verify**
   - Check deployment status
   - Test API endpoints
   - Monitor logs

---

**Status:** ✅ Auto-Deploy Ready  
**Last Updated:** $(date)

