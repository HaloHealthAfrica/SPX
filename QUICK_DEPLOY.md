# 🚀 Quick Deploy Guide - Vercel Git Integration

## 5-Minute Setup

### Step 1: Push to GitHub (if not already)
```bash
git add .
git commit -m "Ready for Vercel deployment"
git push origin main
```

### Step 2: Connect to Vercel

1. **Visit:** [vercel.com/new](https://vercel.com/new)
2. **Sign in** with GitHub
3. **Click:** "Add New Project"
4. **Select:** Your repository
5. **Click:** "Import"

### Step 3: Configure (Auto-detected)

Vercel auto-detects Next.js. Just verify:
- ✅ Framework: Next.js
- ✅ Root Directory: `./`
- ✅ Build Command: `npm run build`

### Step 4: Add Environment Variables

**Before clicking Deploy**, go to:
- **Project Settings** → **Environment Variables**

**Add these (minimum):**
```
DATABASE_URL=your_postgres_connection_string
ALPACA_API_KEY=your_key (or TRADIER_API_KEY, etc.)
```

**Set for:** ✅ Production, ✅ Preview, ✅ Development

### Step 5: Deploy

1. **Click:** "Deploy"
2. **Wait:** 2-5 minutes
3. **Done!** Your site is live

### Step 6: Run Migrations

```bash
vercel env pull .env.local
npm run db:migrate
```

Or create temporary route: `/api/db/migrate`

---

## ✅ That's It!

Now every `git push` automatically deploys! 🎉

---

**Need Help?** See `VERCEL_GIT_INTEGRATION_SETUP.md` for detailed guide.

