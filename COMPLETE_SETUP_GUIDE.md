# 🚀 Complete Vercel Git Integration Setup

## ✅ Step 1: Git Repository (DONE!)
- ✅ Git repository initialized
- ✅ All files committed
- ✅ Ready to push to GitHub

---

## 📋 Step 2: Create GitHub Repository

### Option A: Via GitHub Website

1. **Go to GitHub**
   - Visit [github.com/new](https://github.com/new)
   - Sign in to your account

2. **Create Repository**
   - **Repository name:** `SPX` (or your preferred name)
   - **Description:** "SPX Fusion Trading System"
   - **Visibility:** Private (recommended) or Public
   - **⚠️ IMPORTANT:** Do NOT check:
     - ❌ Add a README file
     - ❌ Add .gitignore
     - ❌ Choose a license
   - **Click:** "Create repository"

3. **Copy Repository URL**
   - GitHub will show you the repository URL
   - Copy it (looks like: `https://github.com/YOUR_USERNAME/SPX.git`)

### Option B: Via GitHub CLI (if installed)

```bash
gh repo create SPX --private --source=. --remote=origin --push
```

---

## 🔗 Step 3: Connect to GitHub

Run these commands (replace with your actual repository URL):

```powershell
# Add GitHub remote
git remote add origin https://github.com/YOUR_USERNAME/SPX.git

# Rename branch to main (if needed)
git branch -M main

# Push to GitHub
git push -u origin main
```

**Replace `YOUR_USERNAME` with your GitHub username!**

---

## 🚀 Step 4: Connect to Vercel

1. **Go to Vercel**
   - Visit [vercel.com/new](https://vercel.com/new)
   - **Sign in with GitHub** (recommended)

2. **Import Repository**
   - You'll see a list of your GitHub repositories
   - **Find:** `SPX` (or your repository name)
   - **Click:** "Import" button

3. **If Repository Not Listed**
   - Click **"Adjust GitHub App Permissions"**
   - Grant access to your repository
   - Refresh the page
   - Repository should now appear

---

## ⚙️ Step 5: Configure Project in Vercel

Vercel will auto-detect Next.js. Verify these settings:

- ✅ **Framework Preset:** Next.js (auto-detected)
- ✅ **Root Directory:** `./` (default)
- ✅ **Build Command:** `npm run build` (default)
- ✅ **Output Directory:** `.next` (default)
- ✅ **Install Command:** `npm install` (default)

**⚠️ DON'T CLICK DEPLOY YET!** Set environment variables first.

---

## 🔐 Step 6: Set Environment Variables

**Before deploying**, set environment variables:

1. **Go to Project Settings**
   - In the import screen, click **"Environment Variables"** (or go to Settings after import)
   - Or: Project → Settings → Environment Variables

2. **Add Required Variables**

   **Database (Required):**
   ```
   Name: DATABASE_URL
   Value: postgresql://user:password@host:5432/database?sslmode=require
   Environments: ✅ Production, ✅ Preview, ✅ Development
   ```

   **Market Data (At least one required):**
   ```
   Name: ALPACA_API_KEY
   Value: your_alpaca_api_key
   Environments: ✅ Production, ✅ Preview, ✅ Development
   ```
   
   ```
   Name: ALPACA_SECRET_KEY
   Value: your_alpaca_secret_key
   Environments: ✅ Production, ✅ Preview, ✅ Development
   ```

   **OR use Tradier:**
   ```
   Name: TRADIER_API_KEY
   Value: your_tradier_api_key
   Environments: ✅ Production, ✅ Preview, ✅ Development
   ```

   **OR use TwelveData:**
   ```
   Name: TWELVEDATA_API_KEY
   Value: your_twelvedata_api_key
   Environments: ✅ Production, ✅ Preview, ✅ Development
   ```

3. **Click "Save"** for each variable

**See `.env.example` for complete list of variables**

---

## 🚀 Step 7: Deploy!

1. **Click "Deploy"**
   - Vercel will start building
   - Watch the build logs in real-time

2. **Wait for Build**
   - First build: 3-5 minutes
   - Subsequent builds: 1-2 minutes

3. **Deployment Complete!**
   - You'll see: "Congratulations! Your project has been deployed"
   - Your URL: `https://your-project.vercel.app`

---

## 🗄️ Step 8: Set Up Database

### Option A: Vercel Postgres (Easiest)

1. **Add Vercel Postgres**
   - Go to your project in Vercel
   - Click **"Storage"** tab
   - Click **"Create Database"**
   - Select **"Postgres"**
   - Choose plan (Hobby is free)
   - Click **"Create"**

2. **Get Connection String**
   - Go to **Storage** → **Postgres** → **.env.local**
   - Copy `POSTGRES_URL` or `DATABASE_URL`
   - Update environment variable in Vercel

3. **Run Migrations**
   ```bash
   # Pull env vars
   vercel env pull .env.local
   
   # Run migrations
   npm run db:migrate
   ```

### Option B: External PostgreSQL

1. **Use External Provider**
   - Supabase, Neon, Railway, etc.
   - Get connection string
   - Add to Vercel environment variables

2. **Ensure SSL**
   - Connection string must include `?sslmode=require`

---

## ✅ Step 9: Verify Deployment

1. **Health Check**
   - Visit: `https://your-project.vercel.app/api/health`
   - Should return: `{ "status": "ok", "database": "connected" }`

2. **Test Endpoints**
   - `/api/signals/list`
   - `/api/paper/list`
   - `/api/decisions`

3. **Check Logs**
   - Vercel Dashboard → Deployments → [Latest] → Functions
   - Look for any errors

---

## 🎉 Success! Auto-Deployment is Now Active

**Every time you push to GitHub:**
1. ✅ Vercel automatically detects the push
2. ✅ Runs `npm run build`
3. ✅ Deploys to production
4. ✅ Your site is updated automatically

**No manual steps needed!**

---

## 📝 Quick Reference

### Push Changes (Auto-Deploys)
```bash
git add .
git commit -m "Your changes"
git push origin main
# Vercel automatically deploys!
```

### Check Deployment Status
- Visit: Vercel Dashboard → Deployments
- See build logs, deployment status, and URL

### Redeploy Manually
- Vercel Dashboard → Deployments → [Any deployment] → "Redeploy"

---

## 🆘 Need Help?

- **Detailed Guide:** See `VERCEL_GIT_INTEGRATION_SETUP.md`
- **Quick Reference:** See `QUICK_DEPLOY.md`
- **Troubleshooting:** See `DEPLOYMENT_CHECKLIST.md`

---

**Status:** ✅ Ready to Connect to GitHub  
**Next:** Create GitHub repository and push code

