# Vercel Deployment Guide

## 🚀 Multi-Agent Deployment Workflow

This guide walks you through deploying the SPX Fusion Trading System to Vercel.

---

## Prerequisites

1. **Vercel Account** - Sign up at [vercel.com](https://vercel.com)
2. **GitHub/GitLab/Bitbucket** - Repository hosted on one of these
3. **PostgreSQL Database** - Vercel Postgres or external provider
4. **Market Data API Keys** - At least one provider configured

---

## Step 1: Prepare Repository

### 1.1 Ensure Code is Committed
```bash
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

### 1.2 Verify Files
- ✅ `vercel.json` - Vercel configuration
- ✅ `.vercelignore` - Files to exclude
- ✅ `next.config.js` - Next.js configuration
- ✅ `package.json` - Dependencies

---

## Step 2: Connect to Vercel

### Option A: Via Vercel Dashboard (Recommended)

1. **Go to Vercel Dashboard**
   - Visit [vercel.com/new](https://vercel.com/new)
   - Sign in with GitHub/GitLab/Bitbucket

2. **Import Project**
   - Click **"Add New Project"**
   - Select your repository
   - Vercel will auto-detect Next.js

3. **Configure Project**
   - **Framework Preset:** Next.js (auto-detected)
   - **Root Directory:** `./` (default)
   - **Build Command:** `npm run build` (default)
   - **Output Directory:** `.next` (default)
   - **Install Command:** `npm install` (default)

4. **Click "Deploy"**

### Option B: Via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel

# Follow prompts:
# - Set up and deploy? Yes
# - Which scope? (select your account)
# - Link to existing project? No
# - Project name? spx-fusion-trading-system
# - Directory? ./
# - Override settings? No
```

---

## Step 3: Configure Environment Variables

### 3.1 Required Variables

Go to **Project Settings** → **Environment Variables** and add:

#### Database
```env
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require
```

#### Market Data (At least one)
```env
# Alpaca (recommended)
ALPACA_API_KEY=your_key
ALPACA_SECRET_KEY=your_secret

# OR Tradier (for options)
TRADIER_API_KEY=your_key

# OR TwelveData (for historical)
TWELVEDATA_API_KEY=your_key
```

### 3.2 Set for All Environments

- ✅ Production
- ✅ Preview
- ✅ Development

See `VERCEL_ENV_VARS.md` for complete list.

---

## Step 4: Set Up Database

### Option A: Vercel Postgres (Recommended)

1. **Add Vercel Postgres**
   - Go to **Project** → **Storage** → **Create Database**
   - Select **Postgres**
   - Choose plan (Hobby plan is free)
   - Click **Create**

2. **Get Connection String**
   - Go to **Storage** → **Postgres** → **.env.local**
   - Copy `POSTGRES_URL` or `DATABASE_URL`
   - Add to environment variables

3. **Run Migrations**
   ```bash
   # Via Vercel CLI
   vercel env pull .env.local
   npm run db:migrate
   
   # Or via API route (create temporary route)
   # GET /api/db/migrate
   ```

### Option B: External PostgreSQL

1. **Use External Provider**
   - Supabase, Neon, Railway, etc.
   - Get connection string
   - Add to Vercel environment variables

2. **Ensure SSL**
   - Connection string must include `?sslmode=require`
   - Whitelist Vercel IPs if required

---

## Step 5: Deploy

### 5.1 Initial Deployment

After connecting repository and setting env vars:

1. **Trigger Deployment**
   - Push to main branch (auto-deploys)
   - Or click **"Redeploy"** in Vercel dashboard

2. **Monitor Build**
   - Watch build logs in Vercel dashboard
   - Check for errors

3. **Verify Deployment**
   - Visit your deployment URL
   - Check `/api/health` endpoint

### 5.2 Post-Deployment

1. **Run Database Migrations**
   ```bash
   # Option 1: Via Vercel CLI
   vercel env pull .env.local
   npm run db:migrate
   
   # Option 2: Via API (create temporary route)
   # GET /api/db/migrate (remove after use)
   ```

2. **Verify Environment Variables**
   - Check `/api/health` returns success
   - Verify market data connections

---

## Step 6: Configure Custom Domain (Optional)

1. **Add Domain**
   - Go to **Project Settings** → **Domains**
   - Add your domain
   - Follow DNS configuration instructions

2. **SSL Certificate**
   - Automatically provisioned by Vercel
   - HTTPS enabled by default

---

## Step 7: Set Up Cron Jobs

Cron jobs are configured in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/monitor",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

**Note:** Cron jobs require Vercel Pro plan or higher.

---

## Step 8: Monitor and Maintain

### 8.1 Monitoring

- **Vercel Dashboard** - View deployments, logs, analytics
- **Function Logs** - Check API route logs
- **Database** - Monitor connection pool usage

### 8.2 Updates

1. **Push Changes**
   ```bash
   git push origin main
   ```
   - Auto-deploys to production

2. **Preview Deployments**
   - Pull requests auto-deploy to preview
   - Test before merging

3. **Redeploy**
   - Manual redeploy from Vercel dashboard
   - Or via CLI: `vercel --prod`

---

## Troubleshooting

### Build Failures

**Issue:** Build fails with TypeScript errors
```bash
# Fix: Run locally first
npm run build
# Fix any errors, then push
```

**Issue:** Missing dependencies
```bash
# Fix: Ensure all deps in package.json
npm install
npm run build
```

### Runtime Errors

**Issue:** Database connection fails
- Check `DATABASE_URL` is set
- Verify SSL mode (`?sslmode=require`)
- Check database allows connections

**Issue:** API routes timeout
- Check function timeout in `vercel.json`
- Optimize slow queries
- Consider increasing `maxDuration`

**Issue:** Environment variables not loading
- Verify variables set in Vercel dashboard
- Check environment (Production vs Preview)
- Redeploy after adding variables

### Function Timeouts

**Issue:** Long-running API routes timeout
- Default timeout: 10s (Hobby), 60s (Pro)
- Increase in `vercel.json`:
  ```json
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 30
    }
  }
  ```

---

## Serverless Considerations

### ✅ What Works on Vercel

- ✅ Next.js API Routes
- ✅ Serverless Functions
- ✅ Static Pages
- ✅ Database Connections (with pooling)
- ✅ Environment Variables
- ✅ Cron Jobs (Pro plan)

### ⚠️ Limitations

- ⚠️ **WebSocket/Real-time** - Not natively supported
  - Consider: Vercel Serverless Functions + external WebSocket service
  - Or: Use Server-Sent Events (SSE) instead

- ⚠️ **Redis/Bull Queue** - No persistent connections
  - Consider: Upstash Redis (serverless Redis)
  - Or: Use Vercel Cron + API routes for scheduled tasks

- ⚠️ **Long-running Processes** - Function timeout limits
  - Max: 10s (Hobby), 60s (Pro), 300s (Enterprise)
  - Break into smaller functions

- ⚠️ **File System** - Read-only (except `/tmp`)
  - Use external storage (S3, etc.) for files
  - Database for persistent data

---

## Production Checklist

- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] Market data API keys set
- [ ] Custom domain configured (if needed)
- [ ] SSL certificate active
- [ ] Cron jobs configured (if using Pro plan)
- [ ] Monitoring set up
- [ ] Error tracking configured (optional)
- [ ] Backup strategy in place

---

## Quick Deploy Commands

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy to preview
vercel

# Deploy to production
vercel --prod

# Pull environment variables
vercel env pull .env.local

# View logs
vercel logs

# List deployments
vercel ls
```

---

## Support

- **Vercel Docs:** [vercel.com/docs](https://vercel.com/docs)
- **Vercel Discord:** [vercel.com/discord](https://vercel.com/discord)
- **Project Issues:** Check GitHub issues

---

**Status:** ✅ Ready for Deployment  
**Last Updated:** $(date)

