/*
 * SG Air & Maritime Monitor
 * Copyright (c) 2026 Desmond Song. All rights reserved for original work.
 * Third-party libraries, data and resources retain their own licences and rights.
 * See COPYRIGHT.md.
 */
const map=L.map('map').setView([1.3521,103.8198],9);
const streetBasemap=L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'&copy; OpenStreetMap contributors',maxZoom:18});
streetBasemap.addTo(map);
// NASA GIBS daily true-colour Earth observation. Not live imagery or object detection.
(function setupSatelliteLayer(){
  const toggle=document.getElementById('satelliteToggle');
  const status=document.getElementById('satelliteStatus');
  if(!toggle||!status)return;
  const date=new Date(Date.now()-2*86400000).toISOString().slice(0,10);
  const url='https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/'+date+'/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg';
  const satellite=L.tileLayer(url,{attribution:'Imagery: NASA GIBS / MODIS Terra',maxNativeZoom:9,maxZoom:18,tileSize:256,opacity:1});
  let failed=false;
  satellite.on('tileerror',()=>{if(!failed){failed=true;status.textContent='Satellite tiles could not load for '+date+'. Try NASA Worldview for available imagery.';}});
  toggle.addEventListener('click',()=>{
    if(map.hasLayer(satellite)){
      map.removeLayer(satellite);streetBasemap.addTo(map);toggle.setAttribute('aria-pressed','false');toggle.textContent='🛰️ Show satellite imagery on map';status.textContent='Street map active. Satellite imagery has been turned off.';
    }else{
      failed=false;map.removeLayer(streetBasemap);satellite.addTo(map);toggle.setAttribute('aria-pressed','true');toggle.textContent='🗺️ Return to street map';status.textContent='Requesting NASA MODIS Terra imagery dated '+date+' (typically delayed; not live). Scroll to the map below to view.';
      document.getElementById('map')?.scrollIntoView({behavior:'smooth',block:'start'});
    }
  });
})();
// Weather forecast dashboard; never represents forecast as live satellite detection.
(function setupEnvironmentalMonitoring(){
  const ids={cloud:'envCloud',rain:'envRain',wind:'envWind',direction:'envDirection'};
  const status=document.getElementById('environmentStatus');
  const button=document.getElementById('environmentRefresh');
  if(!status||!button)return;
  const directionName=degrees=>['N','NE','E','SE','S','SW','W','NW'][Math.round(degrees/45)%8];
  async function refresh(){
    button.disabled=true;status.textContent='Retrieving Singapore-area weather forecast…';
    const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),12000);
    try{
      const url='https://api.open-meteo.com/v1/forecast?latitude=1.3521&longitude=103.8198&current=cloud_cover,precipitation,wind_speed_10m,wind_direction_10m&timezone=Asia%2FSingapore';
      const response=await fetch(url,{signal:controller.signal,cache:'no-store'});
      if(!response.ok)throw new Error('HTTP '+response.status);
      const data=await response.json();const v=data.current;
      if(!v||![v.cloud_cover,v.precipitation,v.wind_speed_10m,v.wind_direction_10m].every(Number.isFinite))throw new Error('Incomplete weather data');
      document.getElementById(ids.cloud).textContent=Math.round(v.cloud_cover)+'%';
      document.getElementById(ids.rain).textContent=v.precipitation.toFixed(1)+' mm';
      document.getElementById(ids.wind).textContent=Math.round(v.wind_speed_10m)+' km/h';
      document.getElementById(ids.direction).textContent=directionName(v.wind_direction_10m)+' ('+Math.round(v.wind_direction_10m)+'°)';
      // Simple public-information interpretations; NOT aviation or maritime safety thresholds.
      const cloud=v.cloud_cover>=85?'Overcast skies':v.cloud_cover>=55?'Mostly cloudy':v.cloud_cover>=25?'Partly cloudy':'Mostly clear skies';
      const rain=v.precipitation>=5?'Heavy precipitation indicated':v.precipitation>=1?'Rain indicated':v.precipitation>0?'Light precipitation indicated':'No precipitation indicated';
      const wind=v.wind_speed_10m>=40?'Strong winds indicated':v.wind_speed_10m>=20?'Breezy conditions':v.wind_speed_10m>=6?'Light winds':'Very light winds';
      const risk=v.precipitation>=5||v.wind_speed_10m>=40?'high':v.precipitation>=1||v.wind_speed_10m>=20?'medium':'low';
      const labels={low:'Green · No elevated conditions in selected forecast metrics',medium:'Amber · Review conditions and official advisories',high:'Red · Significant forecast conditions; consult official advisories'};
      const summary=document.getElementById('environmentSummary');
      summary.dataset.level=risk;
      document.getElementById('environmentHeadline').textContent=cloud+' · '+wind;
      document.getElementById('environmentInterpretation').textContent=rain+'. Wind from '+directionName(v.wind_direction_10m)+'. This summary covers forecast metrics only and does not assess flight or navigation safety.';
      document.getElementById('environmentSeverity').textContent=labels[risk]+' · Informational, not an official warning';
      const levels={cloud:v.cloud_cover>=85?'medium':'low',rain:v.precipitation>=5?'high':v.precipitation>=1?'medium':'low',wind:v.wind_speed_10m>=40?'high':v.wind_speed_10m>=20?'medium':'low',direction:'neutral'};
      Object.entries(levels).forEach(([key,level])=>{const card=document.getElementById('envCard'+key[0].toUpperCase()+key.slice(1));if(card)card.className='env-level-'+level;});
      status.textContent='Forecast valid '+v.time.replace('T',' ')+' SGT · Retrieved '+new Date().toLocaleTimeString('en-SG',{timeZone:'Asia/Singapore',hour:'2-digit',minute:'2-digit'})+' SGT · Open-Meteo';
    }catch(error){status.textContent='Weather unavailable ('+(error.name==='AbortError'?'request timed out':error.message)+'). Use the official weather links below.';}
    finally{clearTimeout(timer);button.disabled=false;}
  }
  button.addEventListener('click',refresh);refresh();
})();
// Fixed geographic landmark only — not a vessel, patrol or operational marker.
const pedraMarker=L.marker([1.330,104.407],{icon:L.divIcon({className:'pedra-branca-landmark',html:'<span style="display:inline-block;background:#fff;color:#a41326;border:1px solid #d71920;border-radius:5px;padding:3px 5px;white-space:nowrap;font-weight:700;font-size:10px;line-height:1.25;box-shadow:0 1px 4px #0005">🇸🇬 Pedra Branca</span>',iconSize:[100,25],iconAnchor:[50,25]}),zIndexOffset:1000}).bindPopup('<strong>🇸🇬 Pedra Branca — Republic of Singapore</strong><br>Coordinates: approx. 1.330° N, 104.407° E<br>Landmark: Horsburgh Lighthouse<br>The International Court of Justice ruled on 23 May 2008 that sovereignty over Pedra Branca belongs to Singapore.<br><a href="https://www.icj-cij.org/case/130" target="_blank" rel="noopener noreferrer">ICJ case and judgment ↗</a><br><small>Fixed geographic landmark, not a vessel or maritime boundary marker.</small>').addTo(map);
// Compact marker carries the permanent label; avoid a second overlapping tooltip.

