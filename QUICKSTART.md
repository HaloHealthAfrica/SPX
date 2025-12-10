# Quick Start Guide

## 1. Install Dependencies

```bash
npm install
```

## 2. Set Up Database

Create a `.env` file in the root directory:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/spx_trading
```

Make sure PostgreSQL is running and create the database:

```sql
CREATE DATABASE spx_trading;
```

## 3. Run Database Migration

```bash
npm run db:migrate
```

This creates all required tables.

## 4. Start Development Server

```bash
npm run dev
```

The dashboard will be available at `http://localhost:3000`

## 5. Seed Test Data (Optional)

With the dev server running, open a new terminal and run:

```bash
curl -X POST http://localhost:3000/api/dev/seed
```

Or visit the API endpoint directly in your browser (though POST requests need curl/Postman).

## 6. View Dashboard

Open `http://localhost:3000` in your browser. You should see:

- **Overview Tab**: Key metrics, equity curve, recent decisions
- **Positions Tab**: Open and closed positions
- **Signals Tab**: All received signals
- **Analytics Tab**: Performance charts by mode
- **Strategy Tab**: Win/loss breakdown and analysis

## 7. Test Webhook (Optional)

Test the webhook endpoint with a sample signal:

```bash
curl -X POST http://localhost:3000/api/webhook/tradingview \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "SPX",
    "timestamp": 1234567890,
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

## 8. Monitor Trades (Optional)

Set up a cron job or scheduled task to periodically check and close positions:

```bash
# Every 5 minutes
curl http://localhost:3000/api/paper/monitor
```

## Next Steps

1. Configure TradingView alerts to send webhooks to your endpoint
2. Replace mock price fetching in `/api/paper/monitor` with real API calls (Alpaca/Tradier)
3. Customize risk parameters in `lib/decision-engine.ts`
4. Add more signal types and weights as needed

## Troubleshooting

**Database connection errors?**
- Check your `DATABASE_URL` in `.env`
- Ensure PostgreSQL is running
- Verify database exists

**No data showing?**
- Run the seed endpoint to populate test data
- Check browser console for API errors
- Verify API routes are working in Network tab

**Port already in use?**
- Change port: `npm run dev -- -p 3001`
- Or kill the process using port 3000


