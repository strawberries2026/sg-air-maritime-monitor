const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const app=fs.readFileSync('app.js','utf8');
const html=fs.readFileSync('index.html','utf8');
test('dashboard JS parses',()=>assert.doesNotThrow(()=>new vm.Script(app)));
test('maritime notice is present and accessible',()=>assert.match(html,/id="maritimeCoverageNotice"[^>]*role="status"/));
test('freshness summary uses complete snapshot before recent-position filtering',()=>{
 assert.match(app,/SGObservationFreshness\.summarize\(d\)/);
 assert.ok(app.indexOf('SGObservationFreshness.summarize(d)')>app.indexOf('d.items.filter('));
});
test('stale and unknown AIS counts appear in maritime coverage notice',()=>{
 assert.match(app,/age\.stale\+' of '\+age\.total/);
 assert.match(app,/age\.unknown\+' have unknown age/);
});
test('refresh does not invoke data collection',()=>{
 assert.match(app,/fetch\(path\+'\?t='\+Date\.now\(\),\{cache:'no-store'\}\)/);
});
