/*
 * SG Air & Maritime Monitor
 * Copyright (c) 2026 Desmond Song. All rights reserved for original work.
 * Third-party libraries, data and resources retain their own licences and rights.
 * See COPYRIGHT.md.
 */
const map=L.map('map').setView([1.3521,103.8198],9);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'&copy; OpenStreetMap contributors',maxZoom:18}).addTo(map);
let air=[],ships=[];const layers=(L.markerClusterGroup?L.markerClusterGroup({maxClusterRadius:42,showCoverageOnHover:false,disableClusteringAtZoom:12}):L.layerGroup()).addTo(map),el=id=>document.getElementById(id);const markers=new Map();let historyTracks={},selectedKey=null,trailVisible=true;const trailLayer=L.layerGroup().addTo(map);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sgt=t=>t?new Date(t).toLocaleString('en-SG',{timeZone:'Asia/Singapore',hour12:false}):'Unknown';
const ageLabel=t=>{if(!t||!Number.isFinite(Date.parse(t)))return 'unknown age';const minutes=Math.max(0,Math.floor((Date.now()-Date.parse(t))/60000));return minutes<1?'less than 1 minute ago':minutes<60?minutes+' min ago':Math.floor(minutes/60)+' hr '+(minutes%60)+' min ago'};
const airlineHints={SIA:'Singapore Airlines',SCO:'Scoot',TGW:'Scoot',AWQ:'Indonesia AirAsia',LNI:'Lion Air',JSA:'Jetstar Asia',MAS:'Malaysia Airlines',AXM:'AirAsia',CPA:'Cathay Pacific',QFA:'Qantas',UAE:'Emirates',QTR:'Qatar Airways',THA:'Thai Airways',BAW:'British Airways',KLM:'KLM',DLH:'Lufthansa'};
const airlineHint=x=>{if(x.kind!=='air')return null;const call=String(x.callsign||x.name||'').toUpperCase().trim();const prefix=call.slice(0,3);return /^[A-Z]{3}[0-9A-Z]+$/.test(call)&&airlineHints[prefix]?airlineHints[prefix]:null};
let recordLimit=12;
const recent=t=>t&&Number.isFinite(Date.parse(t))&&Date.now()-Date.parse(t)<90*60000&&Date.parse(t)<=Date.now()+60000;
function render(){
 const mode=el('mode').value,category=el('category').value,q=el('search').value.toLowerCase().trim();
 const rows=[...(mode==='ship'?[]:air),...(mode==='air'?[]:ships)].filter(x=>(category==='all'||x.category===category)&&(!q||[x.id,x.name,x.callsign,x.icao24,x.mmsi].some(v=>String(v||'').toLowerCase().includes(q))));
 layers.clearLayers();markers.clear();trailLayer.clearLayers();
 for(const x of rows){
  const key=x.kind+':'+x.id;
  const marker=L.marker([x.lat,x.lon],{icon:L.divIcon({html:x.kind==='air'?'✈️':'🚢',className:'pin',iconSize:[30,30]})});
  const hint=airlineHint(x);
  marker.bindPopup('<div class="compact-popup"><strong>'+esc(x.name||x.id)+'</strong><span>'+(x.kind==='air'?'✈ Aircraft':'🚢 Vessel')+(hint?' · '+esc(hint)+' (callsign match)':'')+'</span><span>'+ (x.speedKmh==null?'Speed unknown':Math.round(x.speedKmh)+' km/h')+' · '+(x.heading==null?'Heading unknown':Math.round(x.heading)+'°')+'</span><button type="button" class="popup-details" data-object="'+esc(key)+'">Full details &amp; trail ↓</button></div>',{maxWidth:235,minWidth:175,autoPanPadding:[12,12]});
  marker.on('click',()=>showDetails(x));marker.addTo(layers);markers.set(key,marker);
 }
 if(selectedKey){const selected=rows.find(x=>x.kind+':'+x.id===selectedKey);if(selected)showDetails(selected);else{selectedKey=null;el('objectDetails').hidden=true;}}
 const sorted=[...rows].sort((a,b)=>{
  const order=el('recordSort').value;
  if(order==='name')return String(a.name||a.id).localeCompare(String(b.name||b.id));
  if(order==='speed')return (Number(b.speedKmh)||0)-(Number(a.speedKmh)||0);
  return (Date.parse(b.reportedAt)||0)-(Date.parse(a.reportedAt)||0);
 });
 const visible=sorted.slice(0,recordLimit);
 el('recordCount').textContent='Showing '+visible.length+' of '+sorted.length+' records';
 el('showMoreRecords').hidden=visible.length>=sorted.length;
 el('showLessRecords').hidden=sorted.length<=12||recordLimit<=12;
 el('records').innerHTML=sorted.length?visible.map(x=>'<tr class="object-row" tabindex="0" role="button" data-key="'+esc(x.kind+':'+x.id)+'" aria-label="Locate '+esc(x.name||x.id)+' on map"><td data-label="Type">'+(x.kind==='air'?'✈ Aircraft':'🚢 Vessel')+'</td><td data-label="Identifier">'+esc(x.name||x.id)+'</td><td data-label="Classification">'+esc(x.category||'unknown')+(airlineHint(x)?'<small class="record-hint">Possible operator: '+esc(airlineHint(x))+' (callsign)</small>':'')+'</td><td data-label="Speed">'+(x.speedKmh==null?'—':Math.round(x.speedKmh)+' km/h')+'</td><td data-label="Heading">'+(x.heading==null?'—':Math.round(x.heading)+'°')+'</td><td data-label="Last report (SGT)">'+esc(sgt(x.reportedAt))+'<small class="record-age">'+esc(ageLabel(x.reportedAt))+'</small></td></tr>').join(''):'<tr><td colspan="6">No matching recent positions available.</td></tr>';
}
function focusObject(key){
 const marker=markers.get(key);if(!marker)return;
 const obj=[...air,...ships].find(x=>x.kind+':'+x.id===key);if(obj)showDetails(obj);
 map.setView(marker.getLatLng(),Math.max(map.getZoom(),12),{animate:true});
 if(layers.zoomToShowLayer)layers.zoomToShowLayer(marker,()=>marker.openPopup());else marker.openPopup();
 el('map').scrollIntoView({behavior:'smooth',block:'center'});
}
function showDetails(x){
 selectedKey=x.kind+':'+x.id;
 const id=x.kind==='air'?'ICAO24':'MMSI';
 const hint=airlineHint(x);
 const details=[['Type',x.kind==='air'?'Aircraft':'Vessel'],[id,x.kind==='air'?(x.icao24||x.id):(x.mmsi||x.id)],['Classification',x.category||'unknown'],...(hint?[['Possible operator',hint+' (callsign prefix only; not verified)']]:[]),['Speed',x.speedKmh==null?'Unknown':Math.round(x.speedKmh)+' km/h'],['Heading',x.heading==null?'Unknown':Math.round(x.heading)+'°'],['Latitude',Number(x.lat).toFixed(5)],['Longitude',Number(x.lon).toFixed(5)],['Last position (SGT)',sgt(x.reportedAt)]];
 el('detailTitle').textContent=(x.kind==='air'?'✈ ':'🚢 ')+(x.name||x.id);
 el('detailGrid').innerHTML=details.map(([k,v])=>'<div><small>'+esc(k)+'</small><strong>'+esc(v)+'</strong></div>').join('');
 el('objectDetails').hidden=false;
 trailLayer.clearLayers();
 const samples=(historyTracks[selectedKey]||[]).filter(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lon)&&Number.isFinite(Date.parse(p.at))).sort((a,b)=>Date.parse(a.at)-Date.parse(b.at));
 const points=samples.map(p=>[p.lat,p.lon]);
 const toggle=el('trailToggle');
 toggle.disabled=points.length<2;
 toggle.textContent=trailVisible?'Hide movement trail':'Show movement trail';
 toggle.setAttribute('aria-pressed',String(trailVisible));
 if(points.length>1&&trailVisible)L.polyline(points,{color:x.kind==='air'?'#48d0f5':'#ffcf70',weight:3,opacity:.85}).addTo(trailLayer);
 el('trailInfo').textContent=points.length>1?'Recorded positions: '+points.length+' • First: '+sgt(samples[0].at)+' SGT • Latest: '+sgt(samples[samples.length-1].at)+' SGT. Straight lines connect samples; actual route may differ.':points.length===1?'Recorded positions: 1 • '+sgt(samples[0].at)+' SGT. Another position is needed for a trail.':'No historical positions recorded for this object yet.';
}
async function loadHistory(){
 try{
  const r=await fetch('data/history.json?t='+Date.now(),{cache:'no-store'});
  if(!r.ok)throw Error('History not yet published');
  const d=await r.json();historyTracks=d.tracks&&typeof d.tracks==='object'?d.tracks:{};
 }catch(e){historyTracks={};}
}
el('trailToggle').addEventListener('click',()=>{trailVisible=!trailVisible;const obj=[...air,...ships].find(x=>x.kind+':'+x.id===selectedKey);if(obj)showDetails(obj);});
map.on('popupopen',e=>{const button=e.popup.getElement()?.querySelector('.popup-details');if(button)button.addEventListener('click',()=>{const obj=[...air,...ships].find(x=>x.kind+':'+x.id===button.dataset.object);if(obj){showDetails(obj);map.closePopup();el('objectDetails').scrollIntoView({behavior:'smooth',block:'start'});}})});
el('records').addEventListener('click',e=>{const row=e.target.closest('tr[data-key]');if(row)focusObject(row.dataset.key)});
el('records').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){const row=e.target.closest('tr[data-key]');if(row){e.preventDefault();focusObject(row.dataset.key)}}});

