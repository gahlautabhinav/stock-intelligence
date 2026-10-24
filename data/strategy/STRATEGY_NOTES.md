# Strategy Notes

Weekly review log. Append-only — newest entries at the bottom.

## 2026-10-10

**Backtest: N=100 scored picks, overall direction accuracy 47/100 = 47.0%**

- Upstream Oil: 48% (10/21), CI [28%,68%] — overlaps baseline. No change.
- IT Services: 24% (4/17), CI [10%,47%] — lowest hit rate, but the upper bound touches the 47% baseline, so it does not clear the evidence bar. Closest to a signal; watch next week. No change (1.0x).
- Airlines: 67% (6/9), CI [35%,88%] — overlaps baseline. No change.
- Private Banks: 56% (5/9), CI [27%,81%] — overlaps baseline. No change.
- Gold-linked: 67% (6/9), CI [35%,88%] — overlaps baseline. No change.
- Paints: 62% (5/8), CI [31%,86%] — overlaps baseline. No change.
- Tyres: n=7 (29%) — not enough data yet. No change.
- OMC: n=5 — not enough data. No change.
- Metals: n=4 — not enough data. No change.
- Auto OEM: n=3 — not enough data. No change.
- Defense: n=2, Pharma: n=2 — not enough data. No change.
- Large Cap/Broad Market, Infra, FMCG, Logistics: n=1 each — not enough data. No change.

No sector was flagged BOOST/DEPRIORITIZE, so no miss examples were printed or analysed; no pattern claimed.

Decision: reviewed, no sector cleared the evidence bar. All weights unchanged at 1.0x this week.

## 2026-10-17

**Backtest: N=105 scored picks, overall direction accuracy 48/105 = 45.7%**

- Upstream Oil: 50% (11/22), CI [31%,69%] — overlaps baseline. No change.
- IT Services: 24% (4/17), CI [10%,47%] — lowest rate, but CI upper bound still overlaps the 46% baseline. Did not clear the evidence bar; no weight change. Worth watching: if it persists as n grows it may cross the threshold.
- Airlines: 55% (6/11), CI [28%,79%] — overlaps baseline. No change.
- Paints: 50% (5/10), CI [24%,76%] — overlaps baseline. No change.
- Private Banks: 56% (5/9), CI [27%,81%] — overlaps baseline. No change.
- Gold-linked: 67% (6/9), CI [35%,88%] — overlaps baseline. No change.
- Tyres: n=7 (29%) — not enough data yet. No change.
- OMC: n=5 — not enough data. No change.
- Metals: n=4 — not enough data. No change.
- Auto OEM: n=3 — not enough data. No change.
- Defense: n=2 — not enough data. No change.
- Pharma: n=2 — not enough data. No change.
- Large Cap/Broad Market, Infra, FMCG, Logistics: n=1 each — not enough data. No change.

No sector was flagged BOOST/DEPRIORITIZE, so no miss examples were surfaced and no causal pattern was investigated.

Decision: reviewed, no sector cleared the evidence bar. All weights unchanged at 1.0x. Overall accuracy is slightly below 50%, which is itself worth noting honestly: at this sample size the system has no demonstrated directional edge.

## 2026-10-24

**Backtest: N=116 scored picks, overall direction accuracy 53/116 = 45.7%**

- Upstream Oil: 50% (n=28), CI [33%,67%] — overlaps baseline. No change.
- IT Services: 22% (4/18), CI [9%,45%] — below baseline, weight -> 0.77x.
  The 3 miss examples shown are all bullish calls built on rupee weakness (USD/INR 94-96) and/or a Nasdaq rally (INFY 06-23, HCLTECH 07-10, INFY 07-14). That suggests the "weak INR / strong Nasdaq => IT up" rule is over-triggering, but only 3 examples were inspected, so this is a hypothesis to revisit, not a basis for a rule change yet.
- Airlines: 58% (n=12), CI [32%,81%] — overlaps baseline. No change.
- Paints: 45% (n=11), CI [21%,72%] — overlaps baseline. No change.
- Private Banks: 56% (n=9), CI [27%,81%] — overlaps baseline. No change.
- Gold-linked: 67% (n=9), CI [35%,88%] — overlaps baseline. No change.
- Tyres: 38% (n=8), CI [14%,69%] — overlaps baseline. No change.
- OMC n=5, Metals n=4, Auto OEM n=3, Pharma n=3, Defense n=2, Large Cap/Broad Market n=1, Infra n=1, FMCG n=1, Logistics n=1 — insufficient data. No change.

Decision: accepted the mechanical proposal. IT Services reweighted to 0.77x; all other sectors unchanged at 1.0x this week.
