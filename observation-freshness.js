/* Read-only observation-age diagnostics; no collector or map side effects. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SGObservationFreshness = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  function timestamp(value) {
    if (typeof value !== 'string' || !/(Z|[+-]\d{2}:\d{2})$/i.test(value)) return NaN;
    return Date.parse(value);
  }
  function classify(record, snapshotTime, thresholdMinutes = 45) {
    const reference = timestamp(snapshotTime);
    const observed = timestamp(record && record.reportedAt);
    if (!Number.isFinite(reference) || !Number.isFinite(observed) || !Number.isFinite(thresholdMinutes) || thresholdMinutes <= 0) return { status: 'unknown', ageMinutes: null };
    const ageMinutes = (reference - observed) / 60000;
    if (ageMinutes < -5) return { status: 'unknown', ageMinutes: null };
    return { status: ageMinutes > thresholdMinutes ? 'stale' : 'current', ageMinutes: Math.max(0, ageMinutes) };
  }
  function summarize(snapshot, thresholdMinutes = 45) {
    const items = Array.isArray(snapshot && snapshot.items) ? snapshot.items : [];
    const counts = { current: 0, stale: 0, unknown: 0 };
    for (const item of items) counts[classify(item, snapshot && snapshot.updatedAt, thresholdMinutes).status]++;
    return { total: items.length, ...counts, thresholdMinutes, snapshotUpdatedAt: snapshot && snapshot.updatedAt || null, providerError: snapshot && snapshot.error || null };
  }
  return { classify, summarize };
});
