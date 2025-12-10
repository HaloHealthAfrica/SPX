# 🔐 Complete Environment Variables List

## Required for Deployment

### 1. Database (REQUIRED) ⚠️

```
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require
```

**Description:** PostgreSQL connection string  
**Required:** YES  
**How to get:**
- Vercel Postgres: Storage → Postgres → .env.local → Copy `POSTGRES_URL`
- External: Get from your PostgreSQL provider (Supabase, Neon, Railway, etc.)
- Format: Must include `?sslmode=require` for production

---

## Market Data Providers (At Least One Required) ⚠️

### Option 1: Alpaca (Recommended for General Data)

```
ALPACA_API_KEY=your_alpaca_api_key
ALPACA_SECRET_KEY=your_alpaca_secret_key
ALPACA_BASE_URL=https://paper-api.alpaca.markets
```

**Description:** Alpaca API credentials  
**Required:** NO (but recommended)  
**Used for:**
- Real-time stock/index prices
- Historical OHLCV data
- VIX data
- Paper trading execution

**Get from:** [alpaca.markets](https://alpaca.markets)  
**Priority:** Highest for general price data

---

### Option 2: Tradier (Recommended for Options)

```
TRADIER_API_KEY=your_tradier_api_key
TRADIER_BASE_URL=https://api.tradier.com/v1
```

**Description:** Tradier API key  
**Required:** NO (but recommended for options)  
**Used for:**
- Options chains (with full Greeks)
- Options expirations
- IV Rank calculation
- IV Percentile
- Real-time prices
- VIX data

**Get from:** [tradier.com](https://tradier.com)  
**Priority:** Highest for options data

---

### Option 3: TwelveData (Recommended for Historical)

```
TWELVEDATA_API_KEY=your_twelvedata_api_key
```

**Description:** TwelveData API key  
**Required:** NO (but recommended for historical)  
**Used for:**
- Historical OHLCV data
- Real-time prices
- VIX data (primary source)
- Multiple timeframes

**Get from:** [twelvedata.com](https://twelvedata.com)  
**Priority:** Highest for historical data

---

### Option 4: MarketData.app (Optional - Advanced Features)

```
MARKETDATA_API_KEY=your_marketdata_api_key
```

**Description:** MarketData.app API key  
**Required:** NO (optional)  
**Used for:**
- Options flow (unusual activity detection)
- Market breadth indicators
- Enhanced options chains
- Real-time prices
- VIX data

**Get from:** [marketdata.app](https://marketdata.app)  
**Priority:** Optional enhancement

---

## Optional Variables

### Redis (If Using Bull Queue)

```
REDIS_URL=redis://default:password@host:port
```

**Description:** Redis connection for Bull queue  
**Required:** NO (only if using job queue)  
**Note:** Vercel doesn't support persistent Redis. Consider:
- Upstash Redis (serverless Redis)
- Or use Vercel Cron instead of Bull queue

**Get from:** [upstash.com](https://upstash.com) or your Redis provider

---

### Security (Optional)

```
WEBHOOK_SECRET=your_webhook_secret
```

**Description:** Secret for validating TradingView webhooks  
**Required:** NO  
**Used for:** Webhook security validation

```
API_KEY=your_api_key
```

**Description:** API key for protected routes  
**Required:** NO  
**Used for:** API authentication (if implemented)

---

### Application (Auto-Set by Vercel)

```
NODE_ENV=production
```

**Description:** Node environment  
**Default:** `production` on Vercel  
**Note:** Auto-set by Vercel, don't need to set manually

```
VERCEL=1
VERCEL_ENV=production
VERCEL_URL=your-app.vercel.app
```

**Description:** Vercel environment variables  
**Note:** Auto-set by Vercel, don't set manually

---

## 📊 Priority Summary

### P0 - Critical (Must Have)
- ✅ `DATABASE_URL` - **REQUIRED**

### P1 - High Priority (At Least One)
- ✅ `ALPACA_API_KEY` + `ALPACA_SECRET_KEY` (recommended)
- OR `TRADIER_API_KEY` (for options)
- OR `TWELVEDATA_API_KEY` (for historical)

### P2 - Recommended (Enhancements)
- `TRADIER_API_KEY` - If using options (best with Alpaca)
- `TWELVEDATA_API_KEY` - If using historical data (best with Alpaca)
- `MARKETDATA_API_KEY` - For options flow and market breadth

### P3 - Optional
- `REDIS_URL` - Only if using Bull queue
- `WEBHOOK_SECRET` - For webhook security
- `API_KEY` - For API authentication

---

## 🎯 Recommended Configuration

### Minimum (Basic Functionality)
```env
DATABASE_URL=postgresql://...
ALPACA_API_KEY=your_key
ALPACA_SECRET_KEY=your_secret
```

### Recommended (Full Features)
```env
DATABASE_URL=postgresql://...
ALPACA_API_KEY=your_key
ALPACA_SECRET_KEY=your_secret
TRADIER_API_KEY=your_key
TWELVEDATA_API_KEY=your_key
```

### Optimal (All Features)
```env
DATABASE_URL=postgresql://...
ALPACA_API_KEY=your_key
ALPACA_SECRET_KEY=your_secret
TRADIER_API_KEY=your_key
TWELVEDATA_API_KEY=your_key
MARKETDATA_API_KEY=your_key
REDIS_URL=redis://... (if using Bull)
```

---

## 📝 Setting in Vercel

### Step-by-Step

1. **Go to:** Vercel Dashboard → Your Project → Settings → Environment Variables

2. **For Each Variable:**
   - Click "Add New"
   - Enter Name (exactly as shown above)
   - Enter Value
   - Select Environments:
     - ✅ Production
     - ✅ Preview
     - ✅ Development
   - Click "Save"

3. **After Adding Variables:**
   - Go to Deployments tab
   - Click "Redeploy" on latest deployment
   - Or push a new commit to trigger auto-deploy

---

## 🔍 Where Each Variable is Used

### DATABASE_URL
- `lib/db.ts` - Database connection
- All API routes that use database

### ALPACA_API_KEY / ALPACA_SECRET_KEY
- `lib/market-data/index.ts` - AlpacaProvider
- Used for: Prices, OHLCV, VIX

### TRADIER_API_KEY
- `lib/market-data/index.ts` - TradierProvider
- Used for: Options chains, IV Rank, IV Percentile, Expirations

### TWELVEDATA_API_KEY
- `lib/market-data/index.ts` - TwelveDataProvider
- Used for: Historical OHLCV, VIX (primary)

### MARKETDATA_API_KEY
- `lib/market-data/index.ts` - MarketDataAppProvider
- Used for: Options flow, Market breadth, Options chains

### REDIS_URL
- `lib/services/auto-trade.orchestrator.ts` - Bull queue (if used)
- Note: May need to use Vercel Cron instead

---

## ✅ Quick Checklist

**Minimum Required:**
- [ ] `DATABASE_URL`
- [ ] At least one market data API key

**Recommended:**
- [ ] `ALPACA_API_KEY` + `ALPACA_SECRET_KEY`
- [ ] `TRADIER_API_KEY` (if trading options)

**Optional:**
- [ ] `TWELVEDATA_API_KEY` (for better historical data)
- [ ] `MARKETDATA_API_KEY` (for options flow)
- [ ] `REDIS_URL` (if using Bull queue)

---

## 🆘 Where to Get API Keys

### Alpaca
- **Website:** [alpaca.markets](https://alpaca.markets)
- **Sign up:** Free paper trading account
- **Get keys:** Dashboard → API Keys

### Tradier
- **Website:** [tradier.com](https://tradier.com)
- **Sign up:** Free sandbox account available
- **Get keys:** Developer → API Access

### TwelveData
- **Website:** [twelvedata.com](https://twelvedata.com)
- **Sign up:** Free tier available
- **Get keys:** Dashboard → API Keys

### MarketData.app
- **Website:** [marketdata.app](https://marketdata.app)
- **Sign up:** Check pricing
- **Get keys:** Dashboard → API Keys

---

## 📋 Copy-Paste Template

Use this template in Vercel:

```
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require
ALPACA_API_KEY=your_key_here
ALPACA_SECRET_KEY=your_secret_here
TRADIER_API_KEY=your_key_here
TWELVEDATA_API_KEY=your_key_here
MARKETDATA_API_KEY=your_key_here
```

**Replace values with your actual keys!**

---

**Status:** ✅ Complete List  
**Last Updated:** $(date)

