# Stock Intelligence PA

Pre-market intelligence system for NSE intraday trading. Delivers macro news analysis, sector-correlation picks, and end-of-day tracking automatically every weekday.

## What It Does

| Time | Action |
|------|--------|
| **8:00 AM IST** | Morning agent wakes up, fetches commodity prices + news, analyzes sector impact, sends 2 Telegram messages with top picks |
| **3:45 PM IST** | Evening agent fetches actual NSE closing prices for all picks, logs results, sends EOD accuracy recap |
| **Always** | Dashboard auto-updates from GitHub JSON — view history, stats, accuracy |

## Dashboard

**https://gahlautabhinav.github.io/stock-intelligence**

- Today's briefing with full news reasoning
- Click any news card → see "what happened / why it matters" 
- History tab: every past briefing
- Stats tab: per-stock win rate, accuracy over time

## How It Works

```
Yahoo Finance (commodity prices)  ──┐
ET Markets RSS (India news)        ─┤
WebSearch (FII/DII, GIFT Nifty)   ─┤──► Morning Agent ──► Telegram (2 msgs)
WebSearch (US markets, global)    ─┘                  └──► GitHub JSON

NSE closing prices (Yahoo Finance) ──► Evening Agent ──► Telegram (EOD recap)
                                                     └──► GitHub JSON (actuals)

GitHub JSON ──► Dashboard (GitHub Pages) ──► Live in browser / phone
```

## Sector Correlation Rules

The agents use these correlations to find picks:

| Event | Bullish | Bearish |
|-------|---------|---------|
| Crude oil falls | INDIGO, SPICEJET, ASIANPAINT, MRF | HPCL, BPCL, ONGC |
| Crude oil rises | HPCL, BPCL, ONGC | INDIGO, SPICEJET |
| Dollar strengthens | TCS, INFY, WIPRO, HCLTECH, SUNPHARMA | — |
| Dollar weakens | — | TCS, INFY, WIPRO |
| US markets up | Broad market bullish | — |
| FII buying | Large caps, Nifty 50 | — |
| RBI rate cut | HDFCBANK, ICICIBANK, DLF, GODREJPROP | — |
| Gold rises | MUTHOOTFIN, MANAPPURAM | — |

## Repository Structure

```
stock-intelligence/
├── data/
│   └── briefings.json      ← append-only log of all briefings + actuals
├── docs/                   ← GitHub Pages dashboard
│   ├── index.html
│   ├── app.js
│   └── style.css
├── .gitignore
└── README.md

[NOT in repo — local only, contains credentials]
agents/
├── morning-agent-prompt.md
└── evening-agent-prompt.md
```

## Scheduled Agents

Managed via Claude Code cloud routines:
- **Morning:** https://claude.ai/code/routines/trig_014yZyW2H8Mpq2GQeMsG5SDy
- **Evening:** https://claude.ai/code/routines/trig_01FXHWTMHqss4oNU6b9KGJ1D

## Data Format

Each entry in `briefings.json`:

```json
{
  "date": "2026-06-16",
  "snapshot": { "crude_oil": { "value": 71.2, "change_pct": -2.3 }, "..." },
  "fii": { "net_cr": 1240, "direction": "buying" },
  "news": [{ "headline": "...", "what_happened": "...", "why_it_matters": "...", "affected_stocks": [...] }],
  "sector_outlook": [{ "sector": "Airlines", "outlook": "BULLISH", "reason": "Crude -2.3%" }],
  "picks": [{
    "symbol": "INDIGO",
    "catalyst": "...", "logic": "...",
    "watch_zone": { "low": 2800, "high": 2820 },
    "target_pct": 3.5, "stop_loss": 2760,
    "actual_open": 2815, "actual_close": 2906, "actual_pct_change": 3.23, "hit_target": true
  }],
  "overall_mood": "BULLISH",
  "eod_updated": true,
  "eod_summary": "INDIGO +3.2% ✅"
}
```

## Cost

Everything free:
- Claude agents: Claude Max subscription
- Data (Yahoo Finance, RSS, WebSearch): free
- GitHub repo + Pages: free
- Telegram bot: free

**Total extra cost: ₹0/month**

---

*Not financial advice.*
