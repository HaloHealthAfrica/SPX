# Test TradingView Webhook
# Usage: .\test-webhook.ps1

$webhookUrl = "https://spx-iota.vercel.app/api/webhook/tradingview"

Write-Host "`n🧪 Testing TradingView Webhook`n" -ForegroundColor Cyan
Write-Host "URL: $webhookUrl`n" -ForegroundColor Yellow

# Create test signal
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
    active_signals = @("STRAT_212", "BOS", "FVG")
} | ConvertTo-Json -Depth 10

Write-Host "📤 Sending test signal...`n" -ForegroundColor Yellow
Write-Host "Signal Data:" -ForegroundColor Gray
Write-Host $testSignal -ForegroundColor White
Write-Host "`n"

try {
    $response = Invoke-RestMethod -Uri $webhookUrl `
        -Method Post `
        -Body $testSignal `
        -ContentType "application/json" `
        -ErrorAction Stop

    Write-Host "✅ SUCCESS!`n" -ForegroundColor Green
    Write-Host "Response:" -ForegroundColor Cyan
    $response | ConvertTo-Json -Depth 10 | Write-Host -ForegroundColor White
    
    if ($response.success) {
        Write-Host "`n✅ Signal ID: $($response.signal_id)" -ForegroundColor Green
        Write-Host "✅ Message: $($response.message)" -ForegroundColor Green
        Write-Host "`n📋 Next Steps:" -ForegroundColor Yellow
        Write-Host "   1. Check signals: https://spx-iota.vercel.app/api/signals/list" -ForegroundColor White
        Write-Host "   2. Check decisions: https://spx-iota.vercel.app/api/decisions" -ForegroundColor White
        Write-Host "   3. Check trades: https://spx-iota.vercel.app/api/paper/list" -ForegroundColor White
    }
} catch {
    Write-Host "❌ ERROR!`n" -ForegroundColor Red
    Write-Host "Status Code: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    Write-Host "Error Message: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.ErrorDetails.Message) {
        Write-Host "`nError Details:" -ForegroundColor Yellow
        $_.ErrorDetails.Message | Write-Host -ForegroundColor White
    }
}

Write-Host "`n"

