# Test TradingView Webhook Endpoint
# This script tests if the webhook endpoint is accessible and working

param(
    [string]$ApiKey = $env:WEBHOOK_API_KEY,
    [string]$BaseUrl = "https://spx-iota.vercel.app"
)

Write-Host "`n🧪 Testing TradingView Webhook Endpoint`n" -ForegroundColor Cyan
Write-Host "URL: $BaseUrl/api/webhook/tradingview`n" -ForegroundColor White

# Check if API key is provided
if (-not $ApiKey) {
    Write-Host "⚠️  No API key provided. Testing without authentication...`n" -ForegroundColor Yellow
    Write-Host "   If webhook requires auth, set WEBHOOK_API_KEY environment variable or pass -ApiKey parameter`n" -ForegroundColor Gray
}

# Create test signal payload
$testSignal = @{
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
} | ConvertTo-Json -Depth 10

Write-Host "📤 Sending Test Signal:" -ForegroundColor Cyan
Write-Host "   Symbol: SPX" -ForegroundColor White
Write-Host "   Direction: LONG" -ForegroundColor White
Write-Host "   Signal Type: STRAT_212" -ForegroundColor White
Write-Host "   Confidence: 7.5`n" -ForegroundColor White

# Prepare headers
$headers = @{
    "Content-Type" = "application/json"
}

# Add API key if provided
if ($ApiKey) {
    $headers["x-api-key"] = $ApiKey
    Write-Host "🔐 Using API Key Authentication`n" -ForegroundColor Green
}

# Build URL
$webhookUrl = "$BaseUrl/api/webhook/tradingview"
if ($ApiKey) {
    $webhookUrl += "?api_key=$ApiKey"
}

