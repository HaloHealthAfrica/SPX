# 🔐 Webhook URL with API Key

## Your Webhook URL

### Base URL (No API Key)
```
https://spx-iota.vercel.app/api/webhook/tradingview
```

### With API Key (Query Parameter)
```
https://spx-iota.vercel.app/api/webhook/tradingview?api_key=YOUR_API_KEY
```

---

## 📝 Example

If your API key is `abc123xyz789`, your webhook URL would be:

```
https://spx-iota.vercel.app/api/webhook/tradingview?api_key=abc123xyz789
```

---

## 🔧 Setup Steps

### Step 1: Generate API Key

Generate a secure random string:
- Use a password generator
- Minimum 32 characters recommended
- Example: `webhook_key_abc123xyz789def456ghi012jkl345mno678pqr901`

### Step 2: Add to Vercel

1. **Go to:** Vercel Dashboard → Your Project → Settings → Environment Variables
2. **Click:** "Add New"
3. **Enter:**
   - **Name:** `WEBHOOK_API_KEY`
   - **Value:** `[your-generated-key]`
   - **Environments:** ✅ Production, ✅ Preview, ✅ Development
4. **Click:** "Save"

### Step 3: Use in TradingView

**In TradingView Alert Settings:**

1. **Webhook URL:** 
   ```
   https://spx-iota.vercel.app/api/webhook/tradingview?api_key=YOUR_API_KEY
   ```

2. **Replace `YOUR_API_KEY`** with the actual key you set in Vercel

---

## 🔄 Alternative: Header Method

If TradingView supports custom headers (some versions do):

**URL (no query parameter):**
```
https://spx-iota.vercel.app/api/webhook/tradingview
```

**Add Header:**
- **Header Name:** `x-api-key`
- **Header Value:** `YOUR_API_KEY`

**Note:** Most TradingView webhook implementations don't support custom headers, so the query parameter method is recommended.

---

## ✅ Verification

After setting up, test your webhook:

```powershell
$apiKey = "YOUR_API_KEY"
$url = "https://spx-iota.vercel.app/api/webhook/tradingview?api_key=$apiKey"

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

Invoke-RestMethod -Uri $url -Method Post -Body $body -ContentType "application/json"
```

**Expected Response:**
```json
{
  "success": true,
  "signal_id": 123,
  "message": "Signal received and processing triggered"
}
```

---

## 🆘 Troubleshooting

### 401 Unauthorized
- **Check:** API key is set correctly in Vercel
- **Check:** API key in URL matches Vercel environment variable
- **Check:** No extra spaces in URL
- **Fix:** Redeploy after adding environment variable

### 400 Bad Request
- **Check:** JSON format is correct
- **Check:** All required fields are present
- **Not related to API key** - this is a validation error

### Still Getting 401 After Setting Key
- **Wait:** 2-3 minutes for Vercel to redeploy
- **Check:** Environment variable is set for "Production"
- **Verify:** API key in URL exactly matches the one in Vercel

---

## 🔒 Security Best Practices

1. **Use Strong Keys:** Minimum 32 characters, random
2. **Don't Share:** Keep API key private
3. **Rotate Regularly:** Change keys periodically
4. **Monitor Usage:** Check Vercel function logs for unauthorized access

---

## 📋 Quick Reference

**Your Webhook URL Format:**
```
https://spx-iota.vercel.app/api/webhook/tradingview?api_key=[YOUR_KEY]
```

**Replace `[YOUR_KEY]` with:**
- The value you set in Vercel's `WEBHOOK_API_KEY` environment variable

---

**Status:** ✅ Ready to Configure  
**Next:** Generate API key, add to Vercel, update TradingView alert

