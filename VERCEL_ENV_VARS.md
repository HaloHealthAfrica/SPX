# Vercel Environment Variables

## Required Environment Variables

These must be set in your Vercel project settings before deployment.

### Database
```env
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require
```
**Required:** Yes  
**Description:** PostgreSQL connection string. Use Vercel Postgres or external provider.  
**Vercel Postgres:** Automatically provided if using Vercel Postgres addon.

---

### Market Data Providers (At least one required)

#### Alpaca
```env
ALPACA_API_KEY=your_alpaca_api_key
ALPACA_SECRET_KEY=your_alpaca_secret_key
ALPACA_BASE_URL=https://paper-api.alpaca.markets
```
**Required:** No (but recommended for price data)  
**Description:** Alpaca API credentials for market data.

#### Tradier
```env
TRADIER_API_KEY=your_tradier_api_key
TRADIER_BASE_URL=https://api.tradier.com/v1
```
**Required:** No (but recommended for options data)  
**Description:** Tradier API key for options chains and Greeks.

#### TwelveData
```env
TWELVEDATA_API_KEY=your_twelvedata_api_key
```
**Required:** No (but recommended for historical data)  
**Description:** TwelveData API key for historical OHLCV data.

#### MarketData.app
```env
MARKETDATA_API_KEY=your_marketdata_api_key
```
**Required:** No (optional for options flow)  
**Description:** MarketData.app API key for options flow and market breadth.

---

## Optional Environment Variables

### Application
```env
NODE_ENV=production
```
**Default:** `production` on Vercel  
**Description:** Node environment.

### Redis (if using Bull queue)
```env
REDIS_URL=redis://default:password@host:port
REDIS_HOST=your_redis_host
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
```
**Required:** No (only if using Bull queue for job processing)  
**Description:** Redis connection for Bull queue.  
**Note:** Vercel doesn't support persistent Redis connections. Consider Upstash Redis or similar serverless Redis.

---

## Setting Environment Variables in Vercel

### Via Vercel Dashboard:
1. Go to your project in Vercel
2. Navigate to **Settings** → **Environment Variables**
3. Add each variable with appropriate values
4. Select environment (Production, Preview, Development)
5. Click **Save**

### Via Vercel CLI:
```bash
vercel env add DATABASE_URL production
vercel env add ALPACA_API_KEY production
vercel env add ALPACA_SECRET_KEY production
# ... etc
```

### Via Vercel API:
```bash
curl -X POST "https://api.vercel.com/v10/projects/{project-id}/env" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "key": "DATABASE_URL",
    "value": "postgresql://...",
    "type": "encrypted",
    "target": ["production"]
  }'
```

---

## Environment-Specific Variables

### Production
- All required variables
- Use production API endpoints
- SSL enabled for database

### Preview (Pull Requests)
- Same as production
- May use test/staging API keys

### Development
- Local development variables
- Not typically used on Vercel

---

## Security Notes

1. **Never commit `.env` files** - Already in `.gitignore`
2. **Use Vercel's encrypted storage** - All env vars are encrypted
3. **Rotate keys regularly** - Especially API keys
4. **Use different keys per environment** - Production vs Preview
5. **Limit access** - Only team members who need access

---

## Verification

After setting environment variables, verify they're loaded:

```bash
# Check in Vercel dashboard
# Or use API route to verify (remove after testing)
# GET /api/health
```

---

## Troubleshooting

### Database Connection Issues
- Ensure `DATABASE_URL` includes `?sslmode=require`
- Check database allows Vercel IPs
- Verify connection string format

### API Key Issues
- Verify keys are correct
- Check API rate limits
- Ensure keys are for correct environment (paper vs live)

### Missing Variables
- Check Vercel dashboard for typos
- Ensure variables are set for correct environment
- Redeploy after adding variables

---

**Last Updated:** $(date)

