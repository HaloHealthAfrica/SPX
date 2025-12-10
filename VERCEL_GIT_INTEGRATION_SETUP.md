# Vercel Git Integration - Step-by-Step Setup

## 🚀 Option 1: Fully Automated Deployment

This guide walks you through setting up Vercel Git Integration for automatic deployments.

---

## ✅ Prerequisites Check

Before starting, ensure:
- [x] Code is in a Git repository
- [x] Repository is pushed to GitHub/GitLab/Bitbucket
- [x] You have a Vercel account (free tier works)

---

## 📋 Step-by-Step Setup

### Step 1: Prepare Your Repository

**Check current status:**
```bash
git status
git remote -v
```

**If not pushed to GitHub yet:**
```bash
# Add all files
git add .

# Commit
git commit -m "Prepare for Vercel deployment"

# Push to GitHub (if not already)
git push origin main
```

---

### Step 2: Sign In to Vercel

1. **Go to Vercel**
   - Visit [vercel.com](https://vercel.com)
   - Click **"Sign Up"** or **"Log In"**

2. **Choose Sign-In Method**
   - **Recommended:** Sign in with GitHub
   - This allows Vercel to access your repositories
   - Grants necessary permissions for auto-deployment

---

### Step 3: Import Your Project

1. **Go to Dashboard**
   - After signing in, you'll see the Vercel dashboard
   - Click **"Add New..."** → **"Project"**

2. **Import Repository**
   - You'll see a list of your GitHub repositories
   - **Find:** `SPX` or your repository name
   - **Click:** "Import" button

3. **If Repository Not Listed**
   - Click **"Adjust GitHub App Permissions"**
   - Grant access to your repository
   - Refresh the page
   - Repository should now appear

---

### Step 4: Configure Project

Vercel will auto-detect Next.js, but verify these settings:

**Framework Preset:** Next.js ✅ (auto-detected)

**Root Directory:** `./` ✅ (default)

**Build Command:** `npm run build` ✅ (default)

**Output Directory:** `.next` ✅ (default)

**Install Command:** `npm install` ✅ (default)

**Click:** "Deploy" button

---

### Step 5: Set Environment Variables

**⚠️ IMPORTANT:** Do this BEFORE the first deployment completes, or redeploy after.

1. **Go to Project Settings**
   - Click on your project name
   - Go to **Settings** tab
   - Click **Environment Variables**

2. **Add Required Variables**

   **Database (Required):**
   ```
   DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require
   ```

   **Market Data (At least one required):**
   ```
   ALPACA_API_KEY=your_key
   ALPACA_SECRET_KEY=your_secret
   ```
   
   OR
   ```
   TRADIER_API_KEY=your_key
   ```
   
   OR
   ```
   TWELVEDATA_API_KEY=your_key
   ```

3. **Set for All Environments**
   - Check: ✅ Production
   - Check: ✅ Preview
   - Check: ✅ Development

4. **Click:** "Save" for each variable

**See `.env.example` for complete list**

---

### Step 6: Wait for Deployment

1. **Monitor Build**
   - Watch the build logs in real-time
   - Check for any errors
   - Build typically takes 2-5 minutes

2. **First Deployment**
   - May take longer (installing dependencies)
   - Subsequent deployments are faster

3. **Deployment Complete**
   - You'll see a success message
   - Note your deployment URL: `https://your-project.vercel.app`

---

### Step 7: Post-Deployment Setup

#### 7.1: Run Database Migrations

**Option A: Via Vercel CLI (Recommended)**
```bash
# Install Vercel CLI (if not already)
npm install -g vercel

# Login
vercel login

# Pull environment variables
vercel env pull .env.local

# Run migrations
npm run db:migrate
```

**Option B: Via Temporary API Route**

Create `app/api/db/migrate/route.ts`:
```typescript
import { migrate } from '@/scripts/migrate';

export async function GET() {
  try {
    await migrate();
    return Response.json({ success: true, message: 'Migrations completed' });
  } catch (error: any) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
```

Then visit: `https://your-project.vercel.app/api/db/migrate`

**⚠️ Delete this route after migration!**

#### 7.2: Verify Deployment

1. **Health Check**
   - Visit: `https://your-project.vercel.app/api/health`
   - Should return: `{ "status": "ok", "database": "connected" }`

2. **Test Endpoints**
   - `/api/signals/list` - Should return signals
   - `/api/paper/list` - Should return paper trades
   - `/api/decisions` - Should return decisions

3. **Check Logs**
   - Vercel Dashboard → Deployments → [Latest] → Functions
   - Look for any errors

---

## 🔄 How Auto-Deployment Works

### Automatic Triggers

**Production Deployment:**
- Triggered by: Push to `main` or `master` branch
- Environment: Production
- URL: `https://your-project.vercel.app`

**Preview Deployment:**
- Triggered by: Pull requests
- Environment: Preview
- URL: `https://your-project-git-branch-username.vercel.app`

**Manual Redeploy:**
- Go to Deployments tab
- Click "Redeploy" on any deployment
- Useful for redeploying with new environment variables

---

## 📊 Deployment Flow

```
┌─────────────────┐
│  Push to Git    │
│  (main branch)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Vercel Detects │
│  Push Event     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Runs Build     │
│  npm run build  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Deploys to     │
│  Production     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Live at        │
│  *.vercel.app   │
└─────────────────┘
```

---

## ✅ Verification Checklist

After setup, verify:

- [ ] Repository connected to Vercel
- [ ] Environment variables set
- [ ] First deployment successful
- [ ] Database migrations run
- [ ] `/api/health` returns success
- [ ] API endpoints working
- [ ] Auto-deploy working (push to test)

---

## 🧪 Test Auto-Deployment

To verify auto-deployment works:

1. **Make a small change**
   ```bash
   echo "# Test" >> README.md
   git add README.md
   git commit -m "Test auto-deploy"
   git push origin main
   ```

2. **Watch Vercel Dashboard**
   - Go to your project
   - Watch "Deployments" tab
   - New deployment should appear automatically
   - Should complete in 2-5 minutes

3. **Verify Changes**
   - Visit your deployment URL
   - Changes should be live

---

## 🔧 Configuration Details

### Build Settings (Auto-Configured)

- **Framework:** Next.js 14
- **Node Version:** 20.x (auto-detected)
- **Build Command:** `npm run build`
- **Output Directory:** `.next`
- **Install Command:** `npm install`

### Function Configuration

Configured in `vercel.json`:
- **Default Timeout:** 30 seconds
- **Decision Engine:** 60 seconds
- **Webhook Handler:** 30 seconds

### Cron Jobs

Configured in `vercel.json`:
- **Monitor:** Every 5 minutes
- **Note:** Requires Vercel Pro plan

---

## 🎯 Next Steps After Setup

1. **Set Up Database**
   - Provision Vercel Postgres or external PostgreSQL
   - Get connection string
   - Add to environment variables

2. **Configure API Keys**
   - Get market data API keys
   - Add to Vercel environment variables
   - Redeploy to apply

3. **Custom Domain (Optional)**
   - Go to Project Settings → Domains
   - Add your domain
   - Follow DNS instructions

4. **Monitor Deployments**
   - Check Vercel dashboard regularly
   - Monitor function logs
   - Set up error tracking (optional)

---

## 🆘 Troubleshooting

### Repository Not Showing

**Issue:** Can't find repository in Vercel
- **Fix:** Check GitHub App permissions
- Go to GitHub → Settings → Applications → Vercel
- Grant access to repository
- Refresh Vercel dashboard

### Build Fails

**Issue:** Build fails in Vercel
- **Fix:** Check build logs
- Run `npm run build` locally first
- Fix any errors
- Push again

### Environment Variables Not Loading

**Issue:** Variables not available in functions
- **Fix:** 
  - Verify variables set in dashboard
  - Check environment (Production vs Preview)
  - Redeploy after adding variables

### Database Connection Fails

**Issue:** Can't connect to database
- **Fix:**
  - Verify `DATABASE_URL` is correct
  - Check SSL mode (`?sslmode=require`)
  - Verify database allows connections
  - Check function logs for errors

---

## 📚 Additional Resources

- **Vercel Docs:** [vercel.com/docs](https://vercel.com/docs)
- **Next.js on Vercel:** [vercel.com/docs/frameworks/nextjs](https://vercel.com/docs/frameworks/nextjs)
- **Environment Variables:** [vercel.com/docs/concepts/projects/environment-variables](https://vercel.com/docs/concepts/projects/environment-variables)

---

## 🎉 Success!

Once set up, every push to your main branch will automatically:
1. ✅ Trigger a build
2. ✅ Run tests (if configured)
3. ✅ Deploy to production
4. ✅ Update your live site

**No manual steps needed!**

---

**Status:** ✅ Ready for Setup  
**Last Updated:** $(date)

