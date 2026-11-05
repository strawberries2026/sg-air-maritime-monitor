/* SG Air & Maritime Monitor — additive monitoring intelligence (v2.1).
 * Browser: window.SGMonitorIntelligence; Node tests: require('./monitor-intelligence.js').
 * Pure functions: no network requests, scheduling changes, or personal data.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SGMonitorIntelligence = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const FRESHNESS_LIMIT_MS = 45 * 60 * 1000;
  function feedHealth(feed, nowMs = Date.now()) {
    const updated = feed && typeof feed.updatedAt === 'string' ? Date.parse(feed.updatedAt) : NaN;
    if (feed && feed.error) return { status: 'error', ageMinutes: null, reason: String(feed.error) };
    if (!Number.isFinite(updated)) return { status: 'unknown', ageMinutes: null, reason: 'Missing or invalid updatedAt' };
    const ageMs = nowMs - updated;
    if (ageMs < -2 * 60 * 1000) return { status: 'unknown', ageMinutes: null, reason: 'Timestamp is in the future' };
    const ageMinutes = Math.max(0, Math.floor(ageMs / 60000));
    return { status: ageMs > FRESHNESS_LIMIT_MS ? 'stale' : 'fresh', ageMinutes, reason: ageMs > FRESHNESS_LIMIT_MS ? 'Feed exceeds 45 minutes' : 'Within 45 minutes' };
  }
  function evaluateFeeds(aircraft, vessels, nowMs = Date.now()) {
    return { aircraft: feedHealth(aircraft, nowMs), vessels: feedHealth(vessels, nowMs) };
  }
  function trafficChange(current, baseline) {
    if (!Number.isFinite(current) || !Number.isFinite(baseline) || baseline < 0 || current < 0)
      return { percent: null, status: 'unknown' };
    if (baseline === 0) return { percent: null, status: current ? 'new-activity' : 'unchanged' };
    const percent = Math.round((current - baseline) / baseline * 100);
    return { percent, status: percent > 0 ? 'increase' : percent < 0 ? 'decrease' : 'unchanged' };
  }
  function alerts(health, currentCounts, baselineCounts) {
    const result = [];
    for (const kind of ['aircraft', 'vessels']) {
      const feed = health[kind];
      if (!feed) continue;
      if (feed.status === 'unknown') {
        result.push({ severity: 'warning', source: kind, message: 'Feed freshness cannot be verified' });
        continue;
      }
      if (feed.status === 'stale' || feed.status === 'error')
        result.push({ severity: 'warning', source: kind, message: feed.reason });
      // Coverage changes are advisory only; partial public feeds cannot prove traffic anomalies.
      if (feed.status !== 'fresh') continue;
      const change = trafficChange(currentCounts?.[kind], baselineCounts?.[kind]);
      if (change.percent !== null && change.percent <= -50 && baselineCounts[kind] >= 10)
        result.push({ severity: 'info', source: kind, message: 'Observed count dropped ' + Math.abs(change.percent) + '% versus baseline; check coverage before interpreting traffic' });
    }
    return result;
  }
  function situationSummary(health, counts, nowMs = Date.now()) {
    const timestamp = new Date(nowMs).toISOString();
    const count = (k) => Number.isFinite(counts?.[k]) ? String(counts[k]) : 'unavailable';
    const state = (k) => health?.[k]?.status || 'unknown';
    return ['SG Air & Maritime Monitor — ' + timestamp,
      'Aircraft observed: ' + count('aircraft') + ' (feed: ' + state('aircraft') + ')',
      'Vessels observed: ' + count('vessels') + ' (feed: ' + state('vessels') + ')',
      'Public AIS/ADS-B observations are incomplete; counts are not official movements or security surveillance.',
      'Workflow schedule status requires separately verified event=schedule history.'].join('\n');
  }
  return { FRESHNESS_LIMIT_MS, feedHealth, evaluateFeeds, trafficChange, alerts, situationSummary };
});
