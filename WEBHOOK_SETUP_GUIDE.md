# 🔗 TradingView Webhook Setup Guide

## ✅ Your Webhook URL

**Production URL:**
```
https://spx-iota.vercel.app/api/webhook/tradingview
```

---

## 📋 Webhook Endpoint Details

### Endpoint Information
- **URL:** `https://spx-iota.vercel.app/api/webhook/tradingview`
- **Method:** `POST`
- **Content-Type:** `application/json`
- **Authentication:** Optional (API key in header if configured)
- **Rate Limit:** 100 requests per minute

### Expected Request Format

```json
{
  "symbol": "SPX",
  "resolution": "15m",
  "timestamp": 1704067200,
  "signal_type": "STRAT_212",
  "direction": "LONG",
  "confidence": 7.5,
  "signal_strength": 7.5,
  "confluence_count": 3,
  "entry_price": 4500.00,
  "stop_loss": 4450.00,
  "take_profit_1": 4600.00,
  "active_signals": ["STRAT_212", "BOS", "FVG"]
}
```

### Required Fields
- `symbol` (string) - Trading symbol (e.g., "SPX")
- `resolution` (string) - Timeframe (e.g., "15m", "1h", "1D")
- `timestamp` (number) - Unix timestamp
- `signal_type` (string) - Signal type identifier
- `direction` (string) - "LONG" or "SHORT"
- `confidence` (number) - Confidence score (0-10)
- `signal_strength` (number) - Signal strength (0-10)
- `confluence_count` (number) - Number of confirming signals
- `entry_price` (number) - Entry price
- `stop_loss` (number) - Stop loss price
- `take_profit_1` (number) - First take profit level
- `active_signals` (array) - Array of active signal types

### Optional Fields
- `take_profit_2` (number) - Second take profit level
- `take_profit_3` (number) - Third take profit level

---

## 🔧 Setting Up TradingView Webhook

### Step 1: Create TradingView Alert

1. **Open TradingView Chart**
   - Go to your SPX chart
   - Set up your indicator/strategy

2. **Create Alert**
   - Right-click on chart → "Add Alert"
   - Or click the Alert icon in toolbar

3. **Configure Alert Conditions**
   - Set your condition (e.g., when strategy fires)
   - Choose "Webhook URL" as notification method

### Step 2: Configure Webhook URL

**In TradingView Alert Settings:**

1. **Webhook URL:**
   ```
   https://spx-iota.vercel.app/api/webhook/tradingview
   ```

2. **Message Format (JSON):**
   ```json
   {
     "symbol": "{{ticker}}",
     "resolution": "{{interval}}",
     "timestamp": {{time}},
     "signal_type": "STRAT_212",
     "direction": "{{strategy.order.action}}",
     "confidence": 7.5,
     "signal_strength": 7.5,
     "confluence_count": 3,
     "entry_price": {{close}},
     "stop_loss": {{strategy.stop_loss}},
     "take_profit_1": {{strategy.take_profit}},
     "active_signals": ["STRAT_212"]
   }
   ```

### Step 3: TradingView Alert Message Template

**For LONG signals:**
```json
{
  "symbol": "{{ticker}}",
  "resolution": "{{interval}}",
  "timestamp": {{time}},
  "signal_type": "STRAT_212",
  "direction": "LONG",
  "confidence": {{plot("Confidence")}},
  "signal_strength": {{plot("Signal Strength")}},
  "confluence_count": {{plot("Confluence")}},
  "entry_price": {{close}},
  "stop_loss": {{plot("Stop Loss")}},
  "take_profit_1": {{plot("Take Profit 1")}},
  "active_signals": ["STRAT_212", "BOS"]
}
```

**For SHORT signals:**
```json
{
  "symbol": "{{ticker}}",
  "resolution": "{{interval}}",
  "timestamp": {{time}},
  "signal_type": "STRAT_212",
  "direction": "SHORT",
  "confidence": {{plot("Confidence")}},
  "signal_strength": {{plot("Signal Strength")}},
  "confluence_count": {{plot("Confluence")}},
  "entry_price": {{close}},
  "stop_loss": {{plot("Stop Loss")}},
  "take_profit_1": {{plot("Take Profit 1")}},
  "active_signals": ["STRAT_212", "BOS"]
}
```

