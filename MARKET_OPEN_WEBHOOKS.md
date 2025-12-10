# 📈 Market Open Webhook Setup

## ✅ TradingView Webhooks Configured

You've set up TradingView webhooks to trigger when the market opens. Here's what you need to know:

---

## 🔐 Important: API Key Required

**⚠️ Your webhook endpoint requires authentication in production.**

Since you reverted the auth middleware changes, you need to set up an API key for TradingView webhooks to work.

### Option 1: Set API Key in Vercel (Recommended)

1. **Go to:** Vercel Dashboard → Your Project → Settings → Environment Variables
2. **Add:**
   ```
   Name: WEBHOOK_API_KEY
   Value: [Generate a secure random string]
   Environments: ✅ Production, ✅ Preview, ✅ Development
   ```
3. **Redeploy** after adding the variable

4. **Update TradingView Alert:**
   - Add header: `x-api-key: [your-api-key]`
   - Or add to URL: `?api_key=[your-api-key]`

### Option 2: Make Auth Optional (Alternative)

If you want webhooks to work without API keys, you can update the auth middleware to allow requests when no API key is configured.

---

## 📋 Your Webhook URL

**Base URL:**
```
https://spx-iota.vercel.app/api/webhook/tradingview
```

**With API Key (if using):**
```
https://spx-iota.vercel.app/api/webhook/tradingview?api_key=YOUR_API_KEY
```

---

## 🕐 Market Open Considerations

### Market Hours (ET)
- **Pre-Market:** 4:00 AM - 9:30 AM
- **Regular Hours:** 9:30 AM - 4:00 PM
- **After Hours:** 4:00 PM - 8:00 PM

### What Happens at Market Open

1. **TradingView Triggers Webhook** → Sends signal to your endpoint
2. **System Receives Signal** → Validates and stores in database
3. **Decision Engine Processes** → Runs through 7 gates
4. **Trade Execution** → If approved, paper trade is executed
5. **Monitoring** → System tracks position and manages exits

---

## ✅ Pre-Market Checklist

Before market opens, verify:

- [ ] **API Key Set** (if required)
- [ ] **Database Connected** - Check `/api/health`
- [ ] **Migrations Run** - Tables created
- [ ] **Webhook URL Correct** - Test with `test-webhook.ps1`
- [ ] **TradingView Alert Active** - Alert is enabled
- [ ] **Auto-Trade Enabled** (if using auto-trading)
- [ ] **Daily Limits Reset** - Check `/api/paper/list`

---

## 🧪 Test Before Market Open

### Test Webhook Now

**If API key is set:**
```powershell
$body = @{
    symbol = "SPX"
    resolution = "15m"
    timestamp = [int](Get-Date -UFormat %s)
    signal_type = "STRAT_212"
    direction = "LONG"
    confidence = 7.5
    signal_strength = 7.5
    confluence_count = 3
    entry_price = 4500.00
    stop_loss = 4450.00
    take_profit_1 = 4600.00
    active_signals = @("STRAT_212", "BOS")
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://spx-iota.vercel.app/api/webhook/tradingview?api_key=YOUR_KEY" `
    -Method Post -Body $body -ContentType "application/json"
```

**If no API key (development only):**
- Webhooks will only work in development mode
- Production requires API key

---

## 📊 Monitoring Market Open Signals

### Check Signals
```
https://spx-iota.vercel.app/api/signals/list
```

### Check Decisions
```
https://spx-iota.vercel.app/api/decisions
```

### Check Trades
```
https://spx-iota.vercel.app/api/paper/list
```

### Check Health
```
https://spx-iota.vercel.app/api/health
```

---

## 🔄 What Happens When Market Opens

### Signal Flow

1. **9:30 AM ET - Market Opens**
   - TradingView detects market open
   - Triggers webhook alert
   - Sends signal to your endpoint

2. **Webhook Receives Signal**
   - Validates JSON format
   - Checks for duplicates
   - Stores in `signals_log` table

3. **Decision Engine Processes**
   - Gate 1: Signal Integrity ✓
   - Gate 2: Session & Volatility ✓
   - Gate 3: Signal Scoring ✓
   - Gate 4: Role Assignment ✓
   - Gate 5: Mode & R:R ✓
   - Gate 6: Position Sizing ✓
   - Gate 7: Daily Limits ✓

4. **Trade Execution (if approved)**
   - Paper trade created
   - Position tracked
   - Exit rules applied

---

## ⚙️ TradingView Alert Configuration

### Recommended Settings

**Alert Name:** Market Open Signal
**Condition:** Your strategy condition
**Webhook URL:** `https://spx-iota.vercel.app/api/webhook/tradingview`
**Message Format:**
```json
{
  "symbol": "{{ticker}}",
  "resolution": "{{interval}}",
  "timestamp": {{time}},
  "signal_type": "MARKET_OPEN",
  "direction": "LONG",
  "confidence": 7.5,
  "signal_strength": 7.5,
  "confluence_count": 3,
  "entry_price": {{close}},
  "stop_loss": {{plot("Stop Loss")}},
  "take_profit_1": {{plot("Take Profit")}},
  "active_signals": ["MARKET_OPEN"]
}
```

**Frequency:** Once Per Bar Close (to avoid duplicates)

---

## 🆘 Troubleshooting

### Webhook Returns 401
- **Cause:** API key not set or incorrect
- **Fix:** Set `WEBHOOK_API_KEY` in Vercel or add to TradingView alert

### No Signals Received
- **Check:** TradingView alert is enabled
- **Check:** Webhook URL is correct
- **Check:** Vercel function logs for errors
- **Check:** Database connection is working

### Signals Not Processing
- **Check:** `/api/health` shows database connected
- **Check:** Decision endpoint is accessible
- **Check:** Function logs in Vercel dashboard

### Duplicate Signals
- **Normal:** System prevents duplicates within 60 seconds
- **If too many:** Adjust TradingView alert frequency

---

## 📈 Expected Behavior

### At Market Open (9:30 AM ET)

1. **First 5 Minutes:**
   - High volatility expected
   - System may block some signals (Gate 2: Volatility check)
   - Signals with high confidence will process

2. **After Opening Volatility:**
   - Normal signal processing
   - All gates active
   - Trades execute if approved

3. **Throughout Day:**
   - Signals processed in real-time
   - Daily limits tracked
   - Positions managed automatically

---

## ✅ Quick Verification

**Before Market Opens:**

1. Test webhook endpoint
2. Verify database connection
3. Check signal processing
4. Confirm auto-trade is enabled (if using)
5. Review daily limits

**After Market Opens:**

1. Monitor `/api/signals/list` for incoming signals
2. Check `/api/decisions` for decision results
3. Review `/api/paper/list` for executed trades
4. Watch Vercel function logs for any errors

---

**Status:** ✅ TradingView Webhooks Configured  
**Next:** Set API key (if needed) and test before market open  
**URL:** `https://spx-iota.vercel.app/api/webhook/tradingview`

