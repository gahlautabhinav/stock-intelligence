# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

A single user: the repository owner, an intraday trader on the NSE (India). No
other audience exists and none is planned — confirmed as "just me, permanently."
No authentication, multi-tenancy, onboarding, or public-visitor framing is
wanted. Hardcoded single-user identity (one Telegram chat ID, one GitHub repo) is
an accepted design choice, not debt.

The situation is narrow and time-boxed: weekday mornings before the NSE opens at
09:15 IST, reading a brief on a phone; and again after the 15:30 close, checking
what the morning's calls actually did.

## Product Purpose

Deliver a structured, macro-aware pre-market brief at 08:00 IST — before the
market opens — so the user starts the day already knowing what moved overnight
and which Indian sectors it implicates. A second pass at 15:45 IST reconciles the
morning's picks against actual closing prices.

**Success is awareness, not pick accuracy.** The value is knowing that crude
spiked 9% overnight and what that means for airlines, paints and tyres before the
open — not the hit rate of the specific stock calls. Pick tracking exists as a
diagnostic and an honesty mechanism, not as the product. Future work should
invest in the quality of the macro reasoning and the reliability of its delivery,
and should not optimize for the scoreboard.

## Positioning

Intraday opportunities on the NSE are macro-correlated, and the correlation is
the perishable part: by the time a human reads the overnight news and reasons
from "crude fell" to "airlines are bullish at open," the move has happened. The
product's mechanism is doing that correlation reasoning automatically, on a
schedule, and delivering the conclusion before the bell — not aggregating
headlines or streaming prices.

## Operating Context

- **Cadence:** Monday–Friday only. Morning run 08:00 IST; evening reconciliation
  15:45 IST. Nothing runs on weekends or outside those two windows.
- **Primary surface:** Telegram. The morning brief arrives as two messages (the
  4096-character limit forces the split); the evening recap as one.
- **Secondary surface:** a GitHub Pages dashboard, which is the archive and the
  place to see history, per-stock accuracy and sector heatmaps. It is not where
  the daily read happens.
- **Reading device:** phone, in the morning, quickly. Mobile is the real target;
  desktop is incidental.
- **Operational reality:** the pipeline is unattended automation that has already
  failed silently once for 37 consecutive days (see Evidence). Operating it means
  noticing when it breaks, which is why failure alerts are delivered to Telegram
  rather than to a log nobody reads.

## Capabilities and Constraints

Confirmed capabilities: fetches global market data and Indian market news;
reasons from macro moves to affected NSE sectors and named stocks; produces a
per-day JSON record; fetches actual closing prices and scores each pick; renders
history, accuracy and sector trends on the dashboard.

Binding constraints, confirmed by the user, that future work must not quietly
break:

1. **Zero recurring cost.** Everything stays on free tiers. No VPS, no paid API,
   no subscription. This constraint has already decided at least one
   architectural choice (a Cloudflare Worker relay rather than self-hosting a
   workflow engine).
2. **Never executes trades.** Analysis only. Nothing touches a brokerage API or
   moves money, however good the signals become.
3. **Telegram is the delivery channel.** The brief must reach Telegram before
   09:15 IST. The dashboard may never become the only place output lands.

Technical constraints that are facts of the environment, not preferences:

- The agents are **stateless**; each run is a fresh session with no memory. If a
  day's write fails, that day is lost — nothing queues or retries later.
- Anthropic's cloud-agent egress proxy **403s writes to `api.github.com`** while
  allowing reads. A relay exists solely because of this. Whether the block still
  applies has not been retested; if it were lifted the relay could be deleted.
- The GitHub token is deliberately short-lived (**30-day expiry**, a security
  choice), so credential rotation is a recurring operational task rather than a
  one-time setup step.
- The dashboard is vanilla HTML/CSS/JS served from `docs/` with no build step,
  bundler, or framework.

## Brand Commitments

The name **Stock Intelligence PA** is established and in use across the
dashboard masthead, Telegram messages and the repository.

Every brief carries a **"Not financial advice"** disclaimer. This is
non-negotiable and must survive any redesign.

The current dashboard uses an editorial/newspaper visual language (Playfair
Display, Lora and Inter; masthead, hairline rules, no cards). The user
explicitly declined to make this binding, so it is the **incumbent style, not a
constraint** — future design work may replace it.

## Evidence on Hand

Real operating data, not samples:

- `data/YYYY-MM-DD.json` — one record per trading day, from 2026-06-16 onward,
  with the morning brief and, once the evening run lands, actual prices and
  per-pick outcomes. `data/index.json` lists the dates.
- **39 trading days tracked; 5 of 87 picks hit target (~6%).** This number is
  real and must not be dressed up. It is also consistent with the confirmed
  purpose: the picks were never the point.
- **The series has a hole.** No data exists between 2026-07-16 and 2026-08-21 —
  a GitHub token expired and the failure was invisible for 37 days. Future work
  must not treat the history as continuous, and must not backfill it with
  invented entries. The gap is a fact about the system's reliability.
- `ARCHITECTURE.md` — full technical reference, including a documented
  failure-mode catalogue (F1–F7).
- `docs/` — the live dashboard, deployed at
  `https://gahlautabhinav.github.io/stock-intelligence`.

Deliberately absent, and not to be fabricated: any user research, any testimonial
or external validation, any benchmark against another tool, and any claim about
realized trading returns. Nothing in this project has been traded on.

## Product Principles

1. **Awareness over scoreboard.** Invest in the macro reasoning and in getting it
   delivered before the open. Pick accuracy is a diagnostic readout, not a goal
   to optimize.
2. **Fail loud, never silent.** A broken pipeline that looks healthy is worse
   than one that is obviously down. Every failure surfaces in the channel the
   user actually reads, on the first day it happens.
3. **Free is a constraint, not a preference.** If a change requires recurring
   spend, it is the wrong change.
4. **It advises; it never acts.** No execution, no money movement, no
   integration that could be mistaken for either.
5. **One user means no scaffolding.** No auth, no tenancy, no onboarding, no
   settings screens. Simplicity earned by refusing generality.