---

## 🧪 Testing the Webhook

### Test 1: Manual Test with curl

```bash
curl -X POST https://spx-iota.vercel.app/api/webhook/tradingview \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "SPX",
    "resolution": "15m",
    "timestamp": 1704067200,
    "signal_type": "STRAT_212",
    "direction": "LONG",
    "confidence": 7.5,
    "signal_strength": 7.5,
    "confluence_count": 3,
    "entry_price": 4500.00,
    "stop_loss": 4450.00,
    "take_profit_1": 4600.00,
    "active_signals": ["STRAT_212", "BOS", "FVG"]
  }'
```

### Test 2: PowerShell Test

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
    active_signals = @("STRAT_212", "BOS", "FVG")
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://spx-iota.vercel.app/api/webhook/tradingview" `
    -Method Post `
    -Body $body `
    -ContentType "application/json"
```

### Expected Response

**Success (200 OK):**
```json
{
  "success": true,
  "signal_id": 123,
  "message": "Signal received and processing triggered"
}
```

**Validation Error (400 Bad Request):**
```json
{
  "error": "Validation failed",
  "details": "..."
}
```

**Duplicate Signal (409 Conflict):**
```json
{
  "success": false,
  "error": "Duplicate signal",
  "details": "Signal received within 60 seconds",
  "existing_signal_id": 122
}
```

---

## 🔐 Authentication (Optional)

If you've set up API key authentication:

**Add Header:**
```
Authorization: Bearer YOUR_API_KEY
```

Or:
```
X-API-Key: YOUR_API_KEY
```

**Note:** Authentication is optional. If `WEBHOOK_API_KEY` or `API_KEY` environment variables are not set, the endpoint will accept requests without authentication.

---

## 📊 What Happens After Webhook Receives Signal

1. **Signal Received** → Stored in `signals_log` table
2. **Validation** → Zod schema validation
3. **Duplicate Check** → Prevents duplicate signals (60s window)
4. **Decision Processing** → Triggered asynchronously
5. **Decision Engine** → 7-gate validation
6. **Trade Execution** → If approved, paper trade executed
7. **Response** → Returns immediately with signal_id

---

## ✅ Verification Checklist

- [ ] Webhook URL is correct: `https://spx-iota.vercel.app/api/webhook/tradingview`
- [ ] Test webhook with curl/PowerShell
- [ ] Verify response is `200 OK` with `signal_id`
- [ ] Check database for signal in `signals_log` table
- [ ] Check decision in `decision_audit` table
- [ ] Verify paper trade if decision was TRADE
- [ ] Set up TradingView alert with correct JSON format
- [ ] Test TradingView alert sends webhook

---

## 🆘 Troubleshooting

### Webhook Returns 400 Bad Request
- **Check:** JSON format is correct
- **Check:** All required fields are present
- **Check:** Data types match (numbers are numbers, not strings)
- **Check:** `timestamp` is Unix timestamp (number, not string)

### Webhook Returns 401 Unauthorized
- **Check:** API key is set in environment variables
- **Check:** Authorization header is correct
- **Check:** API key matches environment variable

### Webhook Returns 409 Conflict
- **Reason:** Duplicate signal detected
- **Solution:** This is normal - prevents duplicate processing
- **Note:** Signals within 60 seconds are considered duplicates

### Webhook Returns 429 Too Many Requests
- **Reason:** Rate limit exceeded (100 req/min)
- **Solution:** Reduce alert frequency or increase rate limit

### Signal Not Processing
- **Check:** Database connection is working
- **Check:** Decision processing endpoint is accessible
- **Check:** Function logs in Vercel dashboard
- **Check:** Signal is in `signals_log` table with `processed = false`

---

## 📝 Next Steps

1. **Test the webhook** using the curl/PowerShell commands above
2. **Verify signal appears** in database
3. **Set up TradingView alert** with the JSON template
4. **Monitor webhook** in Vercel function logs
5. **Check signals** at `/api/signals/list`
6. **Check decisions** at `/api/decisions`
7. **Check trades** at `/api/paper/list`

---

**Status:** ✅ Webhook Endpoint Ready  
**URL:** `https://spx-iota.vercel.app/api/webhook/tradingview`  
**Next:** Test webhook and set up TradingView alerts

