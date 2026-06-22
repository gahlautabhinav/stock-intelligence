# Stock Intelligence PA

Pre-market intelligence system for NSE intraday trading. Delivers macro news analysis, sector-correlation picks, and end-of-day tracking automatically every weekday.

## Dashboard

**https://gahlautabhinav.github.io/stock-intelligence**

Editorial intelligence-briefing design (Wired-inspired), dark/light mode toggle:
- Morning brief with full news reasoning — click any story to expand analysis
- Sector outlook grid (BULLISH / BEARISH / NEUTRAL per sector)
- Pick cards with watch zone, stop loss, target, and actual outcome once market closes
- History tab: every past briefing, expandable
- Performance tab: per-stock win rate, avg move, TradingView charts (5 metrics), sector heatmap

## Schedule

| Time | Action |
|------|--------|
| **8:00 AM IST** | Morning agent gathers macro data, analyzes sector correlations, sends 2 Telegram messages, logs to GitHub |
| **3:45 PM IST** | Evening agent fetches NSE closing prices, logs actuals, sends EOD accuracy recap |
| **Always** | Dashboard auto-refreshes every 5 min from GitHub JSON |

## How It Works

```
Yahoo Finance (commodities + indices)  ──┐
ET Markets RSS (India business news)    ─┤
WebSearch (FII/DII, GIFT Nifty, macro) ─┤──► Morning Agent ──► Telegram (2 msgs)
                                         └──────────────────► GitHub JSON

NSE closing prices (Yahoo Finance .NS) ──► Evening Agent ──► Telegram (EOD recap)
                                                         └──► GitHub JSON (actuals)

GitHub JSON ──► Dashboard (GitHub Pages) ──► Browser / phone
```

## Sector Correlations

| Event | Bullish | Bearish |
|-------|---------|---------|
| Crude oil falls | Airlines, Paints, Tyres, Logistics, FMCG | OMCs, Upstream Oil |
| Crude oil rises | OMCs (HPCL, BPCL), Upstream (ONGC) | Airlines, Paints, Tyres |
| Dollar strengthens | IT (TCS, INFY, WIPRO), Pharma exporters | — |
| Dollar weakens | — | IT, Pharma exporters |
| US markets up | Broad market, Banking (FII flows) | — |
| US Nasdaq +1%+ | Indian IT (valuation re-rating) | — |
| China data strong | Metals (TATASTEEL, HINDALCO, VEDL) | — |
| RBI rate cut | Banks, NBFCs, Real Estate, Auto | — |
| Gold rises | MUTHOOTFIN, MANAPPURAM, TITAN | Broad market (risk-off) |
| FII buying >500 Cr | Large caps, Nifty 50 | — |
| Infra capex news | L&T, NTPC, IRCON, Capital Goods | — |
| Defense orders | HAL, BEL, BEML, COCHINSHIP | — |
| Good monsoon | FMCG rural, Fertilizers, Tractors | — |

## Repository Structure

```
stock-intelligence/
├── data/
│   └── briefings.json      <- append-only log of all briefings + actuals
├── docs/                   <- GitHub Pages dashboard
│   ├── index.html
│   ├── style.css           <- Wired editorial design system
│   └── app.js
├── .github/
│   └── workflows/
│       └── pages.yml       <- GitHub Pages deploy with correct permissions
├── .gitignore
└── README.md

[NOT in repo -- local only, contain credentials]
agents/
├── morning-agent-prompt.md
└── evening-agent-prompt.md

design-files/
└── DESIGN-wired.md
```

## Cloud Agents

Managed via Claude Code routines (run on Anthropic cloud -- laptop does not need to be open):
- **Morning:** https://claude.ai/code/routines/trig_014yZyW2H8Mpq2GQeMsG5SDy
- **Evening:** https://claude.ai/code/routines/trig_01FXHWTMHqss4oNU6b9KGJ1D

## Data Format

Each entry in `briefings.json`:

```json
{
  "date": "2026-06-16",
  "day": "Monday",
  "snapshot": {
    "gift_nifty": { "value": 23930, "change_pct": 0.31 },
    "sp500":      { "value": 7554,  "change_pct": 1.65 },
    "crude_oil":  { "value": 81.14, "change_pct": 0.48 },
    "usd_inr":    { "value": 94.75, "change_pct": -0.38 },
    "gold":       { "value": 4309,  "change_pct": -0.3 }
  },
  "fii": { "net_cr": 200, "direction": "buying" },
  "news": [{
    "headline": "...",
    "what_happened": "...",
    "why_it_matters": "...",
    "affected_stocks": ["INDIGO", "ASIANPAINT"],
    "sentiment": "bullish"
  }],
  "sector_outlook": [{ "sector": "Airlines", "outlook": "BULLISH", "reason": "Crude -5%" }],
  "picks": [{
    "symbol": "INDIGO",
    "catalyst": "...",
    "logic": "...",
    "watch_zone": { "low": 4850, "high": 4920 },
    "target_pct": 2.5,
    "stop_loss": 4800,
    "actual_open": 4905,
    "actual_close": 4880,
    "actual_pct_change": -0.5,
    "hit_target": false
  }],
  "overall_mood": "BULLISH",
  "risks": ["..."],
  "eod_updated": true,
  "eod_summary": "INDIGO -0.5%"
}
```

## Cost

Everything free:
- Claude agents: Claude Max subscription
- Data (Yahoo Finance, RSS, WebSearch): free
- GitHub repo + Pages: free
- Telegram bot: free

**Total extra cost: Rs 0/month**

---

*Not financial advice.*