// Static, Singapore-wide educational reference; never represents a vessel or patrol location.
const agencyReference=L.marker([1.3521,103.8198],{icon:L.divIcon({className:'agency-reference-marker',html:'ℹ',iconSize:[26,26]}),zIndexOffset:-1000}).bindPopup('<div class="compact-popup"><strong>🇸🇬 Singapore Security Forces Information</strong><span>🚔 Police Coast Guard · ⚓ Navy · ✈️ RSAF</span><span>Official public information only. This fixed Singapore-wide reference does not indicate a base, deployment, patrol or live position.</span><a href="#security-forces" data-force-panel="maritime">🚔⚓ Maritime information ↓</a><br><a href="#security-forces" data-force-panel="airforce">✈️ Air Force information ↓</a></div>').addTo(map);
document.addEventListener('click',event=>{const link=event.target.closest('[data-force-panel]');if(!link)return;event.preventDefault();const section=document.getElementById('security-forces');if(!section)return;const panels=section.querySelectorAll('details.force-details');const panel=link.dataset.forcePanel==='airforce'?panels[1]:panels[0];if(panel){panel.open=true;map.closePopup();requestAnimationFrame(()=>panel.scrollIntoView({behavior:'smooth',block:'start'}));}else{section.scrollIntoView({behavior:'smooth',block:'start'});}});

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
  const hint=airlineHint(x);const observationAge=Math.max(0,(Date.now()-Date.parse(x.reportedAt))/60000);const observationStatus=x.kind==='ship'?(observationAge>=45?'Historical observation — not live':observationAge>=15?'Delayed observation — not live':'Recent AIS observation — not guaranteed live'):'';
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
 el('recordCount').textContent='Showing '+visible.length+' of '+sorted.length+' observed records (not a complete traffic count)';
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
 const details=[...(x.kind==='ship'?[['Position status',Math.max(0,(Date.now()-Date.parse(x.reportedAt))/60000)>=45?'Historical — not live':Math.max(0,(Date.now()-Date.parse(x.reportedAt))/60000)>=15?'Delayed — not live':'Recent AIS report — not guaranteed live']]:[]),['Type',x.kind==='air'?'Aircraft':'Vessel'],[id,x.kind==='air'?(x.icao24||x.id):(x.mmsi||x.id)],['Classification',x.category||'unknown'],...(hint?[['Possible operator',hint+' (callsign prefix only; not verified)']]:[]),['Speed',x.speedKmh==null?'Unknown':Math.round(x.speedKmh)+' km/h'],['Heading',x.heading==null?'Unknown':Math.round(x.heading)+'°'],['Latitude',Number(x.lat).toFixed(5)],['Longitude',Number(x.lon).toFixed(5)],['Last position (SGT)',sgt(x.reportedAt)]];
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
 renderObservationTrends();renderMovementDashboard();renderMovementTrendChart();
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
 el('airFeedTime').textContent='✈ Aircraft: '+(a.updated?sgt(a.updated)+' SGT · '+ageLabel(a.updated):'No valid timestamp');
 el('shipFeedTime').textContent='🚢 Maritime: '+(s.updated?sgt(s.updated)+' SGT · '+ageLabel(s.updated):'No valid timestamp');
 el('feedDetail').textContent=['Aircraft snapshot: '+sgt(a.updated)+' ('+ageLabel(a.updated)+')','Vessel snapshot: '+sgt(s.updated)+' ('+ageLabel(s.updated)+')',a.error,s.error].filter(Boolean).join(' • ');
}
async function load(){
 el('refresh').disabled=true;
 try{
  const[a,s]=await Promise.all([get('data/aircraft.json','air'),get('data/vessels.json','ship')]);
  lastFeeds={a,s};air=a.rows;ships=s.rows;
  el('airCount').textContent=(a.error||!freshness(a.updated).ok)?'—':air.length;el('shipCount').textContent=(s.error||!freshness(s.updated).ok)?'—':ships.length;
  el('updated').textContent='Checked '+sgt(new Date().toISOString());const note=el('maritimeCoverageNotice');if(note)note.textContent='⚠ Partial AIS coverage: '+ships.length+' distinct vessel observation(s) within the past 90 minutes. These are sampled reports, NOT all vessels in Singapore waters. Positions may be delayed; tap a vessel to see its last report.';
  await loadHistory();updateHealth();render();
 }finally{el('refresh').disabled=false}
}

