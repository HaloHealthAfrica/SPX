# ✅ Next Steps After Adding Environment Variables

## 🎉 Great! You've added the environment variables.

Now let's complete the deployment:

---

## 📋 Step-by-Step Checklist

### Step 1: Redeploy (If Already Deployed) ⚠️

**Important:** Environment variables only take effect on NEW deployments.

1. **Go to:** Vercel Dashboard → Your Project → Deployments
2. **Click:** "Redeploy" on the latest deployment
3. **OR:** Push a new commit to trigger auto-deploy:
   ```powershell
   git commit --allow-empty -m "Trigger redeploy with env vars"
   git push origin main
   ```

---

### Step 2: Set Up Database (If Not Done)

#### Option A: Vercel Postgres (Easiest) ✅

1. **Go to:** Vercel Dashboard → Your Project → Storage
2. **Click:** "Create Database"
3. **Select:** "Postgres"
4. **Choose:** Plan (Hobby is free)
5. **Click:** "Create"

6. **Get Connection String:**
   - Go to: Storage → Postgres → ".env.local" tab
   - Copy `POSTGRES_URL` or `DATABASE_URL`
   - **Update** `DATABASE_URL` environment variable in Vercel Settings

7. **Redeploy** after updating DATABASE_URL

#### Option B: External PostgreSQL

If you're using an external database (Supabase, Neon, Railway, etc.):
- Ensure `DATABASE_URL` is set correctly
- Format: `postgresql://user:password@host:5432/database?sslmode=require`
- Ensure SSL is enabled

---

### Step 3: Run Database Migrations

**Option A: Via Vercel CLI (Recommended)**

```powershell
# Install Vercel CLI (if not already)
npm install -g vercel

# Login
vercel login

# Pull environment variables to local
vercel env pull .env.local

# Run migrations
npm run db:migrate
```

**Option B: Via Temporary API Route**

1. **Create:** `app/api/db/migrate/route.ts`:
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

3. **⚠️ IMPORTANT:** Delete this route after migration!

---

### Step 4: Verify Deployment ✅

1. **Check Deployment Status**
   - Go to: Vercel Dashboard → Deployments
   - Latest deployment should show "Ready" ✅

2. **Test Health Endpoint**
   - Visit: `https://your-project.vercel.app/api/health`
   - Should return:
   ```json
   {
     "status": "ok",
     "database": "connected",
     "environment": "production",
     "marketData": {
       "providers": ["alpaca", "tradier"]
     }
   }
   ```

3. **Test Other Endpoints**
   - `/api/signals/list` - Should return signals (may be empty initially)
   - `/api/paper/list` - Should return paper trades (may be empty initially)
   - `/api/decisions` - Should return decisions (may be empty initially)

4. **Check Function Logs**
   - Vercel Dashboard → Deployments → [Latest] → Functions
   - Look for any errors
   - Verify environment variables loaded (should see no "undefined" errors)

---

### Step 5: Test Auto-Deployment

1. **Make a small change:**
   ```powershell
   echo "# Test deployment" >> README.md
   git add README.md
   git commit -m "Test auto-deploy"
   git push origin main
   ```

2. **Watch Vercel Dashboard:**
   - New deployment should appear automatically
   - Should complete in 1-2 minutes
   - Changes should be live

---

## ✅ Final Verification Checklist

- [ ] Environment variables set in Vercel
- [ ] Database provisioned (Vercel Postgres or external)
- [ ] `DATABASE_URL` environment variable updated
- [ ] Redeployed after adding variables
- [ ] Database migrations run
- [ ] `/api/health` returns success
- [ ] Other API endpoints working (may return empty arrays initially)
- [ ] Auto-deployment tested (push to git)

---

## 🎯 Your Deployment URL

After deployment, your site is live at:
- **Production:** `https://your-project.vercel.app`
- **Preview:** `https://your-project-git-branch-username.vercel.app`

---

## 🆘 Troubleshooting

### Environment Variables Not Loading

**Symptoms:**
- API returns errors about missing variables
- Function logs show "undefined" for env vars

**Fix:**
1. Verify variables set in Vercel dashboard
2. Check environment (Production vs Preview)
3. **Redeploy** after adding variables (they don't apply to existing deployments)

### Database Connection Fails

**Symptoms:**
- `/api/health` shows `"database": "disconnected"`
- Function logs show connection errors

**Fix:**
1. Check `DATABASE_URL` is set correctly
2. Ensure SSL mode included (`?sslmode=require`)
3. Verify database allows connections
4. Check connection string format

### Build Fails

**Symptoms:**
- Deployment shows "Build Failed"
- Error logs in Vercel dashboard

**Fix:**
1. Check build logs in Vercel dashboard
2. Look for TypeScript errors
3. Check for missing dependencies
4. Verify `package.json` is correct

---

## 🎉 Success Indicators

You're all set when:
- ✅ Deployment shows "Ready"
- ✅ `/api/health` returns success
- ✅ No errors in function logs
- ✅ Auto-deployment works (push triggers deploy)
- ✅ Database migrations completed

---

## 📊 Next: Start Using the System

Once everything is verified:

1. **Send a test webhook** from TradingView
2. **Check signals** at `/api/signals/list`
3. **View decisions** at `/api/decisions`
4. **Monitor paper trades** at `/api/paper/list`
5. **Access dashboard** at your Vercel URL

---

**Status:** ✅ Environment Variables Added  
**Next:** Redeploy and verify  
**Guide:** Follow steps above