try {
    Write-Host "⏳ Sending webhook request...`n" -ForegroundColor Yellow
    
    $response = Invoke-WebRequest -Uri $webhookUrl -Method POST -Headers $headers -Body $testSignal -UseBasicParsing -ErrorAction Stop
    
    Write-Host "✅ SUCCESS! Webhook received by server`n" -ForegroundColor Green
    
    $responseData = $response.Content | ConvertFrom-Json
    
    Write-Host "📋 Response:" -ForegroundColor Cyan
    Write-Host "   Status: $($response.StatusCode)" -ForegroundColor White
    Write-Host "   Success: $($responseData.success)" -ForegroundColor White
    
    if ($responseData.signal_id) {
        Write-Host "   Signal ID: $($responseData.signal_id)" -ForegroundColor White
        Write-Host "   Message: $($responseData.message)`n" -ForegroundColor White
        
        Write-Host "✅ Signal stored in database with ID: $($responseData.signal_id)`n" -ForegroundColor Green
    }
    
    # Wait a moment for processing
    Write-Host "⏳ Waiting 2 seconds for signal processing...`n" -ForegroundColor Yellow
    Start-Sleep -Seconds 2
    
    # Check status endpoint
    Write-Host "📊 Checking webhook status...`n" -ForegroundColor Cyan
    try {
        $statusResponse = Invoke-WebRequest -Uri "$BaseUrl/api/webhook/status" -Method GET -UseBasicParsing -ErrorAction Stop
        $statusData = $statusResponse.Content | ConvertFrom-Json
        
        if ($statusData.success) {
            Write-Host "📈 Webhook Statistics:" -ForegroundColor Cyan
            Write-Host "   Total Signals: $($statusData.stats.total_signals)" -ForegroundColor White
            Write-Host "   Last Hour: $($statusData.stats.last_hour)" -ForegroundColor White
            Write-Host "   Last 24 Hours: $($statusData.stats.last_24_hours)" -ForegroundColor White
            Write-Host "   Processed: $($statusData.stats.processed_count)" -ForegroundColor White
            Write-Host "   Pending: $($statusData.stats.pending_count)" -ForegroundColor White
            
            if ($statusData.stats.last_received) {
                Write-Host "   Last Received: $($statusData.stats.last_received)`n" -ForegroundColor White
            }
            
            if ($statusData.signals.Count -gt 0) {
                Write-Host "📋 Recent Signals:" -ForegroundColor Cyan
                $statusData.signals | Select-Object -First 3 | ForEach-Object {
                    Write-Host "   • $($_.symbol) - $($_.signal_type) ($($_.direction)) - ID: $($_.id) - Received: $($_.received_at)" -ForegroundColor White
                }
            }
        }
    } catch {
        Write-Host "⚠️  Status endpoint not available yet (may need deployment)" -ForegroundColor Yellow
        Write-Host "   You can check signals at: $BaseUrl/api/signals/feed`n" -ForegroundColor Gray
    }
    
    Write-Host "`n✅ Webhook Test Complete!`n" -ForegroundColor Green
    Write-Host "🎯 Next Steps:" -ForegroundColor Cyan
    Write-Host "   1. Check TradingView alert configuration" -ForegroundColor White
    Write-Host "   2. Verify webhook URL includes API key (if required)" -ForegroundColor White
    Write-Host "   3. Monitor for real webhooks when market opens`n" -ForegroundColor White
    
} catch {
    Write-Host "`n❌ ERROR: Webhook test failed`n" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode.value__
        $statusDescription = $_.Exception.Response.StatusDescription
        
        Write-Host "   Status Code: $statusCode" -ForegroundColor Red
        Write-Host "   Status: $statusDescription`n" -ForegroundColor Red
        
        # Try to get error details
        try {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $responseBody = $reader.ReadToEnd()
            $errorData = $responseBody | ConvertFrom-Json
            
            Write-Host "   Error Details:" -ForegroundColor Yellow
            if ($errorData.error) {
                Write-Host "      Error: $($errorData.error)" -ForegroundColor White
            }
            if ($errorData.details) {
                Write-Host "      Details: $($errorData.details)" -ForegroundColor White
            }
            if ($errorData.message) {
                Write-Host "      Message: $($errorData.message)" -ForegroundColor White
            }
        } catch {
            Write-Host "      Could not parse error response" -ForegroundColor Gray
        }
        
        # Provide troubleshooting based on status code
        Write-Host "`n🔧 Troubleshooting:" -ForegroundColor Cyan
        switch ($statusCode) {
            401 {
                Write-Host "   • API key is missing or incorrect" -ForegroundColor White
                Write-Host "   • Check WEBHOOK_API_KEY in Vercel environment variables" -ForegroundColor White
                Write-Host "   • Verify API key is included in TradingView webhook URL" -ForegroundColor White
            }
            400 {
                Write-Host "   • Request validation failed" -ForegroundColor White
                Write-Host "   • Check that all required fields are present" -ForegroundColor White
                Write-Host "   • Verify signal format matches TradingViewSignalSchema" -ForegroundColor White
            }
            404 {
                Write-Host "   • Endpoint not found" -ForegroundColor White
                Write-Host "   • Verify URL is correct: $BaseUrl/api/webhook/tradingview" -ForegroundColor White
                Write-Host "   • Check if deployment completed successfully" -ForegroundColor White
            }
            429 {
                Write-Host "   • Rate limit exceeded" -ForegroundColor White
                Write-Host "   • Wait a moment and try again" -ForegroundColor White
            }
            500 {
                Write-Host "   • Server error" -ForegroundColor White
                Write-Host "   • Check Vercel function logs for details" -ForegroundColor White
                Write-Host "   • Verify database connection is working" -ForegroundColor White
            }
            default {
                Write-Host "   • Unexpected error occurred" -ForegroundColor White
                Write-Host "   • Check Vercel deployment logs" -ForegroundColor White
            }
        }
    } else {
        Write-Host "   Error: $($_.Exception.Message)`n" -ForegroundColor Red
        Write-Host "   This might indicate:" -ForegroundColor Yellow
        Write-Host "   • Network connectivity issue" -ForegroundColor White
        Write-Host "   • Endpoint is not accessible" -ForegroundColor White
        Write-Host "   • Deployment not complete" -ForegroundColor White
    }
    
    Write-Host "`n"
    exit 1
}