function syncMapModeButtons(){document.querySelectorAll('[data-map-mode]').forEach(button=>{button.setAttribute('aria-pressed',String(button.dataset.mapMode===el('mode').value));});}
document.querySelectorAll('[data-map-mode]').forEach(button=>button.addEventListener('click',()=>{el('mode').value=button.dataset.mapMode;recordLimit=12;render();syncMapModeButtons();}));
['mode','category','search'].forEach(id=>el(id).addEventListener(id==='search'?'input':'change',()=>{recordLimit=12;render();syncMapModeButtons()}));
el('recordSort').addEventListener('change',render);
el('showMoreRecords').addEventListener('click',()=>{recordLimit+=20;render()});
el('showLessRecords').addEventListener('click',()=>{recordLimit=12;render();el('recordCount').scrollIntoView({behavior:'smooth',block:'center'})});el('refresh').addEventListener('click',load);
const pedra=[1.330,104.407];
el('pedraBrancaButton').addEventListener('click',()=>{el('mode').value='ship';el('category').value='all';el('search').value='';recordLimit=12;render();syncMapModeButtons();map.invalidateSize();map.setView(pedra,13,{animate:false});pedraMarker.openPopup();const nearby=ships.filter(x=>map.distance([x.lat,x.lon],pedra)<=20000);const feed=lastFeeds?.s;el('pedraBrancaStatus').textContent=feed?.error?'Maritime feed error: '+feed.error:!feed||!freshness(feed.updated).ok?'Maritime snapshot is stale or unavailable; vessel locations cannot be verified.':nearby.length?nearby.length+' vessel report(s) within 20 km of Pedra Branca in the latest available AIS snapshot. Coverage is incomplete.':'No vessel reports within 20 km of Pedra Branca in the latest available AIS snapshot. This does not mean the area is empty.';el('map').scrollIntoView({behavior:'smooth',block:'start'});});
el('singaporeMapButton').addEventListener('click',()=>{map.setView([1.3521,103.8198],9);el('mode').value='all';render();syncMapModeButtons();el('pedraBrancaStatus').textContent='Singapore overview restored.';});
syncMapModeButtons();load();setInterval(load,60000);setInterval(updateHealth,30000);

