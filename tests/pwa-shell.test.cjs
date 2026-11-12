const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync('index.html','utf8');
const worker = fs.readFileSync('sw.js','utf8');
test('freshness helper loads before application',()=>{
 const helper=html.indexOf('<script src="observation-freshness.js?v=2.0.1"></script>');
 const app=html.indexOf('<script src="app.js?v=2.0.0"></script>');
 assert.ok(helper>=0 && app>helper);
});
test('PWA shell caches every local versioned script referenced in HTML',()=>{
 const urls=[...html.matchAll(/<script src="(?!https?:)([^\"]+)"/g)].map(x=>x[1]);
 for(const url of urls) assert.ok(worker.includes("'./"+url+"'"),url+' absent from PWA shell');
});
test('service worker is valid JavaScript',()=>{new vm.Script(worker)});
test('service worker excludes snapshot data from cache',()=>{
 assert.match(worker,/url\.pathname\.includes\('\/data\/'\)/);
});
