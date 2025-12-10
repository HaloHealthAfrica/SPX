# 🔐 Vercel Environment Variables - Quick Setup

## ⚠️ CRITICAL: Set These Before First Deployment

Go to: **Vercel Dashboard → Your Project → Settings → Environment Variables**

---

## Required Variables

### 1. Database (REQUIRED)
```
Name: DATABASE_URL
Value: [Get from Vercel Postgres or external provider]
Environments: ✅ Production, ✅ Preview, ✅ Development
```

**How to get:**
- **Vercel Postgres:** Storage → Postgres → .env.local → Copy `POSTGRES_URL`
- **External:** `postgresql://user:password@host:5432/database?sslmode=require`

---

### 2. Market Data (At Least One Required)

**Option A: Alpaca (Recommended)**
```
ALPACA_API_KEY=your_key
ALPACA_SECRET_KEY=your_secret
```

**Option B: Tradier (For Options)**
```
TRADIER_API_KEY=your_key
```

**Option C: TwelveData (For Historical)**
```
TWELVEDATA_API_KEY=your_key
```

**Set for:** ✅ Production, ✅ Preview, ✅ Development

---

## Optional Variables

```
REDIS_URL=redis://... (if using Bull queue)
WEBHOOK_SECRET=your_secret (for webhook security)
API_KEY=your_key (for API authentication)
```

---

## ⚠️ Important

1. **Set variables BEFORE deploying** (or redeploy after)
2. **Set for all environments** (Production, Preview, Development)
3. **Redeploy** after adding variables
4. **Verify** variables loaded in function logs

---

## ✅ After Setting Variables

1. **Redeploy** (if already deployed)
2. **Set up database** (Vercel Postgres or external)
3. **Run migrations** (`npm run db:migrate`)
4. **Test** `/api/health` endpoint

---

**Quick Reference:** See `.env.example` for complete list