// v1.4.0: optional flight number handoff to official airport information.
const flightInput=document.getElementById('flightNumber');
const flightCopy=document.getElementById('copyFlightNumber');
const flightStatus=document.getElementById('flightCopyStatus');
if(flightInput&&flightCopy&&flightStatus){
  flightInput.addEventListener('input',()=>{flightInput.value=flightInput.value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,9);flightStatus.textContent='';});
  flightCopy.addEventListener('click',async()=>{
    const number=flightInput.value.trim();
    if(!/^[A-Z0-9]{2,3}[0-9]{1,4}[A-Z]?$/.test(number)){flightStatus.textContent='Enter a valid-looking flight number (e.g. SQ318).';flightInput.focus();return;}
    try{await navigator.clipboard.writeText(number);flightStatus.textContent=number+' copied. Open the official arrivals or departures page and paste it into its search.';}
    catch(e){flightInput.select();flightStatus.textContent='Select Copy from your phone menu, then paste '+number+' into the official airport search.';}
  });
}

// v1.5.0: descriptive summary of partial, published history observations.
function renderObservationTrends(){
 const root=document.getElementById('observationTrends');if(!root)return;
 const days=new Map();
 for(const [key,samples] of Object.entries(historyTracks)){
   const kind=key.startsWith('air:')?'air':key.startsWith('ship:')?'ship':null;
   if(!kind||!Array.isArray(samples))continue;
   for(const sample of samples){
     const t=Date.parse(sample.at);if(!Number.isFinite(t))continue;
     const day=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Singapore',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(t));
     if(!days.has(day))days.set(day,{air:new Set(),ship:new Set()});
     days.get(day)[kind].add(key);
   }
 }
 const rows=[...days.entries()].sort((a,b)=>b[0].localeCompare(a[0]));
 if(!rows.length){root.textContent='No usable historical observations are currently available.';return;}
 root.replaceChildren();
 for(const [day,count] of rows){const row=document.createElement('div');row.className='observation-row';
 const date=document.createElement('strong');date.textContent=day+' SGT';
 const detail=document.createElement('span');detail.textContent='✈ '+count.air.size+' aircraft · 🚢 '+count.ship.size+' vessels';
 row.append(date,detail);root.append(row);}
}

