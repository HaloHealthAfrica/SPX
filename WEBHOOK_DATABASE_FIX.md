# 🔧 Webhook Database Connection Fix

## ❌ Current Issue

**Problem:** Webhook endpoint returns 500 error because database is disconnected.

**Error:** `connect ECONNREFUSED 127.0.0.1:5432`

**Root Cause:** `DATABASE_URL` environment variable is not set or incorrect in Vercel.

---

## ✅ Solution Steps

### Step 1: Set DATABASE_URL in Vercel

1. **Go to Vercel Dashboard:**
   - Navigate to: Your Project → Settings → Environment Variables

2. **Add DATABASE_URL:**
   - **Name:** `DATABASE_URL`
   - **Value:** Your PostgreSQL connection string
   - **Environments:** ✅ Production, ✅ Preview, ✅ Development

3. **Connection String Format:**
   ```
   postgresql://user:password@host:5432/database?sslmode=require
   ```

4. **If using Vercel Postgres:**
   - Go to: Vercel Dashboard → Storage → Postgres
   - The `DATABASE_URL` should be automatically provided
   - Copy it and add as environment variable if not already there

### Step 2: Run Database Migrations

After setting `DATABASE_URL`, you need to create the database tables.

**Option A: Via API Endpoint (Recommended)**

1. Visit (or use curl):
   ```
   https://spx-iota.vercel.app/api/db/migrate
   ```

2. This will create all required tables:
   - `signals_log` - Stores incoming webhooks
   - `decision_audit` - Stores decision results
   - `paper_trades` - Stores executed trades
   - And all other required tables

**Option B: Via Vercel CLI**

```bash
# Pull environment variables
vercel env pull .env.local

# Run migrations
npm run db:migrate
```

### Step 3: Verify Database Connection

Test the health endpoint:
```
https://spx-iota.vercel.app/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "services": {
    "database": "connected"
  }
}
```

### Step 4: Test Webhook Again

Once database is connected, test the webhook:

```powershell
.\test-webhook-endpoint.ps1 -ApiKey "ZACBH73ByYqS6j7B4MWz87lHTuZwuLf8"
```

---

## 📋 Your TradingView Webhook URL

**Current URL (with API key):**
```
https://spx-iota.vercel.app/api/webhook/tradingview?api_key=ZACBH73ByYqS6j7B4MWz87lHTuZwuLf8
```

**Status:**
- ✅ Endpoint is accessible
- ✅ API key authentication working
- ❌ Database connection needed
- ❌ Migrations need to be run

---

## 🔍 Verification Checklist

After fixing the database:

- [ ] `DATABASE_URL` is set in Vercel
- [ ] Health endpoint shows `"database": "connected"`
- [ ] Migrations have been run
- [ ] Webhook test succeeds (200 OK)
- [ ] Signal is stored in database
- [ ] Can query signals at `/api/signals/feed`

---

## 🚨 Security Note

**⚠️ Your API key is exposed in the webhook URL!**

Consider:
1. **Rotate the API key** after fixing the database
2. **Use header authentication** instead of query parameter (more secure)
3. **Update TradingView** to use header: `x-api-key: YOUR_KEY`

---

## 📞 Next Steps

1. **Fix database connection** (Steps 1-2 above)
2. **Test webhook** with the test script
3. **Verify signals are stored** at `/api/webhook/status`
4. **Monitor TradingView alerts** for real webhooks

Once the database is connected, your webhooks will work perfectly! 🎯

