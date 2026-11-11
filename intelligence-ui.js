/* Optional v2.1 intelligence UI. Does not alter existing collectors or map. */
(function () {
  'use strict';
  const core = window.SGMonitorIntelligence;
  if (!core) return;
  const stats = document.querySelector('section.stats');
  if (!stats) return;
  const panel = document.createElement('section');
  panel.className = 'panel intelligence-panel';
  panel.id = 'intelligence-centre';
  panel.setAttribute('aria-labelledby', 'intelligence-heading');
  panel.innerHTML = '<div class="sectionhead"><h2 id="intelligence-heading">📡 Monitoring Intelligence</h2><span>v2.1 preview · public observations</span></div>' +
    '<div class="intelligence-grid"><article><small>✈ Aircraft feed</small><strong id="intel-air">Checking…</strong></article><article><small>🚢 Vessel feed</small><strong id="intel-ship">Checking…</strong></article><article><small>📊 Aircraft observed</small><strong id="intel-air-count">—</strong></article><article><small>📊 Vessels observed</small><strong id="intel-ship-count">—</strong></article></div>' +
    '<p id="intel-caveat" class="intelligence-note">Public data is partial. Workflow schedule status is not inferred from feed freshness.</p>' +
    '<details><summary>🗺️ Observation density and historical trends</summary><p class="intelligence-note">Relative concentration of available observation points, not total traffic or official movement statistics.</p><div class="intelligence-density" id="intel-density" role="img" aria-label="Observation density by geographic grid">Loading observations…</div><div id="intel-trends" class="intelligence-note">Loading history…</div></details>' +
    '<details><summary>🔔 Advisory alerts and situation summary</summary><div id="intel-alerts" role="status">Checking…</div><pre id="intel-summary" class="intelligence-summary"></pre><button type="button" id="intel-copy">Copy situation summary</button></details>';
  stats.insertAdjacentElement('afterend', panel);
  const $ = (id) => document.getElementById(id);
  const state = { aircraft: null, vessels: null, health: null };
  function render() {
    if (!state.aircraft || !state.vessels) return;
    const h = core.evaluateFeeds(state.aircraft, state.vessels);
    state.health = h;
    for (const [key, label, countId, data] of [['aircraft','intel-air','intel-air-count',state.aircraft],['vessels','intel-ship','intel-ship-count',state.vessels]]) {
      const info = h[key];
      $(label).textContent = info.status.toUpperCase() + (info.ageMinutes === null ? '' : ' · ' + info.ageMinutes + ' min');
      $(label).dataset.health = info.status;
      $(countId).textContent = Array.isArray(data.items) ? String(data.items.length) : '—';
    }
    const counts = { aircraft: state.aircraft.items?.length, vessels: state.vessels.items?.length };
    const notes = core.alerts(h, counts, {});
    $('intel-alerts').textContent = notes.length ? notes.map(n => n.source + ': ' + n.message).join(' | ') : 'No verified feed-health alert. Traffic anomaly baseline unavailable.';
    $('intel-summary').textContent = core.situationSummary(h, counts);
    drawDensity([...state.aircraft.items || [], ...state.vessels.items || []]);
  }
  function drawDensity(items) {
    // Coarse geographic grid: 102.8–105.5 E, 0.5–2.5 N. No third-party heatmap dependency.
    const bins = Array.from({length: 6}, () => Array(8).fill(0));
    let valid = 0;
    for (const p of items) {
      const lat = Number(p.lat), lon = Number(p.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < 0.5 || lat > 2.5 || lon < 102.8 || lon > 105.5) continue;
      const x = Math.min(7, Math.floor((lon - 102.8) / 2.7 * 8));
      const y = Math.min(5, Math.floor((2.5 - lat) / 2 * 6));
      bins[y][x]++; valid++;
    }
    const max = Math.max(1, ...bins.flat());
    const root = $('intel-density');
    root.replaceChildren();
    const grid = document.createElement('div'); grid.className = 'intelligence-heat-grid';
    for (const row of bins) for (const n of row) {
      const cell = document.createElement('span');
      cell.style.backgroundColor = 'rgba(30, 185, 235, ' + (n ? (0.16 + 0.78 * n / max).toFixed(2) : '0.04') + ')';
      cell.title = n + ' public observations'; cell.setAttribute('aria-label', n + ' observations');
      grid.append(cell);
    }
    root.append(grid);
    const label = document.createElement('small');
    label.textContent = valid + ' geolocated public observations · north at top · indicative grid only';
    root.append(label);
  }
  async function loadHistory() {
    try {
      const res = await fetch('./data/history.json?intelligence=' + Date.now(), {cache:'no-store'});
      if (!res.ok) throw new Error('History HTTP ' + res.status);
      const data = await res.json();
      const tracks = Object.values(data.tracks || {});
      const points = tracks.reduce((sum, track) => sum + (Array.isArray(track) ? track.length : 0), 0);
      $('intel-trends').textContent = tracks.length + ' identifiers and ' + points + ' timestamped track points in available history. These are observations, not verified trips.';
    } catch (_) { $('intel-trends').textContent = 'Historical observations currently unavailable.'; }
  }
  let refreshing = false;
  async function refresh() {
    if (refreshing) return;
    refreshing = true;
    try {
      const stamp = Date.now();
      const responses = await Promise.all(['aircraft','vessels'].map(k => fetch('./data/' + k + '.json?intelligence=' + stamp, {cache:'no-store'})));
      if (responses.some(r => !r.ok)) throw new Error('Snapshot request failed');
      [state.aircraft,state.vessels] = await Promise.all(responses.map(r => r.json()));
      render();
    } catch (_) {
      state.aircraft = null;
      state.vessels = null;
      state.health = null;
      for (const id of ['intel-air', 'intel-ship']) {
        $(id).textContent = 'Unavailable';
        $(id).dataset.health = 'unknown';
      }
      $('intel-air-count').textContent = '—';
      $('intel-ship-count').textContent = '—';
      $('intel-summary').textContent = 'Situation summary unavailable: published snapshots could not be verified.';
      $('intel-density').textContent = 'Observation density unavailable.';
      $('intel-alerts').textContent = 'Unable to verify published snapshots. Retry refresh.';
    } finally {
      refreshing = false;
    }
  }
  $('intel-copy').addEventListener('click', () => {
    const summary = $('intel-summary').textContent;
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(summary).then(() => { $('intel-copy').textContent = 'Copied'; setTimeout(() => { $('intel-copy').textContent = 'Copy situation summary'; }, 2000); }).catch(() => { $('intel-copy').textContent = 'Copy unavailable'; });
    else $('intel-copy').textContent = 'Copy unavailable';
  });
  document.getElementById('homeRefresh')?.addEventListener('click', () => { refresh(); loadHistory(); });
  refresh(); loadHistory();
  // Re-evaluate age locally even if upstream snapshots do not change.
  setInterval(() => {
    render();
    if (!document.hidden) refresh();
  }, 60 * 1000);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) { refresh(); loadHistory(); }
  });
})();