const freshness=updated=>{
 const age=Date.now()-Date.parse(updated||'');
 if(!Number.isFinite(age)||age< -60000)return{label:'Unknown',tone:'bad',ok:false};
 if(age<20*60000)return{label:'Current',tone:'good',ok:true};
 if(age<45*60000)return{label:'Delayed',tone:'warn',ok:true};
 return{label:'Stale',tone:'bad',ok:false};
};
function showFeed(kind,data){
 const id=kind==='air'?'airStatus':'shipStatus',state=freshness(data.updated);
 const label=data.error?'Error':state.label;
 el(id).textContent=label;el(id).className='small status '+(data.error?'bad':state.tone);
 el(id).title=data.error||('Snapshot '+sgt(data.updated)+'; '+ageLabel(data.updated));
}
async function get(path,kind){
 try{
  const r=await fetch(path+'?t='+Date.now(),{cache:'no-store'});if(!r.ok)throw Error('HTTP '+r.status);
  const d=await r.json();if(!Array.isArray(d.items))throw Error('Invalid snapshot data');
  const error=d.error?String(d.error):null;
  const rows=error?[]:d.items.filter(x=>x.kind===kind&&recent(x.reportedAt)&&Number.isFinite(x.lat)&&Number.isFinite(x.lon));
  return{rows,updated:d.updatedAt||null,error};
 }catch(e){return{rows:[],updated:null,error:kind+': '+e.message}}
}
let lastFeeds=null;
function updateHealth(){
 if(!lastFeeds)return;
 const {a,s}=lastFeeds;showFeed('air',a);showFeed('ship',s);
 const problems=[],delays=[];
 for(const [name,feed] of [['Aircraft',a],['Maritime',s]]){
  const state=freshness(feed.updated);
  if(feed.error)problems.push(name+' collection error: '+feed.error);
  else if(state.tone==='bad')problems.push(name+' snapshot '+state.label.toLowerCase()+' ('+ageLabel(feed.updated)+')');
  else if(state.tone==='warn')delays.push(name+' snapshot delayed ('+ageLabel(feed.updated)+')');
 }
 const box=el('healthAlert'),summary=el('healthSummary');
 const notices=[...problems,...delays];
 box.hidden=notices.length===0;
 box.className='health-alert '+(problems.length?'health-alert-critical':delays.length?'health-alert-delayed':'');
 box.textContent=problems.length?'⚠ Data warning: '+notices.join(' • '):delays.length?'⏱ Update pending: '+delays.join(' • '):'';
 if(problems.length){
  summary.textContent='Stale / error — '+problems.length+' feed(s) affected';
  summary.className='health-bad';
 }else if(delays.length){
  summary.textContent='Delayed — '+delays.length+' feed(s) waiting for a newer snapshot';
  summary.className='health-warn';
 }else{
  summary.textContent='Healthy — both feeds current';
  summary.className='health-good';
 }
 el('feedDetail').textContent=['Aircraft snapshot: '+sgt(a.updated)+' ('+ageLabel(a.updated)+')','Vessel snapshot: '+sgt(s.updated)+' ('+ageLabel(s.updated)+')',a.error,s.error].filter(Boolean).join(' • ');
}
async function load(){
 el('refresh').disabled=true;
 try{
  const[a,s]=await Promise.all([get('data/aircraft.json','air'),get('data/vessels.json','ship')]);
  lastFeeds={a,s};air=a.rows;ships=s.rows;
  el('airCount').textContent=air.length;el('shipCount').textContent=ships.length;
  el('updated').textContent='Checked '+sgt(new Date().toISOString());
  await loadHistory();updateHealth();render();
 }finally{el('refresh').disabled=false}
}

['mode','category','search'].forEach(id=>el(id).addEventListener(id==='search'?'input':'change',()=>{recordLimit=12;render()}));
el('recordSort').addEventListener('change',render);
el('showMoreRecords').addEventListener('click',()=>{recordLimit+=20;render()});
el('showLessRecords').addEventListener('click',()=>{recordLimit=12;render();el('recordCount').scrollIntoView({behavior:'smooth',block:'center'})});el('refresh').addEventListener('click',load);load();setInterval(load,60000);setInterval(updateHealth,30000);
