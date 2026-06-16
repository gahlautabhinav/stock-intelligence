// ── Config ──────────────────────────────────────────────────
const GITHUB_USER = 'gahlautabhinav';
const GITHUB_REPO = 'stock-intelligence';
const DATA_URL    = `https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/main/data/briefings.json`;
const REFRESH_MS  = 5 * 60 * 1000;

// ── State ────────────────────────────────────────────────────
let briefings = [];
const _charts  = {};

// ── Init ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  setupTabs();
  setupTheme();
  loadData();
  setInterval(loadData, REFRESH_MS);
  updateMarketStatus();
  setInterval(updateMarketStatus, 60_000);
});

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
  try {
    const res = await fetch(DATA_URL + '?t=' + Date.now());
    const parsed = await res.json();
    briefings = Array.isArray(parsed) ? parsed : [parsed];
    briefings.sort((a, b) => new Date(b.date) - new Date(a.date));
    render();
    document.getElementById('lastRefresh').textContent = 'Updated ' + fmtTime(new Date());
  } catch (e) {
    console.error(e);
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
    });
  });
}

// ── Render ───────────────────────────────────────────────────
function render() {
  renderToday();
  renderHistory();
  renderStats();
  renderCharts();
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
      <table class="stock-stats-table">
        <thead><tr><th>Stock</th><th>Times Picked</th><th>Win Rate</th><th>Avg Move</th></tr></thead>
        <tbody>${stockRows}</tbody>
      </table>
    ` : `<div class="empty">Stats populate after end-of-day data arrives.</div>`}

    <hr class="section-rule">
    <div class="eyebrow">Market Snapshot Trend</div>
    <div class="chart-metric-btns" id="metricBtns">
      <button class="chart-btn active" data-metric="crude_oil">Crude Oil</button>
      <button class="chart-btn" data-metric="sp500">S&amp;P 500</button>
      <button class="chart-btn" data-metric="gold">Gold</button>
      <button class="chart-btn" data-metric="usd_inr">USD/INR</button>
      <button class="chart-btn" data-metric="gift_nifty">GIFT Nifty</button>
    </div>
    <div id="chart-snapshot-trend" class="chart-box"></div>

    <hr class="section-rule">
    <div class="eyebrow">Daily Avg Pick Return (%)</div>
    <div id="chart-picks-perf" class="chart-box"></div>

    <hr class="section-rule">
    <div class="eyebrow">Sector Outlook Tracker</div>
    <div id="sector-heatmap" class="sector-heatmap-wrap"></div>
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

function renderSnapshot(snap) {
  if (!snap) return '';
  const items = [
    { label: 'GIFT Nifty', val: snap.gift_nifty, fmt: v => v.toLocaleString('en-IN'), unit: '' },
    { label: 'S&P 500',    val: snap.sp500,       fmt: v => v.toLocaleString('en-IN'), unit: '' },
    { label: 'Crude Oil',  val: snap.crude_oil,   fmt: v => '$' + v.toFixed(1),        unit: '/bbl' },
    { label: 'USD / INR',  val: snap.usd_inr,     fmt: v => '₹' + v.toFixed(2),        unit: '' },
    { label: 'Gold',       val: snap.gold,         fmt: v => '$' + v.toLocaleString(),  unit: '/oz' },
  ];
  return `
    <div class="snapshot-grid">
      ${items.map(i => {
        if (!i.val) return '';
        const chg = i.val.change_pct;
        const cls   = chg > 0.05 ? 'up' : chg < -0.05 ? 'down' : 'flat';
        const arrow = chg > 0.05 ? '+' : chg < -0.05 ? '−' : '';
        return `
          <div class="snap-card">
            <div class="snap-label">${i.label}</div>
            <div class="snap-value">${i.val.value != null ? i.fmt(i.val.value) + i.unit : '—'}</div>
            <div class="snap-change ${cls}">${arrow}${chg != null ? Math.abs(chg).toFixed(2) + '%' : ''}</div>
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
  crude_oil:  { label: 'Crude Oil',  key: 'crude_oil',  color: '#f59e0b', fmt: v => '$' + v.toFixed(2) },
  sp500:      { label: 'S&P 500',    key: 'sp500',       color: '#3b82f6', fmt: v => v.toLocaleString('en-US') },
  gold:       { label: 'Gold',       key: 'gold',        color: '#a855f7', fmt: v => '$' + v.toLocaleString('en-US') },
  usd_inr:    { label: 'USD/INR',    key: 'usd_inr',     color: '#06b6d4', fmt: v => '₹' + v.toFixed(2) },
  gift_nifty: { label: 'GIFT Nifty', key: 'gift_nifty',  color: '#ec4899', fmt: v => v.toLocaleString('en-IN') },
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
  const data = briefings
    .filter(b => b.snapshot?.[m.key]?.value != null)
    .map(b => ({ time: b.date, value: b.snapshot[m.key].value }))
    .sort((a, b) => a.time.localeCompare(b.time));

  const chart = makeChart('chart-snapshot-trend');
  if (!chart) return;
  if (!data.length) { chart.remove(); delete _charts['chart-snapshot-trend']; return; }

  const s = chart.addLineSeries({
    color: m.color,
    lineWidth: 2,
    crosshairMarkerVisible: true,
    lastValueVisible: true,
    priceFormat: { type: 'custom', formatter: m.fmt },
  });
  s.setData(data);
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
}

function renderSectorHeatmap() {
  const el = document.getElementById('sector-heatmap');
  if (!el) return;

  // Collect all unique sectors across all briefings
  const allSectors = [...new Set(
    briefings.flatMap(b => (b.sector_outlook || []).map(s => s.sector))
  )].sort();

  const dates = briefings
    .map(b => b.date)
    .sort((a, b) => a.localeCompare(b));

  if (!allSectors.length || !dates.length) {
    el.innerHTML = '<div class="empty">Sector data accumulates from daily briefings.</div>';
    return;
  }

  // Build lookup: sectorOutlooks[date][sector] = outlook
  const lookup = {};
  briefings.forEach(b => {
    lookup[b.date] = {};
    (b.sector_outlook || []).forEach(s => { lookup[b.date][s.sector] = s.outlook; });
  });

  const shortDate = d => {
    const dt = new Date(d + 'T00:00:00');
    return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  el.innerHTML = `
    <div class="heatmap-table-wrap">
      <table class="heatmap-table">
        <thead>
          <tr>
            <th class="hm-sector-col">Sector</th>
            ${dates.map(d => `<th class="hm-date-col">${shortDate(d)}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${allSectors.map(sector => `
            <tr>
              <td class="hm-sector-name">${sector}</td>
              ${dates.map(d => {
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
