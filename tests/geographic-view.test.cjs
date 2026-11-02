// Run: node --test tests/geographic-view.test.cjs
// Lightweight regression tests for the Singapore / Pedra Branca view rules.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('app.js','utf8');
const start=source.indexOf('let maritimeView=');
const end=source.indexOf('function render(){',start);
assert.ok(start>=0&&end>start,'Geographic view function must exist');
const snippet=source.slice(start,end);
const ctx={map:{distance:([a,b],[c,d])=>{
 const R=6371000,rad=Math.PI/180;
 const dLat=(c-a)*rad,dLon=(d-b)*rad;
 const h=Math.sin(dLat/2)**2+Math.cos(a*rad)*Math.cos(c*rad)*Math.sin(dLon/2)**2;
 return 2*R*Math.asin(Math.sqrt(h));
}}};
vm.createContext(ctx);
vm.runInContext(snippet+';globalThis.check=(row,view)=>{maritimeView=view;return inMaritimeView(row)}',ctx);
const ship=(lat,lon)=>({kind:'ship',lat,lon});
test('Singapore area includes Singapore port vicinity',()=>assert.equal(ctx.check(ship(1.27,103.82),'singapore'),true));
test('Singapore area excludes Pedra Branca',()=>assert.equal(ctx.check(ship(1.33,104.407),'singapore'),false));
test('Pedra Branca view includes island vicinity',()=>assert.equal(ctx.check(ship(1.33,104.407),'pedra'),true));
test('Pedra Branca view excludes Singapore port',()=>assert.equal(ctx.check(ship(1.27,103.82),'pedra'),false));
test('Pedra Branca view excludes aircraft',()=>assert.equal(ctx.check({kind:'air',lat:1.33,lon:104.407},'pedra'),false));
test('Singapore view preserves aircraft',()=>assert.equal(ctx.check({kind:'air',lat:1.33,lon:104.407},'singapore'),true));
test('Pedra Branca radius excludes locations beyond 20km',()=>assert.equal(ctx.check(ship(1.33,104.65),'pedra'),false));

// Guard the active map against presenting stale maritime snapshots as current.
test('render excludes vessels when maritime feed is stale',()=>{
 const renderStart=source.indexOf('function render(){');
 const renderEnd=source.indexOf('layers.clearLayers()',renderStart);
 assert.ok(renderStart>=0&&renderEnd>renderStart);
 const renderBody=source.slice(renderStart,renderEnd);
 assert.match(renderBody,/const maritimeFeedOk=lastFeeds\?\.s&&!lastFeeds\.s\.error&&freshness\(lastFeeds\.s\.updated\)\.ok/);
 assert.match(renderBody,/mode==='air'\|\|!maritimeFeedOk\?\[\]:ships/);
});
