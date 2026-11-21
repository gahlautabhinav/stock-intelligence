// ── Config ──────────────────────────────────────────────────
const GITHUB_USER = 'gahlautabhinav';
const GITHUB_REPO = 'stock-intelligence';
const BASE_RAW    = `https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/main`;
const INDEX_URL   = `${BASE_RAW}/data/index.json`;
const REFRESH_MS  = 5 * 60 * 1000;
const STALE_WEEKDAYS = 3;  // weekdays, not calendar days — a Fri→Mon gap is normal

// ── State ────────────────────────────────────────────────────
let briefings = [];
const _charts  = {};
let sectorWeights = {};  // {sector: multiplier}, from the weekly strategy review — see loadSectorWeights()

// ── Init ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  setupTabs();
  setupTheme();
  loadData();
  loadSectorWeights();
  setInterval(loadData, REFRESH_MS);
  updateMarketStatus();
  setInterval(updateMarketStatus, 60_000);
});

// Fire-and-forget: the weekly strategy review's sector-confidence weights (ARCHITECTURE.md
// §17). Non-fatal by design — the file may not exist yet, or the fetch may fail, and the
// Sector Outlook table must render fine either way with every sector just showing "—".
async function loadSectorWeights() {
  try {
    const res = await fetch(`${BASE_RAW}/data/strategy/rule_weights.json?t=${Date.now()}`);
    if (!res.ok) return;
    const doc = await res.json();
    sectorWeights = doc.weights || {};
  } catch (e) {
    // stays {} — renderSectorHeatmap() treats a missing entry as "no weight yet", not an error
  }
}

// ── Theme ─────────────────────────────────────────────────────
function setupTheme() {
  const saved = localStorage.getItem('theme');
  const html  = document.documentElement;
  const btn   = document.getElementById('themeToggle');
  const lbl   = document.getElementById('themeLabel');

  function apply(theme) {
    html.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    lbl.textContent = theme === 'dark' ? 'Light' : 'Dark';
  }

  if (saved) apply(saved);

  btn && btn.addEventListener('click', () => {
    const cur = html.getAttribute('data-theme');
    apply(cur === 'dark' ? 'light' : 'dark');
    if (briefings.length) renderCharts();
  });
}

// ── Data ─────────────────────────────────────────────────────
async function loadData() {
  const t = Date.now();
  try {
    // New architecture: index.json + per-day files
    const idxRes = await fetch(INDEX_URL + '?t=' + t);
    if (!idxRes.ok) throw new Error('index.json ' + idxRes.status);
    const dates = await idxRes.json();
    const dayFiles = await Promise.all(
      dates.map(date =>
        fetch(`${BASE_RAW}/data/${date}.json?t=${t}`)
          .then(r => r.ok ? r.json() : null)
          .catch(() => null)
      )
    );
    briefings = dayFiles.filter(Boolean);
    briefings.sort((a, b) => new Date(b.date) - new Date(a.date));
    render();
  } catch (e) {
    // Fallback: legacy briefings.json
    try {
      const res = await fetch(`${BASE_RAW}/data/briefings.json?t=${t}`);
      const parsed = await res.json();
      briefings = Array.isArray(parsed) ? parsed : [parsed];
      briefings.sort((a, b) => new Date(b.date) - new Date(a.date));
      render();
    } catch (e2) {
      console.error(e2);
      renderFreshness();   // briefings is empty here — render() would throw in renderStats()
    }
  }
}

// ── Tabs ─────────────────────────────────────────────────────
function setupTabs() {
  document.querySelectorAll('.tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
      if (btn.dataset.tab === 'stats') renderCharts();
    });
  });
}

// ── Render ───────────────────────────────────────────────────
function render() {
  renderFreshness();
  renderToday();
  renderHistory();
  renderStats();
  if (document.getElementById('tab-stats')?.classList.contains('active')) renderCharts();
}

