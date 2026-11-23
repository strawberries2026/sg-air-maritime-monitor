'use strict';
const fs=require('node:fs');
const assert=require('node:assert/strict');
const html=fs.readFileSync('preview/global-osint-view.html','utf8');
for(const id of ['world','singapore','pedra','reset','status','globe'])assert.match(html,new RegExp('id="'+id+'"'));
assert.match(html,/Cesium\.Viewer/);
assert.match(html,/OpenStreetMapImageryProvider/);
assert.match(html,/No live tracking feeds/);
assert.match(html,/Not for operational decision-making/);
assert.doesNotMatch(html,/navigator\.geolocation|OPENSKY_CLIENT_SECRET|AISSTREAM_API_KEY|api[_-]?key\s*=/i);
const fallback=fs.readFileSync('preview/global-osint-2d.html','utf8');
assert.match(fallback,/L\.map/);
assert.match(fallback,/Pedra Branca/);
for(const id of ['layer-sg','layer-pb'])assert.match(fallback,new RegExp('id="'+id+'"'));
assert.match(fallback,/aria-pressed/);
assert.match(fallback,/removeLayer/);
assert.match(fallback,/id="retry-tiles"/);
assert.match(fallback,/tileerror/);
assert.match(fallback,/tiles\.redraw/);
assert.match(fallback,/location\.protocol==='file:'/);
assert.match(fallback,/id="source-help"/);
assert.match(fallback,/id="diagnose-2d"/);
assert.match(fallback,/id="diagnostics-2d"/);
assert.match(fallback,/Map tile failures/);
assert.match(fallback,/Local-file browser restrictions/);
for(const id of ['air-feed','sea-feed','sat-feed','feed-status'])assert.match(fallback,new RegExp('id="'+id+'"'));
assert.match(fallback,/data\/aircraft\.json/);
assert.match(fallback,/data\/vessels\.json/);
assert.match(fallback,/No fabricated positions shown/);
assert.match(fallback,/Orbital elements are not geographic coordinates/);
assert.doesNotMatch(fallback,/navigator\.geolocation|AISSTREAM_API_KEY|OPENSKY_CLIENT_SECRET/i);
assert.match(html,/global-osint-2d\.html/);
assert.match(html,/id="fallback"/);
assert.match(html,/webglcontextlost/);
assert.match(html,/WebGL unsupported/);
console.log('SG Global OSINT 3D and 2D offline HTML smoke checks passed');

// Diagnostic handler must be registered before Leaflet availability is checked.
assert.ok(fallback.indexOf("getElementById('diagnose-2d').onclick") < fallback.indexOf("if(!window.L)"));

// 3D diagnostics must remain available even if Cesium fails to load.
assert.ok(html.indexOf('diagnoseButton.onclick=') < html.indexOf('if(!window.Cesium)'));
assert.match(html,/Cesium loaded:/);

assert.match(html,/Cesium\.Material\.fromType\('Color'/);
