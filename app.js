const map=L.map('map').setView([1.3521,103.8198],9);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'&copy; OpenStreetMap contributors',maxZoom:18}).addTo(map);
let air=[],ships=[];const layers=(L.markerClusterGroup?L.markerClusterGroup({maxClusterRadius:42,showCoverageOnHover:false,disableClusteringAtZoom:12}):L.layerGroup()).addTo(map),el=id=>document.getElementById(id);const markers=new Map();
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sgt=t=>t?new Date(t).toLocaleString('en-SG',{timeZone:'Asia/Singapore',hour12:false}):'Unknown';
const ageLabel=t=>{if(!t||!Number.isFinite(Date.parse(t)))return 'unknown age';const minutes=Math.max(0,Math.floor((Date.now()-Date.parse(t))/60000));return minutes<1?'less than 1 minute ago':minutes<60?minutes+' min ago':Math.floor(minutes/60)+' hr '+(minutes%60)+' min ago'};
const recent=t=>t&&Number.isFinite(Date.parse(t))&&Date.now()-Date.parse(t)<90*60000&&Date.parse(t)<=Date.now()+60000;
function render(){
 const mode=el('mode').value,category=el('category').value,q=el('search').value.toLowerCase().trim();
 const rows=[...(mode==='ship'?[]:air),...(mode==='air'?[]:ships)].filter(x=>(category==='all'||x.category===category)&&(!q||[x.id,x.name,x.callsign,x.icao24,x.mmsi].some(v=>String(v||'').toLowerCase().includes(q))));
 layers.clearLayers();markers.clear();
 for(const x of rows){
  const key=x.kind+':'+x.id;
  const marker=L.marker([x.lat,x.lon],{icon:L.divIcon({html:x.kind==='air'?'✈️':'🚢',className:'pin',iconSize:[30,30]})});
  marker.bindPopup('<strong>'+esc(x.name||x.id)+'</strong><br>Type: '+(x.kind==='air'?'Aircraft':'Vessel')+'<br>Classification: '+esc(x.category||'unknown')+'<br>Speed: '+(x.speedKmh==null?'Unknown':Math.round(x.speedKmh)+' km/h')+'<br>Heading: '+(x.heading==null?'Unknown':Math.round(x.heading)+'°')+'<br>Last report: '+esc(sgt(x.reportedAt)));
  marker.addTo(layers);markers.set(key,marker);
 }
 el('records').innerHTML=rows.length?rows.slice(0,500).map(x=>'<tr class="object-row" tabindex="0" role="button" data-key="'+esc(x.kind+':'+x.id)+'" aria-label="Locate '+esc(x.name||x.id)+' on map"><td data-label="Type">'+(x.kind==='air'?'✈ Aircraft':'🚢 Vessel')+'</td><td data-label="Identifier">'+esc(x.name||x.id)+'</td><td data-label="Classification">'+esc(x.category||'unknown')+'</td><td data-label="Speed">'+(x.speedKmh==null?'—':Math.round(x.speedKmh)+' km/h')+'</td><td data-label="Heading">'+(x.heading==null?'—':Math.round(x.heading)+'°')+'</td><td data-label="Last report (SGT)">'+esc(sgt(x.reportedAt))+'</td></tr>').join(''):'<tr><td colspan="6">No matching recent positions available.</td></tr>';
}
function focusObject(key){
 const marker=markers.get(key);if(!marker)return;
 map.setView(marker.getLatLng(),Math.max(map.getZoom(),12),{animate:true});
 if(layers.zoomToShowLayer)layers.zoomToShowLayer(marker,()=>marker.openPopup());else marker.openPopup();
 el('map').scrollIntoView({behavior:'smooth',block:'center'});
}
el('records').addEventListener('click',e=>{const row=e.target.closest('tr[data-key]');if(row)focusObject(row.dataset.key)});
el('records').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){const row=e.target.closest('tr[data-key]');if(row){e.preventDefault();focusObject(row.dataset.key)}}});

async function get(path,kind){try{const r=await fetch(path+'?t='+Date.now(),{cache:'no-store'});if(!r.ok)throw Error('HTTP '+r.status);const d=await r.json();if(d.error)throw Error(d.error);const rows=(d.items||[]).filter(x=>x.kind===kind&&recent(x.reportedAt)&&Number.isFinite(x.lat)&&Number.isFinite(x.lon));el(kind==='air'?'airStatus':'shipStatus').textContent=rows.length?'Available':'No recent positions';return{rows,updated:d.updatedAt,error:null}}catch(e){el(kind==='air'?'airStatus':'shipStatus').textContent='Unavailable';return{rows:[],updated:null,error:kind+': '+e.message}}}
async function load(){el('refresh').disabled=true;const[a,s]=await Promise.all([get('data/aircraft.json','air'),get('data/vessels.json','ship')]);air=a.rows;ships=s.rows;el('airCount').textContent=air.length;el('shipCount').textContent=ships.length;el('updated').textContent='Checked '+sgt(new Date().toISOString());el('feedDetail').textContent=['Aircraft snapshot: '+sgt(a.updated)+' ('+ageLabel(a.updated)+')','Vessel snapshot: '+sgt(s.updated)+' ('+ageLabel(s.updated)+')',a.error,s.error].filter(Boolean).join(' • ');render();el('refresh').disabled=false}
['mode','category','search'].forEach(id=>el(id).addEventListener(id==='search'?'input':'change',render));el('refresh').addEventListener('click',load);load();setInterval(load,60000);