// ── TODAY ────────────────────────────────────────────────────
function renderToday() {
  const el    = document.getElementById('tab-today');
  const today = todayStr();
  const b     = briefings.find(x => x.date === today) || briefings[0];

  if (!b) {
    el.innerHTML = `<div class="empty">No briefing yet. Morning agent posts at 8:00 AM IST.</div>`;
    return;
  }

  const isToday = b.date === today;
  el.innerHTML = `
    <div class="brief-header">
      <div class="brief-edition">Morning Intelligence Brief</div>
      <div class="brief-date">${fmtDateLong(b.date)}</div>
      ${!isToday ? `<div class="brief-date-stale">Showing most recent briefing — today's brief pending</div>` : ''}
    </div>
    ${renderMoodBanner(b.overall_mood)}
    ${renderFIIBanner(b.fii)}
    <div class="eyebrow">Market Snapshot</div>
    ${renderSnapshot(b.snapshot)}
    <hr class="section-rule">
    <div class="eyebrow">Key Events &amp; Analysis</div>
    ${renderNewsList(b.news)}
    <hr class="section-rule">
    <div class="eyebrow">Sector Outlook</div>
    ${renderSectors(b.sector_outlook)}
    <hr class="section-rule">
    <div class="eyebrow">Top Picks</div>
    ${renderPicks(b.picks)}
    ${b.risks?.length ? `<hr class="section-rule"><div class="eyebrow">Risk Factors</div>${renderRisks(b.risks)}` : ''}
    ${b.eod_summary ? `<hr class="section-rule"><div class="eyebrow">End of Day Results</div><div class="eod-summary">${b.eod_summary}</div>` : ''}
  `;
  attachNewsToggle(el);
}

// ── HISTORY ───────────────────────────────────────────────────
function renderHistory() {
  const el = document.getElementById('tab-history');
  if (!briefings.length) {
    el.innerHTML = `<div class="empty">No history yet.</div>`;
    return;
  }

  el.innerHTML = `
    <div class="brief-header">
      <div class="brief-edition">Archive</div>
      <div class="brief-date">${briefings.length} ${briefings.length === 1 ? 'Day' : 'Days'} Tracked</div>
    </div>
    <div class="history-list">
      ${briefings.map(renderHistoryRow).join('')}
    </div>
  `;

  el.querySelectorAll('.history-row').forEach(row => {
    row.addEventListener('click', () => row.classList.toggle('expanded'));
  });
  el.querySelectorAll('.news-card').forEach(card => {
    card.addEventListener('click', e => { e.stopPropagation(); card.classList.toggle('expanded'); });
  });
}

function renderHistoryRow(b) {
  const acc     = calcAccuracy(b.picks);
  const preview = (b.picks || []).map(p => {
    const a = p.actual_pct_change;
    return a != null
      ? `${p.symbol} ${a >= 0 ? '+' : ''}${a.toFixed(1)}% ${p.hit_target ? '✓' : '✗'}`
      : `${p.symbol}`;
  }).join('  ·  ');

  return `
    <div class="history-row">
      <div class="history-row-header">
        <span class="history-date">${fmtDate(b.date)} <span class="history-day">${b.day || ''}</span></span>
        <span class="history-mood-badge ${b.overall_mood || 'NEUTRAL'}">${b.overall_mood || 'NEUTRAL'}</span>
        <span class="history-picks-preview">${preview}</span>
        <span class="history-accuracy ${accColor(acc.rate)}">${acc.text}</span>
      </div>
      <div class="history-detail">
        <div class="eyebrow">Snapshot</div>
        ${renderSnapshot(b.snapshot)}
        <hr class="section-rule">
        <div class="eyebrow">News</div>
        ${renderNewsList(b.news)}
        <hr class="section-rule">
        <div class="eyebrow">Picks</div>
        ${renderPicks(b.picks)}
        ${b.eod_summary ? `<hr class="section-rule"><div class="eyebrow">End of Day</div><div class="eod-summary">${b.eod_summary}</div>` : ''}
      </div>
    </div>
  `;
}

// ── STATS ─────────────────────────────────────────────────────
function renderStats() {
  const el = document.getElementById('tab-stats');

  const allPicks = briefings.flatMap(b => b.picks || []).filter(p => p.actual_pct_change != null);
  const total    = allPicks.length;
  const wins     = allPicks.filter(p => p.hit_target).length;
  const winRate  = total ? Math.round(wins / total * 100) : null;
  const avgGain  = total ? (allPicks.reduce((s, p) => s + p.actual_pct_change, 0) / total) : null;
  const days     = briefings.length;

  const stockMap = {};
  allPicks.forEach(p => {
    if (!stockMap[p.symbol]) stockMap[p.symbol] = { wins: 0, total: 0, sum: 0 };
    stockMap[p.symbol].total++;
    stockMap[p.symbol].sum += p.actual_pct_change;
    if (p.hit_target) stockMap[p.symbol].wins++;
  });

  const stockRows = Object.entries(stockMap)
    .sort((a, b) => (b[1].wins / b[1].total) - (a[1].wins / a[1].total))
    .map(([sym, s]) => {
      const rate = Math.round(s.wins / s.total * 100);
      const avg  = (s.sum / s.total).toFixed(1);
      const cls  = rate >= 70 ? 'high' : rate >= 50 ? 'mid' : 'low';
      return `
        <tr>
          <td><strong>${sym}</strong></td>
          <td>${s.total}</td>
          <td class="win-rate ${cls}">${rate}%</td>
          <td style="color:${s.sum/s.total >= 0 ? 'var(--up)' : 'var(--dn)'}">
            ${avg >= 0 ? '+' : ''}${avg}%
          </td>
        </tr>
      `;
    }).join('');

  const winRateColor = winRate != null
    ? (winRate >= 60 ? 'var(--up)' : 'var(--dn)')
    : 'var(--body)';
  const gainColor = avgGain != null ? (avgGain >= 0 ? 'var(--up)' : 'var(--dn)') : 'var(--body)';

  el.innerHTML = `
    <div class="brief-header">
      <div class="brief-edition">Performance Record</div>
      <div class="brief-date">Pick Accuracy</div>
    </div>
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value" style="color:var(--ink)">${days}</div>
        <div class="stat-label">Days Tracked</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" style="color:${winRateColor}">${winRate != null ? winRate + '%' : '—'}</div>
        <div class="stat-label">Pick Accuracy</div>
        <div class="stat-sub">${wins}/${total} picks</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" style="color:${gainColor}">
          ${avgGain != null ? (avgGain >= 0 ? '+' : '') + avgGain.toFixed(1) + '%' : '—'}
        </div>
        <div class="stat-label">Avg Actual Move</div>
      </div>
    </div>

    ${stockRows ? `
      <hr class="section-rule">
      <div class="eyebrow">Per-Stock Breakdown</div>
      <div class="table-wrap">
        <table class="stock-stats-table">
          <thead><tr><th>Stock</th><th>Times Picked</th><th>Win Rate</th><th>Avg Move</th></tr></thead>
          <tbody>${stockRows}</tbody>
        </table>
      </div>
    ` : `<div class="empty">Stats populate after end-of-day data arrives.</div>`}

    <hr class="section-rule">
    <div class="eyebrow">Market Snapshot Trend</div>
    <div class="chart-metric-btns" id="metricBtns">
      <button class="chart-btn active" data-metric="crude_oil">Crude Oil</button>
      <button class="chart-btn" data-metric="sp500">S&amp;P 500</button>
      <button class="chart-btn" data-metric="gold">Gold</button>
      <button class="chart-btn" data-metric="usd_inr">USD/INR</button>
      <button class="chart-btn" data-metric="gift_nifty">GIFT Nifty</button>
      <button class="chart-btn" data-metric="fii">FII Flow</button>
    </div>
    <div id="chart-snapshot-trend" class="chart-box"></div>

    <hr class="section-rule">
    <div class="eyebrow">Daily Avg Pick Return (%)</div>
    <div id="chart-picks-perf" class="chart-box"></div>

    <hr class="section-rule">
    <div class="eyebrow">Sector Outlook Tracker</div>
    <div id="sector-heatmap" class="sector-heatmap-wrap"></div>

    <hr class="section-rule">
    <div class="eyebrow">Sector Correlation</div>
    <div id="sector-correlation" class="sector-correlation-wrap"></div>
  `;
}

// ── Component Renderers ───────────────────────────────────────

function renderMoodBanner(mood) {
  const labels = {
    BULLISH:  'Overall mood is bullish — positive macro cues across the board.',
    BEARISH:  'Overall mood is bearish — expect selling pressure today.',
    CAUTIOUS: 'Mood is cautious — trade smaller, respect key levels.',
    NEUTRAL:  'No strong directional bias — wait for intraday confirmation.',
  };
  return `
    <div class="mood-banner ${mood || 'NEUTRAL'}">
      <span class="mood-label">${labels[mood] || mood}</span>
      <span class="mood-chip ${mood || 'NEUTRAL'}">${mood || 'NEUTRAL'}</span>
    </div>
  `;
}

function renderFIIBanner(fii) {
  if (!fii) return '';
  const dir = fii.direction || (fii.net_cr >= 0 ? 'buying' : 'selling');
  const amt = fii.net_cr != null ? `₹${Math.abs(fii.net_cr).toLocaleString('en-IN')} Cr` : '';
  const label = dir === 'buying' ? `Net Buyers ${amt}` : `Net Sellers ${amt}`;
  return `
    <div class="fii-row">
      <span class="fii-label">FII / DII Activity — previous session</span>
      <span class="fii-value ${dir}">${label}</span>
    </div>
  `;
}

// India VIX: a RISING value is bad news (more expected volatility), not good — the
// generic "up = green" convention every other snapshot card uses would be actively
// misleading here. Color by regime instead, which is already classified server-side
// (morning-agent-prompt.md "Volatility Regime"), not re-derived from the change sign.
const VIX_REGIME_CLASS = { LOW: 'flat', NORMAL: 'flat', ELEVATED: 'down', EXTREME: 'down' };

function renderSnapshot(snap) {
  if (!snap) return '';
  const items = [
    { label: 'GIFT Nifty', val: snap.gift_nifty, fmt: v => v.toLocaleString('en-IN'), unit: '' },
    { label: 'S&P 500',    val: snap.sp500,       fmt: v => v.toLocaleString('en-IN'), unit: '' },
    { label: 'Crude Oil',  val: snap.crude_oil,   fmt: v => '$' + v.toFixed(1),        unit: '/bbl' },
    { label: 'USD / INR',  val: snap.usd_inr,     fmt: v => '₹' + v.toFixed(2),        unit: '' },
    { label: 'Gold',       val: snap.gold,         fmt: v => '$' + v.toLocaleString(),  unit: '/oz' },
    { label: 'India VIX',  val: snap.india_vix,    fmt: v => v.toFixed(1),             unit: '', isVix: true },
  ];
  return `
    <div class="snapshot-grid">
      ${items.map(i => {
        if (!i.val) return '';
        const chg = i.val.change_pct;
        const cls   = i.isVix
          ? (VIX_REGIME_CLASS[i.val.regime] || 'flat')
          : (chg > 0.05 ? 'up' : chg < -0.05 ? 'down' : 'flat');
        const arrow = chg > 0.05 ? '+' : chg < -0.05 ? '−' : '';
        const sub = i.isVix && i.val.regime && i.val.regime !== 'NORMAL'
          ? `<div class="snap-regime ${cls}">${i.val.regime}</div>` : '';
        return `
          <div class="snap-card">
            <div class="snap-label">${i.label}</div>
            <div class="snap-value">${i.val.value != null ? i.fmt(i.val.value) + i.unit : '—'}</div>
            <div class="snap-change ${cls}">${arrow}${chg != null ? Math.abs(chg).toFixed(2) + '%' : ''}</div>
            ${sub}
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function renderNewsList(news) {
  if (!news?.length) return '<div class="empty">No news data available.</div>';
  const sentimentLabel = { bullish: 'Bullish', bearish: 'Bearish', neutral: 'Neutral' };
  return `
    <div class="news-list">
      ${news.map(n => `
        <div class="news-card ${n.sentiment || 'neutral'}">
          <div class="news-sentiment-bar"></div>
          <div class="news-content">
            <div class="news-eyebrow">${sentimentLabel[n.sentiment] || 'News'}</div>
            <div class="news-headline">${n.headline}</div>
            <div class="news-stocks">
              ${(n.affected_stocks || []).map(s =>
                `<span class="stock-chip ${n.sentiment || 'neutral'}">${s}</span>`
              ).join('')}
            </div>
            <div class="expand-hint">Read analysis</div>
            <div class="news-body">
              ${n.what_happened ? `
                <div class="news-row">
                  <div class="news-row-label">What happened</div>
                  <div class="news-row-text">${n.what_happened}</div>
                </div>` : ''}
              ${n.why_it_matters ? `
                <div class="news-row">
                  <div class="news-row-label">Why it matters</div>
                  <div class="news-row-text">${n.why_it_matters}</div>
                </div>` : ''}
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function renderSectors(sectors) {
  if (!sectors?.length) return '<div class="empty">No sector data.</div>';
  return `
    <div class="sector-grid">
      ${sectors.map(s => `
        <div class="sector-card">
          <div class="sector-info">
            <div class="sector-name">${s.sector}</div>
            ${s.reason ? `<div class="sector-reason">${s.reason}</div>` : ''}
          </div>
          <span class="sector-badge ${s.outlook}">${s.outlook}</span>
        </div>
      `).join('')}
    </div>
  `;
}

function renderPicks(picks) {
  if (!picks?.length) return '<div class="empty">No picks for this day.</div>';
  return `
    <div class="picks-list">
      ${picks.map((p, i) => {
        const actual  = p.actual_pct_change;
        const pending = actual == null;
        const outcome = pending ? 'pending' : (p.hit_target ? 'win' : 'loss');
        const actCls  = pending ? 'pending' : actual >= 0 ? 'positive' : 'negative';
        const actStr  = pending ? 'Pending' : (actual >= 0 ? '+' : '') + actual.toFixed(2) + '%';
        const outcomeText = pending
          ? 'Awaiting market close'
          : (p.hit_target
              ? `Target reached — actual ${actStr}`
              : `Target missed — actual ${actStr}`);
        return `
          <div class="pick-card">
            <div class="pick-header">
              <div class="pick-symbol-block">
                <div class="pick-rank">Pick ${i + 1}</div>
                <div class="pick-symbol">${p.symbol}</div>
              </div>
              <div class="pick-catalyst">${p.catalyst || ''}</div>
              <div class="pick-targets-block">
                <div class="pick-target-row">
                  <span class="pick-target-label">Target</span>
                  <span class="pick-target-val predicted">+${p.target_pct != null ? p.target_pct.toFixed(1) : '?'}%</span>
                </div>
                <div class="pick-target-row">
                  <span class="pick-target-label">Actual</span>
                  <span class="pick-target-val ${actCls}">${actStr}</span>
                </div>
              </div>
            </div>
            <div class="pick-data">
              <div class="pick-data-cell">
                <div class="pick-data-label">Watch Zone</div>
                <div class="pick-data-val">${p.watch_zone ? '₹' + p.watch_zone.low + '–' + p.watch_zone.high : '—'}</div>
              </div>
              <div class="pick-data-cell">
                <div class="pick-data-label">Stop Loss</div>
                <div class="pick-data-val danger">${p.stop_loss ? '₹' + p.stop_loss : '—'}</div>
              </div>
              <div class="pick-data-cell">
                <div class="pick-data-label">NSE Open</div>
                <div class="pick-data-val">${p.actual_open ? '₹' + p.actual_open : '—'}</div>
              </div>
            </div>
            ${p.logic ? `<div class="pick-logic">${p.logic}</div>` : ''}
            <div class="pick-outcome ${outcome}">${outcomeText}</div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function renderRisks(risks) {
  return `
    <div class="risks-list">
      ${risks.map(r => `<div class="risk-item">${r}</div>`).join('')}
    </div>
  `;
}

// ── Charts ────────────────────────────────────────────────────
let _activeMetric = 'crude_oil';

const METRICS = {
  crude_oil:  { label: 'Crude Oil',  color: '#f59e0b', fmt: v => '$' + v.toFixed(2),              get: b => b.snapshot?.crude_oil?.value },
  sp500:      { label: 'S&P 500',    color: '#3b82f6', fmt: v => v.toLocaleString('en-US'),        get: b => b.snapshot?.sp500?.value },
  gold:       { label: 'Gold',       color: '#a855f7', fmt: v => '$' + v.toLocaleString('en-US'),  get: b => b.snapshot?.gold?.value },
  usd_inr:    { label: 'USD/INR',    color: '#06b6d4', fmt: v => '₹' + v.toFixed(2),               get: b => b.snapshot?.usd_inr?.value },
  gift_nifty: { label: 'GIFT Nifty', color: '#ec4899', fmt: v => v.toLocaleString('en-IN'),        get: b => b.snapshot?.gift_nifty?.value },
  // FII net flow is signed (buying vs selling), not a price level — a line chart would
  // misrepresent it as a trend to follow rather than a daily in/out flow. Rendered as a
  // zero-centered histogram instead, same convention as the existing daily-return chart below.
  fii: {
    label: 'FII Flow', isFlow: true,
    fmt: v => (v >= 0 ? '+₹' : '−₹') + Math.abs(v).toLocaleString('en-IN') + ' Cr',
    get: b => b.fii?.net_cr,
  },
};

function chartTheme() {
  const dark = document.documentElement.getAttribute('data-theme') === 'dark'
    || (!document.documentElement.getAttribute('data-theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
  return {
    bg:     dark ? '#111111' : '#ffffff',
    text:   dark ? '#8a8a8a' : '#757575',
    grid:   dark ? '#2c2c2c' : '#e0e0e0',
    border: dark ? '#2c2c2c' : '#e0e0e0',
    up:     dark ? '#22c55e' : '#0a6e3f',
    dn:     dark ? '#f87171' : '#b91c1c',
  };
}

function makeChart(id, height = 180) {
  const el = document.getElementById(id);
  if (!el || typeof LightweightCharts === 'undefined') return null;
  if (_charts[id]) { try { _charts[id].remove(); } catch(_) {} delete _charts[id]; }
  const t = chartTheme();
  const c = LightweightCharts.createChart(el, {
    autoSize: true,
    height,
    layout:          { background: { color: t.bg }, textColor: t.text, fontFamily: 'Inter, sans-serif', fontSize: 11 },
    grid:            { vertLines: { color: t.grid }, horzLines: { color: t.grid } },
    timeScale:       { borderColor: t.border, timeVisible: false },
    rightPriceScale: { borderColor: t.border },
    handleScroll:    false,
    handleScale:     false,
    crosshair:       { mode: LightweightCharts.CrosshairMode.Magnet },
  });
  _charts[id] = c;
  return c;
}

function renderSnapshotChart(metric) {
  const m = METRICS[metric] || METRICS.crude_oil;
  const t = chartTheme();
  const data = briefings
    .filter(b => m.get(b) != null)
    .map(b => ({ time: b.date, value: m.get(b) }))
    .sort((a, b) => a.time.localeCompare(b.time));

  const chart = makeChart('chart-snapshot-trend');
  if (!chart) return;
  if (!data.length) { chart.remove(); delete _charts['chart-snapshot-trend']; return; }

  if (m.isFlow) {
    const s = chart.addHistogramSeries({ priceFormat: { type: 'custom', formatter: m.fmt } });
    s.setData(data.map(d => ({ ...d, color: d.value >= 0 ? t.up : t.dn })));
  } else {
    const s = chart.addLineSeries({
      color: m.color,
      lineWidth: 2,
      crosshairMarkerVisible: true,
      lastValueVisible: true,
      priceFormat: { type: 'custom', formatter: m.fmt },
    });
    s.setData(data);
  }
  chart.timeScale().fitContent();
}

function renderCharts() {
  if (typeof LightweightCharts === 'undefined') return;
  const t = chartTheme();

  // ── Snapshot trend (selected metric) ──────────────────────
  renderSnapshotChart(_activeMetric);

  // Wire up metric selector buttons
  const btnsEl = document.getElementById('metricBtns');
  if (btnsEl) {
    btnsEl.querySelectorAll('.chart-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        btnsEl.querySelectorAll('.chart-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        _activeMetric = btn.dataset.metric;
        renderSnapshotChart(_activeMetric);
      });
    });
  }

  // ── Daily avg pick return ──────────────────────────────────
  const byDate = {};
  briefings.forEach(b => {
    const done = (b.picks || []).filter(p => p.actual_pct_change != null);
    if (done.length) byDate[b.date] = done.reduce((s, p) => s + p.actual_pct_change, 0) / done.length;
  });
  const perfData = Object.entries(byDate)
    .map(([time, value]) => ({ time, value, color: value >= 0 ? t.up : t.dn }))
    .sort((a, b) => a.time.localeCompare(b.time));

  const perfChart = makeChart('chart-picks-perf');
  if (perfChart && perfData.length) {
    const s = perfChart.addHistogramSeries({
      priceFormat: { type: 'custom', formatter: v => (v >= 0 ? '+' : '') + v.toFixed(2) + '%' },
    });
    s.setData(perfData);
    perfChart.timeScale().fitContent();
  }

  // ── Sector outcome heatmap (CSS, not LightweightCharts) ───
  renderSectorHeatmap();
  renderSectorCorrelation();
}

// Same mapping as the backtest's SYMBOL_SECTOR table in agents/strategy-agent-prompt.md
// STEP 1 — keep both in sync. If this drifts, the dashboard's win-rate column and the
// weekly review's own weights stop agreeing with each other, which is worse than either
// being wrong alone.
const SYMBOL_SECTOR = {
  INDIGO: 'Airlines', SPICEJET: 'Airlines',
  ASIANPAINT: 'Paints', BERGEPAINT: 'Paints', KANSAINER: 'Paints', AKZONOBEL: 'Paints',
  MRF: 'Tyres', APOLLOTYRE: 'Tyres', CEATLTD: 'Tyres', BALKRISIND: 'Tyres',
  MARUTI: 'Auto OEM', TATAMOTORS: 'Auto OEM', 'M&M': 'Auto OEM', 'BAJAJ-AUTO': 'Auto OEM', HEROMOTOCO: 'Auto OEM',
  DELHIVERY: 'Logistics', BLUEDART: 'Logistics', CONCOR: 'Logistics',
  PIDILITIND: 'Chemicals', TATACHEMICALS: 'Chemicals',
  HINDUNILVR: 'FMCG', ITC: 'FMCG', MARICO: 'FMCG', DABUR: 'FMCG', NESTLEIND: 'FMCG', BRITANNIA: 'FMCG', EMAMILTD: 'FMCG',
  SUPREMEIND: 'Plastics/Packaging', ASTRAL: 'Plastics/Packaging', NILKAMAL: 'Plastics/Packaging',
  HPCL: 'OMC', BPCL: 'OMC', IOC: 'OMC',
  ONGC: 'Upstream Oil', OIL: 'Upstream Oil',
  GAIL: 'Gas', IGL: 'Gas', MGL: 'Gas',
  TCS: 'IT Services', INFY: 'IT Services', WIPRO: 'IT Services', HCLTECH: 'IT Services',
  TECHM: 'IT Services', MPHASIS: 'IT Services', COFORGE: 'IT Services', LTTS: 'IT Services', PERSISTENT: 'IT Services',
  SUNPHARMA: 'Pharma', DRREDDY: 'Pharma', CIPLA: 'Pharma', DIVISLAB: 'Pharma',
  AUROPHARMA: 'Pharma', LUPIN: 'Pharma', BIOCON: 'Pharma',
  TATASTEEL: 'Metals', HINDALCO: 'Metals', VEDL: 'Metals', JSWSTEEL: 'Metals',
  SAIL: 'Metals', JINDALSTEL: 'Metals', NATIONALUM: 'Metals', HINDCOPPER: 'Metals',
  PAGEIND: 'Textiles', WELSPUNLIV: 'Textiles', RAYMOND: 'Textiles',
  MUTHOOTFIN: 'Gold-linked', TITAN: 'Gold-linked', MANAPPURAM: 'Gold-linked',
  HDFCBANK: 'Private Banks', ICICIBANK: 'Private Banks', AXISBANK: 'Private Banks',
  KOTAKBANK: 'Private Banks', INDUSINDBK: 'Private Banks', FEDERALBNK: 'Private Banks',
  SBIN: 'PSU Banks', BANKBARODA: 'PSU Banks', CANARABANK: 'PSU Banks',
  BAJFINANCE: 'NBFCs', BAJAJFINSV: 'NBFCs', LTFH: 'NBFCs', AAVAS: 'NBFCs', HOMEFIRST: 'NBFCs',
  LICHSGFIN: 'Housing Finance', PNBHOUSING: 'Housing Finance', CANFINHOME: 'Housing Finance',
  DLF: 'Real Estate', GODREJPROP: 'Real Estate', LODHA: 'Real Estate', PRESTIGE: 'Real Estate',
  BRIGADE: 'Real Estate', SUNTECK: 'Real Estate', SOBHA: 'Real Estate',
  VOLTAS: 'Consumer Durables', WHIRLPOOL: 'Consumer Durables', HAVELLS: 'Consumer Durables', POLYCAB: 'Consumer Durables',
  COALINDIA: 'Mining',
  'L&T': 'Capital Goods', SIEMENS: 'Capital Goods', ABB: 'Capital Goods', BHEL: 'Capital Goods',
  THERMAX: 'Capital Goods', CUMMINSIND: 'Capital Goods',
  IRCON: 'Infra', RITES: 'Infra', RVNL: 'Infra', KEC: 'Infra', KALPATPOWER: 'Infra',
  ULTRACEMCO: 'Cement', AMBUJACEM: 'Cement', ACCLTD: 'Cement', SHREECEM: 'Cement', DALMIACEM: 'Cement',
  POWERGRID: 'Power', NTPC: 'Power', TATAPOWER: 'Power', ADANIPOWER: 'Power', TORNTPOWER: 'Power',
  HAL: 'Defense', BEL: 'Defense', BEML: 'Defense', MIDHANI: 'Defense',
  MTAR: 'Defense', COCHINSHIP: 'Defense', MAZDOCK: 'Defense', GARDNRAERO: 'Defense',
  BHARTIARTL: 'Telecom', IDEA: 'Telecom', TATACOMM: 'Telecom',
  COROMANDEL: 'Fertilizer', NFL: 'Fertilizer', CHAMBERFL: 'Fertilizer', DEEPAKFERT: 'Fertilizer', GNFC: 'Fertilizer',
  ESCORTS: 'Farm Equipment', SONACOMS: 'Farm Equipment',
  BANDHANBNK: 'Rural/Small Finance Banks', UJJIVANSF: 'Rural/Small Finance Banks',
  TRENT: 'Retail', DMART: 'Retail', ABFRL: 'Retail', SHOPPERSSTOP: 'Retail',
  RELIANCE: 'Large Cap/Broad Market',
};

// sector_outlook[].sector is free text the morning agent writes fresh each day — NOT a
// controlled vocabulary. 76 days of real data produced 108 distinct strings for ~28 actual
// sectors ("OMC", "OMC (HPCL/BPCL/IOC)", "OMC/Upstream", "OMCs"... eleven OMC variants
// alone). Grouping on the raw string was the OTHER reason this panel was unmanageable —
// not just too many date columns, but dozens of near-duplicate near-empty rows. Tested
// against every one of the 108 real variants on record before shipping; 0 unmatched.
const SECTOR_ALIAS_RULES = [
  [/airlin/i, 'Airlines'],
  [/paint/i, 'Paints'],
  [/tyre|rubber/i, 'Tyres'],
  [/auto/i, 'Auto OEM'],
  [/logistic/i, 'Logistics'],
  [/jewell/i, 'Gold-linked'],
  [/gold/i, 'Gold-linked'],
  [/housing/i, 'Housing Finance'],
  [/\bpsu\b.*bank|bank.*\bpsu\b/i, 'PSU Banks'],
  [/private|\bpvt\b/i, 'Private Banks'],
  [/nbfc|hfc/i, 'NBFCs'],
  [/\bbank/i, 'Banking (Broad)'],  // generic/undifferentiated "Banking" calls — no stock-level track record exists for this bucket by design, see weightCell/trackCell
  [/chemical/i, 'Chemicals'],
  [/fmcg/i, 'FMCG'],
  [/fertiliz/i, 'Fertilizer'],
  [/it services|information tech/i, 'IT Services'],
  [/pharma/i, 'Pharma'],
  [/\bomcs?\b|oil market|downstream.*oil|refin/i, 'OMC'],
  [/upstream|\bong?c\b|e&p/i, 'Upstream Oil'],
  [/\bgas\b|city gas|\bcgd\b/i, 'Gas'],
  [/oil\s*&\s*gas|oil and gas/i, 'OMC'],
  [/metal|mining|steel/i, 'Metals'],
  [/textile|export/i, 'Textiles'],
  [/real estate/i, 'Real Estate'],
  [/infra|railway/i, 'Capital Goods/Infra'],
  [/capital goods/i, 'Capital Goods/Infra'],
  [/defen[cs]e/i, 'Defense'],
  [/telecom/i, 'Telecom'],
  [/exchange/i, 'Exchange Ecosystem'],
  [/tata group/i, 'Large Cap/Broad Market'],
  [/conglomerate|reliance/i, 'Large Cap/Broad Market'],
  [/midcap|smallcap/i, 'Broad Market'],
  [/broad market/i, 'Broad Market'],
];

// One raw string can cover several sectors ("Airlines / Paints / Tyres" is a single
// compound call) — split on common separators, classify each part independently, and
// return every sector that matched (deduped). An unrecognized fragment is silently
// dropped rather than crashing the render; see the rules above for coverage.
function normalizeSector(raw) {
  if (!raw) return [];
  const parts = raw.split(/\s*(?:\/|&|,| and )\s*/i);
  const out = new Set();
  for (const part of parts) {
    const p = part.trim();
    if (!p) continue;
    const hit = SECTOR_ALIAS_RULES.find(([re]) => re.test(p));
    if (hit) out.add(hit[1]);
  }
  return [...out];
}

const RECENT_DAYS = 10;  // was unbounded (every day ever) — 100+ columns is what made this panel "very long"

function renderSectorHeatmap() {
  const el = document.getElementById('sector-heatmap');
  if (!el) return;

  const allSectors = [...new Set(
    briefings.flatMap(b => (b.sector_outlook || []).flatMap(s => normalizeSector(s.sector)))
  )].sort();

  const dates = briefings.map(b => b.date).sort((a, b) => a.localeCompare(b));
  const recentDates = dates.slice(-RECENT_DAYS);

  if (!allSectors.length || !dates.length) {
    el.innerHTML = '<div class="empty">Sector data accumulates from daily briefings.</div>';
    return;
  }

  const lookup = {};
  briefings.forEach(b => {
    lookup[b.date] = {};
    (b.sector_outlook || []).forEach(s => {
      // A compound call ("Airlines/Paints/Tyres") registers the same outlook against
      // every sector it names.
      normalizeSector(s.sector).forEach(sector => { lookup[b.date][sector] = s.outlook; });
    });
  });

  // Track record: direction_correct across ALL history (not just the recent window — a
  // win-rate estimate wants every sample it can get), bucketed by sector via SYMBOL_SECTOR.
  // Same metric and same MIN_N=8 evidence gate as the weekly strategy review, so a sector
  // can't show "66% win rate" here while the backend still calls it "insufficient data."
  const MIN_N = 8;
  const track = {};
  briefings.forEach(b => {
    (b.picks || []).forEach(p => {
      // Derived fresh, same as the backend backtest (agents/strategy-agent-prompt.md) —
      // NOT read from the stored direction_correct field, which only exists on picks
      // scored after 2026-10-08. Deriving it here instead of trusting the field works on
      // every historical pick, pre- and post-, same as the backend already does.
      const actual = p.actual_pct_change, target = p.target_pct;
      if (actual == null || target == null || actual === 0 || target === 0) return;
      const directionCorrect = (actual > 0) === (target > 0);
      const sector = SYMBOL_SECTOR[(p.symbol || '').toUpperCase()];
      if (!sector) return;
      (track[sector] ??= { n: 0, hits: 0 });
      track[sector].n++;
      if (directionCorrect) track[sector].hits++;
    });
  });

  const shortDate = d => {
    const dt = new Date(d + 'T00:00:00');
    return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  const weightCell = sector => {
    const w = sectorWeights[sector];
    if (w == null || w === 1) return '<td class="hm-weight hm-weight-neutral">—</td>';
    const cls = w > 1 ? 'hm-weight-up' : 'hm-weight-dn';
    return `<td class="hm-weight ${cls}">${w.toFixed(2)}×</td>`;
  };

  const trackCell = sector => {
    const t = track[sector];
    if (!t || t.n < MIN_N) {
      return `<td class="hm-track hm-track-thin" title="${t ? t.n : 0} sample(s) — below the evidence floor (${MIN_N})">—</td>`;
    }
    const rate = Math.round(t.hits / t.n * 100);
    const cls = rate >= 60 ? 'hm-track-good' : rate < 40 ? 'hm-track-poor' : 'hm-track-mid';
    return `<td class="hm-track ${cls}" title="${t.hits}/${t.n} direction-correct calls">${rate}% <span class="hm-track-n">n=${t.n}</span></td>`;
  };

  el.innerHTML = `
    <div class="heatmap-table-wrap">
      <table class="heatmap-table">
        <thead>
          <tr>
            <th class="hm-sector-col">Sector</th>
            <th class="hm-weight-col" title="Confidence multiplier from the weekly strategy review (ARCHITECTURE.md §17). Only set once a sector clears the evidence bar.">Weight</th>
            <th class="hm-track-col" title="Direction-correct rate across this sector's full history. Needs 8+ samples before it's shown.">Track Record</th>
            ${recentDates.map(d => `<th class="hm-date-col">${shortDate(d)}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${[...allSectors].sort((a, b) => (track[b]?.n || 0) - (track[a]?.n || 0) || a.localeCompare(b)).map(sector => `
            <tr>
              <td class="hm-sector-name">${sector}</td>
              ${weightCell(sector)}
              ${trackCell(sector)}
              ${recentDates.map(d => {
                const outlook = lookup[d]?.[sector];
                if (!outlook) return `<td class="hm-cell hm-empty">—</td>`;
                const cls = outlook === 'BULLISH' ? 'hm-bull' : outlook === 'BEARISH' ? 'hm-bear' : 'hm-neut';
                return `<td class="hm-cell ${cls}" title="${sector} — ${d}: ${outlook}">${outlook[0]}</td>`;
              }).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    <p class="hm-footnote">Showing the last ${Math.min(RECENT_DAYS, dates.length)} of ${dates.length} trading days. Weight and Track Record both use the full history — Track Record is the raw rate, Weight only moves once that rate clears a statistical bar against the overall average, so a sector can show a real rate here while Weight still reads "—".</p>
  `;
}

// A pick-level diversification check: two sectors that get BULLISH/BEARISH calls on the
// same days, in the same direction, almost every time aren't two bets — they're one bet
// twice. MIN_PAIR_N is lower than the Track Record panel's MIN_N=8 (pairs co-occurring on
// the same day are rarer than single-sector calls), but still filters single-digit noise.
const MIN_PAIR_N = 6;

function computeSectorCorrelations() {
  const pairs = {};
  briefings.forEach(b => {
    const dayCalls = {};
    (b.sector_outlook || []).forEach(s => {
      if (s.outlook !== 'BULLISH' && s.outlook !== 'BEARISH') return;  // neutral isn't a directional move to agree/disagree on
      normalizeSector(s.sector).forEach(sector => { dayCalls[sector] = s.outlook; });
    });
    const sectors = Object.keys(dayCalls).sort();
    for (let i = 0; i < sectors.length; i++) {
      for (let j = i + 1; j < sectors.length; j++) {
        const key = `${sectors[i]}|${sectors[j]}`;
        const p = (pairs[key] ??= { a: sectors[i], b: sectors[j], agree: 0, n: 0 });
        p.n++;
        if (dayCalls[sectors[i]] === dayCalls[sectors[j]]) p.agree++;
      }
    }
  });

  const scored = Object.values(pairs)
    .filter(p => p.n >= MIN_PAIR_N)
    .map(p => ({ ...p, rate: p.agree / p.n }));

  return {
    together: [...scored].sort((x, y) => y.rate - x.rate || y.n - x.n).slice(0, 8),
    diverge:  [...scored].filter(p => p.rate < 0.5).sort((x, y) => x.rate - y.rate || y.n - x.n).slice(0, 5),
  };
}

function renderSectorCorrelation() {
  const el = document.getElementById('sector-correlation');
  if (!el) return;

  const { together, diverge } = computeSectorCorrelations();
  if (!together.length) {
    el.innerHTML = '<div class="empty">Not enough overlapping sector calls yet to measure correlation.</div>';
    return;
  }

  const row = p => `
    <tr>
      <td class="corr-pair">${p.a} <span class="corr-x">×</span> ${p.b}</td>
      <td class="corr-rate ${p.rate >= 0.75 ? 'hm-track-good' : p.rate < 0.5 ? 'hm-track-poor' : 'hm-track-mid'}">
        ${Math.round(p.rate * 100)}% <span class="hm-track-n">n=${p.n}</span>
      </td>
    </tr>`;

  el.innerHTML = `
    <div class="corr-cols">
      <div class="corr-col">
        <div class="corr-col-label">Move together — same bet, not diversification</div>
        <table class="corr-table"><tbody>${together.map(row).join('')}</tbody></table>
      </div>
      ${diverge.length ? `
        <div class="corr-col">
          <div class="corr-col-label">Often diverge — a real hedge pair</div>
          <table class="corr-table"><tbody>${diverge.map(row).join('')}</tbody></table>
        </div>
      ` : ''}
    </div>
    <p class="hm-footnote">Based on how often each sector pair's BULLISH/BEARISH calls agree on the same trading day, across full history (min ${MIN_PAIR_N} overlapping days). If two of today's picks come from a pair at the top of "move together," sizing both full isn't two positions — it's one position twice.</p>
  `;
}

// ── Toggle news expand ────────────────────────────────────────
function attachNewsToggle(root) {
  root.querySelectorAll('.news-card').forEach(card => {
    card.addEventListener('click', () => card.classList.toggle('expanded'));
  });
}

// ── Market Status ─────────────────────────────────────────────
function updateMarketStatus() {
  const el = document.getElementById('marketStatus');
  if (!el) return;
  const now  = new Date();
  const ist  = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const h    = ist.getHours();
  const m    = ist.getMinutes();
  const day  = ist.getDay();
  const mins = h * 60 + m;
  if (day === 0 || day === 6) {
    el.textContent = 'Closed'; el.className = 'market-badge closed'; return;
  }
  if (mins >= 9 * 60 + 15 && mins < 15 * 60 + 30) {
    el.textContent = 'Open'; el.className = 'market-badge open';
  } else if (mins >= 8 * 60 && mins < 9 * 60 + 15) {
    el.textContent = 'Pre-Market'; el.className = 'market-badge pre';
  } else {
    el.textContent = 'Closed'; el.className = 'market-badge closed';
  }
}

// ── Accuracy ──────────────────────────────────────────────────
function calcAccuracy(picks) {
  const done = (picks || []).filter(p => p.actual_pct_change != null);
  if (!done.length) return { text: '—', rate: null };
  const wins = done.filter(p => p.hit_target).length;
  const rate = Math.round(wins / done.length * 100);
  return { text: `${wins}/${done.length}`, rate };
}

function accColor(rate) {
  if (rate == null) return '';
  return 'win-rate ' + (rate >= 70 ? 'high' : rate >= 50 ? 'mid' : 'low');
}

// ── Helpers ───────────────────────────────────────────────────
function todayStr() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Kolkata' });
}

function fmtDate(d) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
  });
}

function fmtDateLong(d) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });
}

function fmtTime(d) {
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });
}

// ── Freshness ─────────────────────────────────────────────────
// Weekdays strictly after `dateStr`, up to and including today (IST).
// Weekday count only — no NSE holiday calendar. A 2-day holiday block warns one
// morning early. Bump STALE_WEEKDAYS if that ever gets annoying.
function weekdaysSince(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const today = new Date(todayStr() + 'T00:00:00');
  let n = 0;
  while (d < today) {
    d.setDate(d.getDate() + 1);
    const w = d.getDay();
    if (w !== 0 && w !== 6) n++;
  }
  return n;
}

// Reports DATA age, never wall-clock fetch time. The old code stamped
// 'Updated <now>' on a 37-day-old dataset, which is how a dead pipeline went
// unnoticed for five weeks.
function renderFreshness() {
  const stamp  = document.getElementById('lastRefresh');
  const banner = document.getElementById('staleBanner');
  if (!stamp || !banner) return;
  const newest = briefings[0]?.date;          // briefings is sorted desc

  if (!newest) {
    stamp.textContent  = 'No data';
    banner.textContent = '⚠ Could not load briefing data from GitHub.';
    banner.hidden = false;
    return;
  }
  const n = weekdaysSince(newest);
  stamp.textContent  = 'Data ' + fmtDate(newest);
  banner.textContent =
    `⚠ Newest briefing is ${fmtDate(newest)} — ${n} trading day${n === 1 ? '' : 's'} old. `
    + `The update pipeline may be down.`;
  banner.hidden = n < STALE_WEEKDAYS;
}
