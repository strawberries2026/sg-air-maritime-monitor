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
assert.match(html,/id="footer-fallback"/);
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

assert.match(html,/id="primitive"/);
assert.match(html,/EllipsoidGeometry/);
assert.match(html,/PerInstanceColorAppearance/);
assert.match(html,/independent sphere test:/);

// Same-page regional navigation: Android content URIs cannot reliably open sibling HTML files.
assert.match(html,/id="regional-map"/);
assert.match(html,/L\.map\(regionalContainer\)/);
assert.match(html,/getElementById\('singapore'\)\.onclick=\(\)=>showRegion\(points\.singapore,10\)/);
assert.match(html,/getElementById\('pedra'\)\.onclick=\(\)=>showRegion\(points\.pedra,12\)/);
assert.match(html,/getElementById\('world'\)\.onclick=showWorld/);
assert.match(html,/getElementById\('reset'\)\.onclick=showWorld/);
assert.match(html,/regionalMap\.invalidateSize\(\)/);
assert.match(html,/regionalMap\.closePopup\(\)/);
assert.doesNotMatch(html,/location\.href\s*=\s*['"]global-osint-2d\.html\?view=/);
console.log('Same-page regional navigation source checks passed');

assert.ok(html.indexOf("getElementById('singapore').onclick") < html.indexOf('if(!window.Cesium)'));
assert.doesNotMatch(html,/href="global-osint-2d\.html"/);
assert.match(html,/if\(!viewer\|\|!worldReady\)/);
assert.match(html,/worldReady=false;const recovered=showRegion\(selectedRegion,selectedZoom\)/);
assert.match(html,/if\(!globeContainer.hidden\)\{world\(\)/);
assert.match(html,/getElementById\('footer-fallback'\)\.onclick/);

assert.match(html,/id="retry-regional-tiles"/);
assert.match(html,/regionalTiles\.redraw\(\)/);
assert.match(html,/regionalTiles\.on\('tileerror'/);
assert.match(html,/regionalTiles\.on\('load'/);
assert.match(html,/selectedRegion=p;selectedZoom=zoom/);
assert.match(html,/showRecovery\('Earth texture unavailable:/);
assert.match(html,/2D recovery failed/);
assert.match(html,/regionalMap=null;regionalTiles=null/);

// Adaptive imagery retains the original level-zero fallback.
assert.match(html,/img=await loadTexture\(1\)/);
assert.match(html,/catch\(error\)\{img=await loadTexture\(0\)/);
assert.match(html,/navigator\.deviceMemory<=2/);
assert.match(html,/Math\.min\(2048,viewer\.scene\.context\.maximumTextureSize/);
assert.match(html,/width\*height>2097152/);
assert.match(html,/Inconsistent texture tile size/);
assert.match(html,/textureQuality='enhanced'/);

// Geographic texture assembly and mapping safeguards.
assert.match(html,/\(rows-1-y\)\*first\.height/);
assert.match(html,/EllipsoidGeometry\.createGeometry/);
assert.match(html,/ellipsoid\.cartesianToCartographic\(p\)/);
assert.match(html,/\(c\.longitude\+Math\.PI\)\/\(2\*Math\.PI\)/);
assert.match(html,/\(c\.latitude\+Math\.PI\/2\)\/Math\.PI/);
assert.match(html,/Math\.abs\(Math\.abs\(c\.longitude\)-Math\.PI\)/);
assert.match(html,/visual verification pending/);
