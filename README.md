# SPX Fusion Trading System

A comprehensive SPX/ES options trading system that receives TradingView webhook signals, processes them through a multi-gate decision engine, executes paper trades, and displays real-time analytics on a professional dashboard.

## Features

✅ **Multi-gate validation** - Every signal goes through 7+ gates before trade  
✅ **Signal factorization** - Weight different signal families intelligently  
✅ **Mode-based risk** - REVERSAL trades get 50% reduced position size  
✅ **Daily limits** - Stop after 5 trades or -$2,500 drawdown  
✅ **Paper trading** - No real money, simulate fills at signal prices  
✅ **Comprehensive audit** - Every decision logged with gate results  
✅ **Professional UI** - Multi-tab dashboard with charts and analytics  

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL
- **Charts**: Recharts
- **Data Fetching**: TanStack Query (React Query)

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Database Setup

Create a PostgreSQL database and set the connection string in your `.env` file:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/spx_trading
```

### 3. Run Migrations

```bash
npm run db:migrate
```

This will create all required tables:
- `signals_log` - Incoming TradingView signals
- `decision_audit` - Every decision made (TRADE or BLOCK)
- `paper_trades` - Executed trades (open and closed)
- `daily_limits` - Risk management tracking
- `system_state` - Key-value store for cooldowns, session state

### 4. Seed Test Data (Optional)

```bash
# Via API endpoint
curl -X POST http://localhost:3000/api/dev/seed
```

Or use the seed script:
```bash
npm run db:seed
```

### 5. Start Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` to see the dashboard.

## API Endpoints

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/webhook/tradingview` | POST | Receive TradingView signals |
| `/api/decision/process` | POST | Run signal through decision gates |
| `/api/paper/execute` | POST | Execute paper trade |
| `/api/paper/monitor` | GET | Check/close open positions |
| `/api/paper/list` | GET | Get all trades (filter by status) |
| `/api/decisions/route` | GET | List all decisions |
| `/api/signals/list` | GET | List all signals |
| `/api/analytics/performance` | GET | Compute performance metrics |
| `/api/dev/seed` | POST | Seed 5 days of realistic test data |

## TradingView Webhook Setup

Configure your TradingView alert to send POST requests to:

```
https://your-domain.com/api/webhook/tradingview
```

**Required Fields:**
```json
{
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
}
```

## Decision Engine Gates

1. **Signal Integrity** - Confidence ≥ 5.5, Confluence ≥ 2, Valid signals
2. **Session & Volatility** - Market hours check (9:30 AM - 4:00 PM ET)
3. **Signal Factorization** - Weighted score ≥ 6.0
4. **Role Assignment** - Primary signal + 2+ confirmations
5. **Weighted Score & Mode** - Risk/reward check (TREND: ≥2.0, REVERSAL: ≥3.0)
6. **Risk & Position Sizing** - Calculate quantity based on risk
7. **Daily Limits** - Max 5 trades/day, -$2,500 drawdown limit

## Dashboard Tabs

1. **Overview** - Key metrics, equity curve, recent decisions
2. **Positions** - Open and closed positions with P&L
3. **Signals** - All received signals with filters
4. **Analytics** - Performance by mode, daily P&L charts
5. **Strategy Analysis** - Win/loss breakdown, holding times, best/worst setups

## Signal Families & Weights

- **Market Structure** (weight: 2.5): STRAT_212, BOS, MSS, CHoCH
- **Liquidity Events** (weight: 2.0): SWEEP_LOW, SWEEP_HIGH, SMT
- **Order Flow** (weight: 3.0): FVG, DISPLACEMENT, BREAKER
- **Volume/Momentum** (weight: 2.0): VOLUME_SURGE, ORB

## Risk Management

- Base risk: 1% of $100k account = $1,000 per trade
- REVERSAL mode: 50% reduced risk = $500 per trade
- Daily limits: 5 trades max, -$2,500 drawdown stop
- Position sizing: `risk_dollars / (entry - stop_loss)`

## Environment Variables

```env
DATABASE_URL=postgresql://user:password@localhost:5432/spx_trading
TRADIER_API_KEY=your_tradier_api_key
ALPACA_API_KEY=your_alpaca_api_key
ALPACA_SECRET_KEY=your_alpaca_secret_key
TWELVEDATA_API_KEY=your_twelvedata_api_key
MARKETDATA_API_KEY=your_marketdata_api_key
```

## Development

The system uses:
- **React Query** for data fetching with 30s auto-refresh
- **Recharts** for all visualizations
- **Dark theme** with blue/cyan accents
- **Responsive design** for mobile and desktop

## License

MIT


