// ── Config ──────────────────────────────────────────────────
const GITHUB_USER = 'gahlautabhinav';
const GITHUB_REPO = 'stock-intelligence';
const DATA_URL    = `https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/main/data/briefings.json`;
const REFRESH_MS  = 5 * 60 * 1000; // 5 minutes

// ── State ────────────────────────────────────────────────────
let briefings = [];

// ── Init ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  setupTabs();
  loadData();
  setInterval(loadData, REFRESH_MS);
  updateMarketStatus();
  setInterval(updateMarketStatus, 60_000);
});

// ── Data ─────────────────────────────────────────────────────
async function loadData() {
  try {
    const res = await fetch(DATA_URL + '?t=' + Date.now());
    briefings = await res.json();
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
}

// ── TODAY ────────────────────────────────────────────────────
function renderToday() {
  const el = document.getElementById('tab-today');
  const today = todayStr();
  const b = briefings.find(x => x.date === today) || briefings[0];

  if (!b) {
    el.innerHTML = `<div class="empty">No briefings yet. Morning agent will post at 8:00 AM IST.</div>`;
    return;
  }

  const isToday = b.date === today;
  el.innerHTML = `
    <p class="section-title">${isToday ? '📅 TODAY' : '📅 LATEST — ' + fmtDate(b.date)}</p>
    ${renderMoodBanner(b.overall_mood)}
    ${renderFIIBanner(b.fii)}
    ${renderSnapshot(b.snapshot)}
    <p class="section-title">📰 Key News & What It Means</p>
    ${renderNewsList(b.news)}
    <p class="section-title">🏭 Sector Outlook</p>
    ${renderSectors(b.sector_outlook)}
    <p class="section-title">🎯 Top Picks</p>
    ${renderPicks(b.picks)}
    ${b.risks?.length ? `<p class="section-title">⚠️ Risks to Watch</p>${renderRisks(b.risks)}` : ''}
    ${b.eod_summary ? `<p class="section-title">📊 End of Day</p><div class="eod-summary">${b.eod_summary}</div>` : ''}
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
    <p class="section-title">📜 All Briefings (${briefings.length} days)</p>
    <div class="history-list">
      ${briefings.map(renderHistoryRow).join('')}
    </div>
  `;

  el.querySelectorAll('.history-row').forEach(row => {
    row.addEventListener('click', () => row.classList.toggle('expanded'));
  });
}

function renderHistoryRow(b) {
  const acc     = calcAccuracy(b.picks);
  const preview = (b.picks || []).map(p => {
    const a = p.actual_pct_change;
    return a != null
      ? `${p.symbol} ${a >= 0 ? '+' : ''}${a.toFixed(1)}% ${p.hit_target ? '✅' : '❌'}`
      : `${p.symbol} (pending)`;
  }).join('  ·  ');

  return `
    <div class="history-row">
      <div class="history-row-header">
        <span class="history-date">${fmtDate(b.date)} <span style="color:var(--text3);font-size:11px">${b.day || ''}</span></span>
        <span class="history-mood-badge badge ${b.overall_mood}">${moodEmoji(b.overall_mood)} ${b.overall_mood}</span>
        <span class="history-picks-preview">${preview}</span>
        <span class="history-accuracy ${accColor(acc.rate)}">${acc.text}</span>
      </div>
      <div class="history-detail">
        ${renderSnapshot(b.snapshot)}
        <p class="section-title">News</p>${renderNewsList(b.news)}
        <p class="section-title">Picks</p>${renderPicks(b.picks)}
        ${b.eod_summary ? `<div class="eod-summary" style="margin-top:8px">${b.eod_summary}</div>` : ''}
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

  // per-stock stats
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
      return `
        <tr>
          <td><strong>${sym}</strong></td>
          <td>${s.total}</td>
          <td class="win-rate ${rate >= 70 ? 'high' : rate >= 50 ? 'mid' : 'low'}">${rate}%</td>
          <td style="color:${s.sum/s.total >= 0 ? 'var(--green)' : 'var(--red)'}">
            ${avg >= 0 ? '+' : ''}${avg}%
          </td>
        </tr>
      `;
    }).join('');

  el.innerHTML = `
    <p class="section-title">📈 Overall Performance</p>
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value" style="color:var(--accent)">${days}</div>
        <div class="stat-label">Days Tracked</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" style="color:${winRate >= 60 ? 'var(--green)' : winRate != null ? 'var(--red)' : 'var(--text3)'}">
          ${winRate != null ? winRate + '%' : '—'}
        </div>
        <div class="stat-label">Pick Accuracy</div>
        <div class="stat-sub">${wins}/${total} picks</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" style="color:${avgGain >= 0 ? 'var(--green)' : 'var(--red)'}">
          ${avgGain != null ? (avgGain >= 0 ? '+' : '') + avgGain.toFixed(1) + '%' : '—'}
        </div>
        <div class="stat-label">Avg Actual Move</div>
      </div>
    </div>

    ${stockRows ? `
      <p class="section-title">📊 Per-Stock Breakdown</p>
      <table class="stock-stats-table">
        <thead>
          <tr>
            <th>Stock</th>
            <th>Times Picked</th>
            <th>Win Rate</th>
            <th>Avg Move</th>
          </tr>
        </thead>
        <tbody>${stockRows}</tbody>
      </table>
    ` : `<div class="empty">Stats populate after end-of-day data starts coming in.</div>`}
  `;
}

// ── Component Renderers ───────────────────────────────────────

function renderMoodBanner(mood) {
  const icons = { BULLISH: '🟢', BEARISH: '🔴', CAUTIOUS: '🟡', NEUTRAL: '⚪' };
  const labels = {
    BULLISH: 'Overall mood is BULLISH — positive cues across the board',
    BEARISH: 'Overall mood is BEARISH — expect selling pressure',
    CAUTIOUS: 'Overall mood is CAUTIOUS — trade small, watch levels',
    NEUTRAL: 'Overall mood is NEUTRAL — no strong directional bias',
  };
  return `
    <div class="mood-banner ${mood || 'NEUTRAL'}">
      <span class="mood-label">${labels[mood] || mood}</span>
      <span class="mood-icon">${icons[mood] || '⚪'}</span>
    </div>
  `;
}

function renderFIIBanner(fii) {
  if (!fii) return '';
  const dir = fii.direction || (fii.net_cr >= 0 ? 'buying' : 'selling');
  const amt = fii.net_cr != null ? `₹${Math.abs(fii.net_cr).toLocaleString('en-IN')} Cr` : '';
  return `
    <div class="fii-banner">
      <span class="fii-label">FII/DII Activity (prev. session)</span>
      <span class="fii-value ${dir}">
        ${dir === 'buying' ? '🟢 Net Buyers' : '🔴 Net Sellers'} ${amt}
      </span>
    </div>
  `;
}

function renderSnapshot(snap) {
  if (!snap) return '';
  const items = [
    { label: 'GIFT Nifty',  val: snap.gift_nifty,  fmt: v => v.toLocaleString('en-IN'),  unit: '' },
    { label: 'S&P 500',     val: snap.sp500,        fmt: v => v.toLocaleString('en-IN'),  unit: '' },
    { label: 'Crude Oil',   val: snap.crude_oil,    fmt: v => '$' + v.toFixed(1),          unit: '/bbl' },
    { label: 'USD/INR',     val: snap.usd_inr,      fmt: v => '₹' + v.toFixed(2),          unit: '' },
    { label: 'Gold',        val: snap.gold,          fmt: v => '$' + v.toLocaleString(),    unit: '/oz' },
  ];
  return `
    <div class="snapshot-grid">
      ${items.map(i => {
        if (!i.val) return '';
        const chg = i.val.change_pct;
        const cls = chg > 0.05 ? 'up' : chg < -0.05 ? 'down' : 'flat';
        const arrow = chg > 0.05 ? '▲' : chg < -0.05 ? '▼' : '–';
        return `
          <div class="snap-card">
            <div class="snap-label">${i.label}</div>
            <div class="snap-value">${i.val.value != null ? i.fmt(i.val.value) + i.unit : '—'}</div>
            <div class="snap-change ${cls}">${arrow} ${chg != null ? Math.abs(chg).toFixed(2) + '%' : ''}</div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function renderNewsList(news) {
  if (!news?.length) return '<div class="empty">No news data.</div>';
  return `
    <div class="news-list">
      ${news.map(n => `
        <div class="news-card ${n.sentiment || 'neutral'}">
          <div class="news-headline">${n.headline}</div>
          <div class="news-stocks">
            ${(n.affected_stocks || []).map(s => `<span class="stock-chip ${n.sentiment || 'neutral'}">${s}</span>`).join('')}
          </div>
          <div class="expand-hint">Tap to see full analysis ▾</div>
          <div class="news-body">
            ${n.what_happened ? `<div class="news-row"><div class="news-row-label">What Happened</div><div class="news-row-text">${n.what_happened}</div></div>` : ''}
            ${n.why_it_matters ? `<div class="news-row"><div class="news-row-label">Why It Matters</div><div class="news-row-text">${n.why_it_matters}</div></div>` : ''}
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function renderSectors(sectors) {
  if (!sectors?.length) return '';
  const icons = { Airlines: '✈️', Paints: '🎨', Tyres: '🛞', IT: '💻', Banking: '🏦', Pharma: '💊', 'Real Estate': '🏗️', OMCs: '🛢️', FMCG: '🛒', Auto: '🚗', Metals: '⚙️', 'Large Caps': '📊' };
  return `
    <div class="sector-grid">
      ${sectors.map(s => `
        <div class="sector-card">
          <span class="sector-icon">${icons[s.sector] || '📌'}</span>
          <div>
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
        const actual   = p.actual_pct_change;
        const pending  = actual == null;
        const outcome  = pending ? 'pending' : (p.hit_target ? 'win' : 'loss');
        const actCls   = pending ? 'pending' : actual >= 0 ? 'positive' : 'negative';
        const actStr   = pending ? 'Pending' : (actual >= 0 ? '+' : '') + actual.toFixed(2) + '%';
        const outcomeLabel = pending ? 'Waiting for market close...' : (p.hit_target ? `✅ Target hit — actual ${actStr}` : `❌ Target missed — actual ${actStr}`);
        return `
          <div class="pick-card">
            <div class="pick-header">
              <span class="pick-rank">#${i+1}</span>
              <span class="pick-symbol">${p.symbol}</span>
              <span class="pick-catalyst">${p.catalyst || ''}</span>
              <div class="pick-targets">
                <div class="pick-target-col">
                  <span class="pick-target-label">Target</span>
                  <span class="pick-target-val predicted">+${p.target_pct != null ? p.target_pct.toFixed(1) : '?'}%</span>
                </div>
                <div class="pick-target-col">
                  <span class="pick-target-label">Actual</span>
                  <span class="pick-target-val actual ${actCls}">${actStr}</span>
                </div>
              </div>
            </div>
            <div class="pick-body">
              <div class="pick-field">
                <div class="pick-field-label">Watch Zone</div>
                <div class="pick-field-val">${p.watch_zone ? '₹' + p.watch_zone.low + ' – ' + p.watch_zone.high : '—'}</div>
              </div>
              <div class="pick-field">
                <div class="pick-field-label">Stop Loss</div>
                <div class="pick-field-val" style="color:var(--red)">₹${p.stop_loss || '—'}</div>
              </div>
              <div class="pick-field">
                <div class="pick-field-label">NSE Open</div>
                <div class="pick-field-val">${p.actual_open ? '₹' + p.actual_open : '—'}</div>
              </div>
            </div>
            ${p.logic ? `<div class="pick-logic">${p.logic}</div>` : ''}
            <div class="pick-outcome ${outcome}">${outcomeLabel}</div>
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
  const now = new Date();
  const ist = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const h = ist.getHours(), m = ist.getMinutes(), day = ist.getDay();
  const mins = h * 60 + m;
  if (day === 0 || day === 6) { el.textContent = 'Market Closed'; el.className = 'badge closed'; return; }
  if (mins >= 9*60+15 && mins < 15*60+30) { el.textContent = 'Market OPEN'; el.className = 'badge open'; }
  else if (mins >= 8*60 && mins < 9*60+15) { el.textContent = 'Pre-Market'; el.className = 'badge pre'; }
  else { el.textContent = 'Market Closed'; el.className = 'badge closed'; }
}

// ── Accuracy ──────────────────────────────────────────────────
function calcAccuracy(picks) {
  const done = (picks || []).filter(p => p.actual_pct_change != null);
  if (!done.length) return { text: '—', rate: null };
  const wins = done.filter(p => p.hit_target).length;
  const rate = Math.round(wins / done.length * 100);
  return { text: `${wins}/${done.length} ✓`, rate };
}

function accColor(rate) {
  if (rate == null) return '';
  return rate >= 70 ? 'win-rate high' : rate >= 50 ? 'win-rate mid' : 'win-rate low';
}

// ── Helpers ───────────────────────────────────────────────────
function todayStr() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Kolkata' });
}

function fmtDate(d) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtTime(d) {
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });
}

function moodEmoji(m) {
  return { BULLISH: '🟢', BEARISH: '🔴', CAUTIOUS: '🟡', NEUTRAL: '⚪' }[m] || '';
}
