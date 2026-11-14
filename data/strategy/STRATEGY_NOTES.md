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

## 2026-10-31

**Backtest 2026-10-31: N=124 scored picks, overall direction accuracy 57/124 = 46.0%**

- IT Services: 22% (4/18), CI [9%,45%] — stays below baseline, weight -> 0.76x.
  All 3 miss examples are macro-driven calls (Nasdaq rally and/or USD/INR weakness at 94-96, one with an upcoming Q1 result) that did not produce the expected move. Suggests the USD/INR / Nasdaq tailwind rule is over-trusted for IT; worth revisiting the threshold at a future review, not acting on it yet.
- Upstream Oil: 47% (n=30), CI [30%,64%] — overlaps baseline. No change.
- Airlines: 60% (n=15), CI [36%,80%] — overlaps baseline. No change.
- Paints: 50% (n=14), CI [27%,73%] — overlaps baseline. No change.
- Private Banks: 56% (n=9), CI [27%,81%] — overlaps baseline. No change.
- Gold-linked: 67% (n=9), CI [35%,88%] — overlaps baseline. No change.
- Tyres: 38% (n=8), CI [14%,69%] — overlaps baseline. No change.
- OMC n=5, Metals n=4, Auto OEM n=3, Pharma n=3, Defense n=2, Large Cap/Broad Market n=1, Infra n=1, FMCG n=1, Logistics n=1 — not enough data yet. No change.

Decision: IT Services reweighted to 0.76x (mechanical proposal accepted). All other sectors unchanged at 1.0x this week.

## 2026-11-07

**Backtest 2026-11-07: N=152 scored picks, overall direction accuracy 71/152 = 46.7%**

- IT Services: 22% (4/18), CI [9%,45%] — entire interval below the 47% baseline, weight -> 0.76x.
  The 3 printed miss examples (INFY 06-23, HCLTECH 07-10, INFY 07-14) all rest on a macro-currency or Nasdaq narrative (weak USD/INR, Nasdaq rally) that did not translate into the expected move; 2 of 3 are INFY with a rupee-weakness thesis. Only 3 examples were shown, so this is suggestive, not conclusive — worth revisiting the USD/INR and Nasdaq rules at a future review, not acting on yet.
- Upstream Oil: 42% (14/33), CI [27%,59%] — overlaps baseline. No change.
- Airlines: 62% (13/21), CI [41%,79%] — overlaps baseline. No change.
- Paints: 50% (9/18), CI [29%,71%] — overlaps baseline. No change.
- Tyres: 43% (6/14), CI [21%,67%] — overlaps baseline. No change.
- Gold-linked: 67% (8/12), CI [39%,86%] — overlaps baseline. No change.
- Private Banks: 56% (5/9), CI [27%,81%] — overlaps baseline. No change.
- OMC n=6, Metals n=5, Pharma n=4, Auto OEM n=3, FMCG n=3, Defense n=2, Large Cap/Broad Market n=1, Infra n=1, Fertilizer n=1, Logistics n=1 — not enough data yet. No change.

Decision: reweighted IT Services to 0.76x (mechanical proposal accepted). All other sectors unchanged this week; no other sector cleared the evidence bar.

## 2026-11-14

## Weekly strategy review — 2026-11-14

**Backtest: N=159 scored picks, overall direction accuracy 76/159 = 47.8%**

Gate: a sector moves only if n >= 8 and its 95% Wilson CI sits entirely above or entirely below the overall baseline. No sector cleared the gate this week.

Sectors with enough data (n >= 8):
- Upstream Oil: 43% (15/35), CI [28%,59%] — overlaps baseline. No change.
- Airlines: 62% (13/21), CI [41%,79%] — overlaps baseline. No change.
- IT Services: 30% (6/20), CI [15%,52%] — overlaps baseline, but only just (upper bound 52% vs baseline 48%). No change this week; this is the bucket most likely to flip to DEPRIORITIZE if the next few IT picks miss. Not acting on it until the gate clears.
- Paints: 50% (9/18), CI [29%,71%] — overlaps baseline. No change.
- Tyres: 43% (6/14), CI [21%,67%] — overlaps baseline. No change.
- Gold-linked: 64% (9/14), CI [39%,84%] — overlaps baseline. No change.
- Private Banks: 60% (6/10), CI [31%,83%] — overlaps baseline. No change.

Sectors below the n >= 8 threshold (weight held at 1.0 by rule):
- OMC: n=6, 50% (3/6). Not enough data yet.
- Metals: n=5, 60% (3/5). Not enough data yet.
- Pharma: n=4, 50% (2/4). Not enough data yet.
- Auto OEM: n=3, 33% (1/3). Not enough data yet.
- FMCG: n=3, 67% (2/3). Not enough data yet.
- Defense: n=2, 0% (0/2). Not enough data yet.
- Large Cap/Broad Market: n=1, 100% (1/1). Not enough data yet.
- Infra: n=1, 0% (0/1). Not enough data yet.
- Fertilizer: n=1, 0% (0/1). Not enough data yet.
- Logistics: n=1, 0% (0/1). Not enough data yet.

Observations (not acted on):
- Overall direction accuracy of 47.8% is below a coin flip. That is a system-level finding, not a sector-level one, and the per-sector reweighting mechanism cannot fix it. Worth a human look at whether the morning agent's rulebook or the target_pct sign convention is systematically off.
- Coverage is concentrated: Upstream Oil, Airlines, IT Services and Paints account for 94 of 159 scored picks (59%). Ten sectors have fewer than 8 samples, so most of the rulebook is still untested.
- Nothing was flagged BOOST or DEPRIORITIZE, so no MISS_EXAMPLE lines were printed and no catalyst-level pattern review was possible this week.

Decision: reviewed, no sector cleared the evidence bar. All 17 reported sectors held at 1.0x.
