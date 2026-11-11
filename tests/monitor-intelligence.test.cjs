// Run: node --test tests/monitor-intelligence.test.cjs
const test = require('node:test');
const assert = require('node:assert/strict');
const m = require('../monitor-intelligence.js');
const now = Date.parse('2026-11-05T05:00:00Z');
const feed = (minutes, error = null) => ({updatedAt: new Date(now - minutes * 60000).toISOString(), error});
test('45-minute freshness boundary', () => {
 assert.equal(m.feedHealth(feed(44), now).status, 'fresh');
 assert.equal(m.feedHealth(feed(45), now).status, 'fresh');
 assert.equal(m.feedHealth(feed(46), now).status, 'stale');
});
test('missing timestamps and future timestamps are unknown', () => {
 assert.equal(m.feedHealth({}, now).status, 'unknown');
 assert.equal(m.feedHealth({updatedAt:'bad'}, now).status, 'unknown');
 assert.equal(m.feedHealth({updatedAt:new Date(now + 180000).toISOString()}, now).status, 'unknown');
});
test('feed errors take precedence over freshness', () => {
 assert.equal(m.feedHealth(feed(1, 'provider timeout'), now).status, 'error');
});
test('percentage changes handle zero baselines safely', () => {
 assert.equal(m.trafficChange(5, 0).status, 'new-activity');
 assert.equal(m.trafficChange(0, 0).status, 'unchanged');
 assert.equal(m.trafficChange(5, 10).percent, -50);
});
test('alerts are advisory and do not invent workflow outcomes', () => {
 const h = m.evaluateFeeds(feed(2), feed(50), now);
 const a = m.alerts(h, {aircraft:4, vessels:3}, {aircraft:20, vessels:20});
 assert.equal(a.length, 2);
 assert.equal(a[0].severity, 'info');
 assert.equal(a[1].severity, 'warning');
});
test('situation summary identifies partial coverage', () => {
 const s = m.situationSummary(m.evaluateFeeds(feed(2), feed(2), now), {aircraft:45, vessels:41}, now);
 assert.match(s, /Aircraft observed: 45/);
 assert.match(s, /not official movements/);
 assert.match(s, /event=schedule/);
});

test('provider error without timestamp is still an error', () => {
 assert.equal(m.feedHealth({error:'source offline'}, now).status, 'error');
});
test('unknown freshness creates a verification advisory', () => {
 const h = m.evaluateFeeds({}, feed(1), now);
 const a = m.alerts(h, {aircraft:0,vessels:1}, {});
 assert.equal(a.length, 1);
 assert.match(a[0].message, /cannot be verified/);
});

test('stale feed alerts are warnings, not proof of traffic change', () => {
 const h = m.evaluateFeeds(feed(50), feed(2), now);
 const notes = m.alerts(h, {aircraft:0,vessels:8}, {aircraft:30,vessels:8});
 assert.equal(notes.length, 1);
 assert.equal(notes[0].severity, 'warning');
 assert.equal(notes[0].source, 'aircraft');
});
test('no traffic baseline does not fabricate traffic alerts', () => {
 const h = m.evaluateFeeds(feed(2), feed(2), now);
 assert.deepEqual(m.alerts(h, {aircraft:5,vessels:7}, {}), []);
});