// v1.6.0: truthful observed-identifier counts; do not infer airport movements from positions.
function renderMovementDashboard(){
 const now=Date.now(),cutoff=now-24*60*60*1000;
 for(const [kind,id,statusId] of [['air','movementAirObserved','movementAirStatus'],['ship','movementShipObserved','movementShipStatus']]){
  const keys=new Set();let observations=0;
  for(const [key,samples] of Object.entries(historyTracks)){
   if(!key.startsWith(kind+':')||!Array.isArray(samples))continue;
   if(samples.some(p=>{const t=Date.parse(p.at);return Number.isFinite(t)&&t>=cutoff&&t<=now+60000&&Number.isFinite(p.lat)&&Number.isFinite(p.lon)})){keys.add(key);observations++;}
  }
  const count=document.getElementById(id),status=document.getElementById(statusId);
  if(count)count.textContent=observations?String(keys.size):'—';
  if(status)status.textContent=observations?'Partial public-feed coverage · distinct identifiers, not total movements.':'Insufficient valid observations to report a 24-hour count.';
 }
}

// v1.6.1: historical observed-identifier counts, not airport or port movements.
function renderMovementTrendChart(){
 const root=document.getElementById('movementTrendChart');if(!root)return;
 const now=Date.now(),period=4*3600000,base=Math.floor(now/period)*period;
 const buckets=Array.from({length:6},(_,i)=>({start:base-(5-i)*period,air:new Set(),ship:new Set()}));
 for(const [key,samples] of Object.entries(historyTracks)){
  const kind=key.startsWith('air:')?'air':key.startsWith('ship:')?'ship':null;
  if(!kind||!Array.isArray(samples))continue;
  for(const p of samples){const t=Date.parse(p.at);if(!Number.isFinite(t)||t>now+60000||!Number.isFinite(p.lat)||!Number.isFinite(p.lon))continue;
   const b=buckets.find(b=>t>=b.start&&t<b.start+period);if(b)b[kind].add(key);
  }
 }
 const max=Math.max(1,...buckets.flatMap(b=>[b.air.size,b.ship.size]));
 if(!buckets.some(b=>b.air.size||b.ship.size)){root.textContent='Insufficient historical observations for a trend chart.';return;}
 root.replaceChildren();
 const legend=document.createElement('div');legend.className='movement-trend-legend';legend.textContent='✈ Aircraft observations   🚢 Vessel observations';root.append(legend);
 for(const b of buckets){const row=document.createElement('div');row.className='movement-trend-row';
  const label=document.createElement('span');label.textContent=new Date(b.start).toLocaleTimeString('en-SG',{timeZone:'Asia/Singapore',hour:'2-digit',minute:'2-digit',hour12:false});
  const bars=document.createElement('div');bars.className='movement-trend-bars';
  for(const [kind,count] of [['air',b.air.size],['ship',b.ship.size]]){const track=document.createElement('div');track.className='movement-trend-track';const fill=document.createElement('div');fill.className='movement-trend-fill '+kind;fill.style.width=(100*count/max)+'%';track.append(fill);bars.append(track);}
  const numbers=document.createElement('span');numbers.textContent=b.air.size+' / '+b.ship.size;
  row.append(label,bars,numbers);root.append(row);
 }
}

// v1.7.0: verified official airport link handoff, never fabricated flight statuses.
(function(){
 const airport=document.getElementById('flightAirport'),direction=document.getElementById('flightDirection');if(!airport||!direction)return;
 const urls={changi:{arrivals:'https://www.changiairport.com/en/fly/flight-information/arrivals.html',departures:'https://www.changiairport.com/en/fly/flight-information/departures.html'},seletar:{arrivals:'https://www.seletarairport.com/',departures:'https://www.seletarairport.com/'}};
 function update(){const a=airport.value,d=direction.value,name=a==='changi'?'Changi Airport':'Seletar Airport';document.getElementById('flightAirportLabel').textContent=name;document.getElementById('flightDirectionLabel').textContent=d==='arrivals'?'Arrivals':'Departures';const link=document.getElementById('flightOfficialLink');link.href=urls[a][d];link.textContent='Open official '+name+' '+d+' information ↗';document.getElementById('flightCentreStatus').textContent='Flight status and arrival/departure totals are not connected. '+(a==='seletar'?'The official Seletar website provides airport information; availability of individual flight details may vary.':'Check the official Changi flight information page for the latest published status.');}
 airport.addEventListener('change',update);direction.addEventListener('change',update);update();
})();
