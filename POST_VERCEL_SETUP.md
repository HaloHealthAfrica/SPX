# ✅ Post-Vercel Connection Setup

## 🎉 Vercel Connected!

Your repository is now connected to Vercel. Let's complete the setup.

---

## 📋 Next Steps Checklist

### Step 1: Set Environment Variables ⚠️ CRITICAL

**Go to:** Vercel Dashboard → Your Project → Settings → Environment Variables

**Add these variables:**

#### Database (Required)
```
Name: DATABASE_URL
Value: [Your PostgreSQL connection string]
Environments: ✅ Production, ✅ Preview, ✅ Development
```

**Get Database URL:**
- **Option A:** Use Vercel Postgres (easiest)
  - Go to: Project → Storage → Create Database → Postgres
  - Copy `POSTGRES_URL` from .env.local tab
  
- **Option B:** External PostgreSQL
  - Supabase, Neon, Railway, etc.
  - Connection string format: `postgresql://user:password@host:5432/database?sslmode=require`

#### Market Data (At Least One Required)

**Option 1: Alpaca (Recommended)**
```
Name: ALPACA_API_KEY
Value: [Your Alpaca API key]
Environments: ✅ Production, ✅ Preview, ✅ Development

Name: ALPACA_SECRET_KEY
Value: [Your Alpaca secret key]
Environments: ✅ Production, ✅ Preview, ✅ Development
```

**Option 2: Tradier (For Options)**
```
Name: TRADIER_API_KEY
Value: [Your Tradier API key]
Environments: ✅ Production, ✅ Preview, ✅ Development
```

**Option 3: TwelveData (For Historical)**
```
Name: TWELVEDATA_API_KEY
Value: [Your TwelveData API key]
Environments: ✅ Production, ✅ Preview, ✅ Development
```

**Option 4: MarketData.app (Optional)**
```
Name: MARKETDATA_API_KEY
Value: [Your MarketData.app API key]
Environments: ✅ Production, ✅ Preview, ✅ Development
```

#### Optional Variables
```
Name: REDIS_URL
Value: [If using Bull queue - consider Upstash Redis]
Environments: ✅ Production, ✅ Preview, ✅ Development
```

**⚠️ After adding variables, redeploy!**

---

### Step 2: Set Up Database

#### Option A: Vercel Postgres (Recommended)

1. **Go to:** Your project in Vercel
2. **Click:** "Storage" tab
3. **Click:** "Create Database"
4. **Select:** "Postgres"
5. **Choose:** Plan (Hobby is free for development)
6. **Click:** "Create"

7. **Get Connection String:**
   - Go to: Storage → Postgres → ".env.local" tab
   - Copy `POSTGRES_URL` or `DATABASE_URL`
   - Update `DATABASE_URL` environment variable in Vercel

8. **Redeploy** after updating DATABASE_URL

#### Option B: External PostgreSQL

1. **Provision Database:**
   - Supabase: [supabase.com](https://supabase.com)
   - Neon: [neon.tech](https://neon.tech)
   - Railway: [railway.app](https://railway.app)
   - Or any PostgreSQL provider

2. **Get Connection String:**
   - Format: `postgresql://user:password@host:5432/database?sslmode=require`
   - Ensure SSL is enabled

3. **Add to Vercel:**
   - Project Settings → Environment Variables
   - Add `DATABASE_URL` with your connection string

---

### Step 3: Run Database Migrations

**Option A: Via Vercel CLI (Recommended)**

```powershell
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

1. **Create:** `app/api/db/migrate/route.ts`
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

2. **Visit:** `https://your-project.vercel.app/api/db/migrate`

3. **⚠️ Delete this route after migration!**

---

### Step 4: Verify Deployment

1. **Check Deployment Status**
   - Go to: Vercel Dashboard → Deployments
   - Latest deployment should show "Ready" ✅

2. **Test Health Endpoint**
   - Visit: `https://your-project.vercel.app/api/health`
   - Should return: `{ "status": "ok", "database": "connected" }`

3. **Test Other Endpoints**
   - `/api/signals/list` - Should return signals
   - `/api/paper/list` - Should return paper trades
   - `/api/decisions` - Should return decisions

4. **Check Function Logs**
   - Vercel Dashboard → Deployments → [Latest] → Functions
   - Look for any errors
   - Verify environment variables loaded

---

### Step 5: Test Auto-Deployment

1. **Make a small change:**
   ```powershell
   echo "# Test" >> README.md
   git add README.md
   git commit -m "Test auto-deploy"
   git push origin main
   ```

2. **Watch Vercel Dashboard:**
   - New deployment should appear automatically
   - Should complete in 1-2 minutes
   - Changes should be live

---

## ✅ Verification Checklist

- [ ] Environment variables set in Vercel
- [ ] Database provisioned (Vercel Postgres or external)
- [ ] DATABASE_URL environment variable updated
- [ ] Redeployed after adding variables
- [ ] Database migrations run
- [ ] `/api/health` returns success
- [ ] Other API endpoints working
- [ ] Auto-deployment tested (push to git)

---

## 🎯 Your Deployment URL

After deployment, your site is live at:
- **Production:** `https://spx-fusion-trading-system.vercel.app` (or your custom name)
- **Preview:** `https://spx-fusion-trading-system-git-branch-username.vercel.app`

---

## 🆘 Troubleshooting

### Deployment Failed

**Check:**
- Build logs in Vercel dashboard
- TypeScript errors
- Missing dependencies
- Environment variables set correctly

### Database Connection Fails

**Check:**
- `DATABASE_URL` is set correctly
- SSL mode included (`?sslmode=require`)
- Database allows connections
- Connection string format is correct

### Environment Variables Not Loading

**Fix:**
- Verify variables set in Vercel dashboard
- Check environment (Production vs Preview)
- Redeploy after adding variables

### API Endpoints Return Errors

**Check:**
- Function logs in Vercel dashboard
- Database connection working
- Market data API keys valid
- Error messages in logs

---

## 📊 Monitoring

### Vercel Dashboard
- **Deployments:** View all deployments
- **Functions:** Check function logs
- **Analytics:** View performance metrics
- **Settings:** Manage project settings

### Health Monitoring
- Set up monitoring for `/api/health`
- Check regularly for errors
- Monitor function execution times

---

## 🎉 Success!

Once everything is set up:
- ✅ Code auto-deploys on every push
- ✅ Database connected and migrated
- ✅ API endpoints working
- ✅ Market data providers connected
- ✅ System fully operational

---

**Status:** ✅ Vercel Connected  
**Next:** Set environment variables and deploy  
**Guide:** Follow steps above

