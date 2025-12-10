# Auto-Trade Flow Audit Report

## Current Flow Analysis

### Existing Flow (Webhook → Manual Execution)
```
TradingView Webhook
    ↓
/api/webhook/tradingview
    ↓
Store in signals_log
    ↓
/api/decision/process
    ↓
Decision Engine (7 gates)
    ↓
/api/paper/execute (if TRADE)
    ↓
paper_trades table
```

### Auto-Trade Flow (Currently Disconnected)
```
Signal Generator Service
    ↓
Auto-Trade Orchestrator
    ↓
Decision Engine
    ↓
Paper Executor Service
    ↓
paper_trades table
```

## 🔴 Critical Gaps Identified

### Gap 1: Webhook Not Connected to Auto-Trade
- **Issue:** Webhooks go to manual execution path only
- **Impact:** Auto-trade orchestrator never receives webhook signals
- **Fix:** Route webhook signals to auto-trade orchestrator when enabled

### Gap 2: No Options Strike Selection
- **Issue:** No strike selector service exists
- **Impact:** Cannot select optimal strikes for options trades
- **Fix:** Build strike selector following best practices

### Gap 3: Options Decision Engine Not Used
- **Issue:** Decision engine always uses directional engine
- **Impact:** Options-specific validation and strategy selection not used
- **Fix:** Detect options signals and route to options engine

### Gap 4: No Unified Signal Processing
- **Issue:** Two separate paths (webhook vs auto-generated)
- **Impact:** Inconsistent processing, duplicate logic
- **Fix:** Create unified signal processor

### Gap 5: Strike Selection Not in Decision Flow
- **Issue:** Strike selection happens after decision
- **Impact:** Cannot validate strike in decision gates
- **Fix:** Integrate strike selection into decision engine

## 🎯 Required Flow (Target State)

```
TradingView Webhook OR Signal Generator
    ↓
Unified Signal Processor
    ↓
Detect: Options or Directional?
    ↓
    ├─→ Options Path:
    │     ↓
    │   Strike Selector (best practices)
    │     ↓
    │   Options Decision Engine (with strike validation)
    │     ↓
    │   Options Execution
    │
    └─→ Directional Path:
          ↓
        Decision Engine
          ↓
        Directional Execution
    ↓
Auto-Trade Orchestrator (if enabled)
    ↓
Paper Executor
    ↓
Database
```

## Best Practices for Options Strike Selection

1. **Delta-Based Selection**
   - INTRADAY: 0.40-0.70 delta (ATM-ish for gamma)
   - SWING: 0.30-0.60 delta
   - MONTHLY: 0.25-0.55 delta
   - LEAPS: 0.60-0.85 delta (deeper ITM)

2. **IV Rank Consideration**
   - High IV (>50): Sell premium (credit spreads)
   - Low IV (<50): Buy premium (debit spreads/long options)

3. **DTE Selection**
   - INTRADAY: 0-7 DTE
   - SWING: 14-45 DTE
   - MONTHLY: 30-60 DTE
   - LEAPS: 180-730 DTE

4. **Liquidity Requirements**
   - Minimum open interest: 100-500 (timeframe dependent)
   - Maximum bid-ask spread: 5-10% of mid price
   - Minimum volume: 50-200 contracts

5. **Risk/Reward Optimization**
   - Select strikes that maintain target R:R
   - Consider breakeven points
   - Factor in commission costs

6. **Strategy-Specific Rules**
   - Debit spreads: Select strikes for max R:R
   - Credit spreads: Select strikes for high probability
   - Long options: Balance delta vs premium cost


