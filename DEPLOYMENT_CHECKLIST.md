# Vercel Deployment Checklist

## ✅ Pre-Deployment

### Code Preparation
- [ ] All code committed to git
- [ ] Build passes locally (`npm run build`)
- [ ] No TypeScript errors
- [ ] No linting errors
- [ ] Tests pass (if applicable)

### Configuration Files
- [ ] `vercel.json` configured
- [ ] `next.config.js` configured
- [ ] `.vercelignore` created
- [ ] `.env.example` created

### Database
- [ ] PostgreSQL database provisioned (Vercel Postgres or external)
- [ ] Connection string ready
- [ ] SSL enabled
- [ ] Database migrations ready

### Environment Variables
- [ ] `DATABASE_URL` ready
- [ ] At least one market data API key configured:
  - [ ] `ALPACA_API_KEY` + `ALPACA_SECRET_KEY` (recommended)
  - [ ] OR `TRADIER_API_KEY` (for options)
  - [ ] OR `TWELVEDATA_API_KEY` (for historical)
  - [ ] OR `MARKETDATA_API_KEY` (for options flow)
- [ ] `REDIS_URL` (if using Bull queue)
- [ ] `NODE_ENV=production`

---

## 🚀 Deployment Steps

### Step 1: Connect Repository
- [ ] Sign in to [vercel.com](https://vercel.com)
- [ ] Click "Add New Project"
- [ ] Import from GitHub/GitLab/Bitbucket
- [ ] Select repository
- [ ] Framework auto-detected as Next.js

### Step 2: Configure Project
- [ ] Framework: Next.js (auto-detected)
- [ ] Root Directory: `./` (default)
- [ ] Build Command: `npm run build` (default)
- [ ] Output Directory: `.next` (default)
- [ ] Install Command: `npm install` (default)

### Step 3: Set Environment Variables
- [ ] Go to Project Settings → Environment Variables
- [ ] Add `DATABASE_URL`
- [ ] Add market data API keys
- [ ] Add `REDIS_URL` (if needed)
- [ ] Set for all environments (Production, Preview, Development)

### Step 4: Deploy
- [ ] Click "Deploy"
- [ ] Monitor build logs
- [ ] Wait for deployment to complete
- [ ] Note deployment URL

### Step 5: Post-Deployment
- [ ] Run database migrations
  ```bash
  vercel env pull .env.local
  npm run db:migrate
  ```
- [ ] Test `/api/health` endpoint
- [ ] Verify environment variables loaded
- [ ] Check function logs for errors

---

## 🔍 Verification

### Health Check
- [ ] Visit `https://your-app.vercel.app/api/health`
- [ ] Should return `{ "status": "ok", "database": "connected" }`

### API Endpoints
- [ ] `/api/health` - Health check
- [ ] `/api/webhook/tradingview` - Webhook endpoint
- [ ] `/api/decision/process` - Decision engine
- [ ] `/api/paper/list` - Paper trades list
- [ ] `/api/signals/list` - Signals list

### Database
- [ ] Database connection working
- [ ] Tables created (check via migration)
- [ ] Can insert/read data

### Market Data
- [ ] Market data provider connected
- [ ] Can fetch prices
- [ ] Can fetch options chains (if using Tradier)
- [ ] Can fetch historical data (if using TwelveData)

---

## ⚠️ Common Issues

### Build Failures
- [ ] Check build logs in Vercel dashboard
- [ ] Verify all dependencies in `package.json`
- [ ] Check TypeScript errors
- [ ] Verify `next.config.js` is valid

### Runtime Errors
- [ ] Check function logs
- [ ] Verify environment variables set
- [ ] Check database connection
- [ ] Verify API keys are valid

### Database Connection
- [ ] Verify `DATABASE_URL` is correct
- [ ] Check SSL mode (`?sslmode=require`)
- [ ] Verify database allows connections
- [ ] Check connection pool settings

### Function Timeouts
- [ ] Check function duration in logs
- [ ] Increase `maxDuration` in `vercel.json` if needed
- [ ] Optimize slow queries
- [ ] Break into smaller functions

---

## 📊 Post-Deployment Monitoring

### Vercel Dashboard
- [ ] Monitor deployment status
- [ ] Check function logs
- [ ] Monitor function invocations
- [ ] Check error rates

### Application Monitoring
- [ ] Set up error tracking (optional)
- [ ] Monitor API response times
- [ ] Check database connection pool usage
- [ ] Monitor market data API usage

### Cron Jobs
- [ ] Verify cron jobs running (if Pro plan)
- [ ] Check `/api/cron/monitor` logs
- [ ] Verify schedule is correct

---

## 🔄 Updates & Maintenance

### Updating Deployment
1. [ ] Make changes locally
2. [ ] Test locally (`npm run dev`)
3. [ ] Build locally (`npm run build`)
4. [ ] Commit and push to git
5. [ ] Vercel auto-deploys
6. [ ] Monitor deployment in dashboard

### Environment Variables
- [ ] Update in Vercel dashboard
- [ ] Redeploy after changes
- [ ] Verify new values loaded

### Database Migrations
- [ ] Create migration script
- [ ] Run via Vercel CLI or API route
- [ ] Verify tables updated
- [ ] Test application

---

## 🎯 Production Readiness

### Security
- [ ] Environment variables secured
- [ ] API keys not exposed
- [ ] Database credentials secure
- [ ] HTTPS enabled (automatic on Vercel)

### Performance
- [ ] Function timeouts appropriate
- [ ] Database connection pooling optimized
- [ ] API responses optimized
- [ ] Caching implemented where possible

### Reliability
- [ ] Error handling in place
- [ ] Fallback mechanisms working
- [ ] Database connection retry logic
- [ ] Market data provider fallbacks

### Monitoring
- [ ] Health check endpoint working
- [ ] Error logging configured
- [ ] Function logs accessible
- [ ] Database monitoring set up

---

## 📝 Quick Reference

### Vercel CLI Commands
```bash
# Install CLI
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

### Important URLs
- **Vercel Dashboard:** https://vercel.com/dashboard
- **Project Settings:** https://vercel.com/[team]/[project]/settings
- **Environment Variables:** Project Settings → Environment Variables
- **Deployments:** https://vercel.com/[team]/[project]/deployments
- **Function Logs:** Project → Deployments → [deployment] → Functions

---

**Status:** ✅ Ready for Deployment  
**Last Updated:** $(date)
