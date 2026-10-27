import asyncio,json,os,datetime,urllib.request,urllib.parse,urllib.error,pathlib
ROOT=pathlib.Path(__file__).resolve().parents[1]
NOW=lambda: datetime.datetime.now(datetime.timezone.utc).isoformat()
def save(name,items,error=None):
 p=ROOT/'data'/name;p.write_text(json.dumps({'updatedAt':NOW(),'items':items,'error':error},ensure_ascii=False,indent=2))
def update_history():
 """Keep up to 24 hours of bounded position samples; no synthetic tracks."""
 target=ROOT/'data'/'history.json'
 try: history=json.loads(target.read_text()) if target.exists() else {}
 except (ValueError,OSError): history={}
 now=datetime.datetime.now(datetime.timezone.utc)
 cutoff=now-datetime.timedelta(hours=24)
 tracks=history.get('tracks',{})
 for name in ('aircraft.json','vessels.json'):
  try:
   data=json.loads((ROOT/'data'/name).read_text())
   if data.get('error'): continue
   for row in data.get('items',[]):
    key=str(row.get('kind',''))+':'+str(row.get('id',''))
    stamp=row.get('reportedAt')
    if key in ('air:None','ship:None','air:','ship:') or not stamp or not isinstance(row.get('lat'),(int,float)) or not isinstance(row.get('lon'),(int,float)):continue
    tracks.setdefault(key,[]).append({'at':stamp,'lat':row['lat'],'lon':row['lon']})
  except (OSError,ValueError,TypeError): continue
 cleaned={}
 for key,points in tracks.items():
  valid=[]
  for pt in points:
   try:
    dt=datetime.datetime.fromisoformat(pt['at'].replace('Z','+00:00'))
    if cutoff<=dt<=now+datetime.timedelta(minutes=1):valid.append(pt)
   except (ValueError,KeyError,TypeError):continue
  if valid:
   dedup={pt['at']:pt for pt in valid}
   cleaned[key]=sorted(dedup.values(),key=lambda x:x['at'])[-96:]
 target.write_text(json.dumps({'updatedAt':NOW(),'tracks':cleaned},separators=(',',':')))
def request(url,data=None,headers=None):
 req=urllib.request.Request(url,data=data,headers=headers or {},method='POST' if data else 'GET')
 with urllib.request.urlopen(req,timeout=25) as r:return json.load(r)
def merge_vessel_observations(items, error=None):
 """Keep verified reports for at most 90 min; never extend observation timestamps."""
 target=ROOT/'data'/'vessels.json'
 if error:
  save('vessels.json',[],error);return
 now=datetime.datetime.now(datetime.timezone.utc)
 latest={}
 try:
  previous=json.loads(target.read_text()) if target.exists() else {}
  if not previous.get('error'):
   for row in previous.get('items',[]):
    if row.get('kind')!='ship' or not row.get('id'):continue
    stamp=datetime.datetime.fromisoformat(row['reportedAt'].replace('Z','+00:00'))
    if stamp.tzinfo and now-datetime.timedelta(minutes=90)<=stamp<=now+datetime.timedelta(minutes=1):latest[str(row['id'])]=row
 except (OSError,ValueError,KeyError,TypeError):pass
 for row in items:
  if row.get('id'):latest[str(row['id'])]=row
 save('vessels.json',list(latest.values()))
def vessel_category(ship_type):
 try: n=int(ship_type)
 except (TypeError,ValueError): return 'unknown'
 if n==37: return 'private'
 if 60<=n<=89: return 'commercial'
 return 'unknown'
def aircraft():
 cid=os.getenv('OPENSKY_CLIENT_ID');secret=os.getenv('OPENSKY_CLIENT_SECRET')
 if not cid or not secret:save('aircraft.json',[],'Set OPENSKY_CLIENT_ID and OPENSKY_CLIENT_SECRET GitHub Actions secrets.');return
 try:
  token=request('https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token',urllib.parse.urlencode({'grant_type':'client_credentials','client_id':cid,'client_secret':secret}).encode(),{'Content-Type':'application/x-www-form-urlencoded'})['access_token']
  params=urllib.parse.urlencode({'lamin':0.3,'lamax':2.4,'lomin':102.4,'lomax':105.3,'extended':1})
  data=request('https://opensky-network.org/api/states/all?'+params,headers={'Authorization':'Bearer '+token,'User-Agent':'SG-Air-Maritime-Monitor/1.0'})
  rows=[]
  for s in data.get('states') or []:
   if len(s)<11 or s[5] is None or s[6] is None:continue
   stamp=s[4] or s[3]
   if not stamp:continue
   rows.append({'kind':'air','id':s[0],'icao24':s[0],'callsign':(s[1] or '').strip(),'name':(s[1] or '').strip() or s[0],'category':'unknown','lat':s[6],'lon':s[5],'speedKmh':round(s[9]*3.6,1) if s[9] is not None else None,'heading':s[10],'reportedAt':datetime.datetime.fromtimestamp(stamp,datetime.timezone.utc).isoformat()})
  save('aircraft.json',rows)
 except Exception as e:save('aircraft.json',[],'OpenSky fetch failed: '+str(e)[:180])
async def vessels():
 key=os.getenv('AISSTREAM_API_KEY')
 if not key:merge_vessel_observations([],'Set AISSTREAM_API_KEY GitHub Actions secret.');return
 try:import websockets
 except ImportError:merge_vessel_observations([],'Missing websockets dependency.');return
 rows={};static={}
 try:
  async with websockets.connect('wss://stream.aisstream.io/v0/stream',compression='deflate',open_timeout=20,ping_interval=20) as ws:
   await ws.send(json.dumps({'APIKey':key,'BoundingBoxes':[[[0.3,102.4],[2.4,105.3]]],'FilterMessageTypes':['PositionReport','StandardClassBPositionReport','ExtendedClassBPositionReport','ShipStaticData','StaticDataReport']}))
   end=asyncio.get_running_loop().time()+75
   while asyncio.get_running_loop().time()<end:
    try:raw=await asyncio.wait_for(ws.recv(),timeout=min(12,max(.1,end-asyncio.get_running_loop().time())))
    except asyncio.TimeoutError:continue
    m=json.loads(raw);typ=m.get('MessageType','');meta=m.get('MetaData') or {};body=(m.get('Message') or {}).get(typ) or {};mmsi=str(meta.get('MMSI') or body.get('UserID') or '')
    if not mmsi:continue
    if typ in ('ShipStaticData','StaticDataReport'):
     static[mmsi]=body;continue
    if typ not in ('PositionReport','StandardClassBPositionReport','ExtendedClassBPositionReport'):continue
    lat=body.get('Latitude');lon=body.get('Longitude')
    if lat is None or lon is None or not (.3<=lat<=2.4 and 102.4<=lon<=105.3):continue
    speed=body.get('Sog');heading=body.get('Cog')
    if speed is not None and not 0<=speed<=102.2:speed=None
    if heading is not None and not 0<=heading<360:heading=None
    rows[mmsi]={'kind':'ship','id':mmsi,'mmsi':mmsi,'name':meta.get('ShipName') or mmsi,'category':'unknown','lat':lat,'lon':lon,'speedKmh':round(speed*1.852,1) if speed is not None else None,'heading':heading,'reportedAt':NOW()}
  for mmsi,row in rows.items():
   d=static.get(mmsi) or {};row['name']=(d.get('Name') or d.get('ShipName') or row['name']).strip()
   row['category']=vessel_category(d.get('Type') or d.get('ShipType'))
  merge_vessel_observations(list(rows.values()))
 except Exception as e:merge_vessel_observations([],'AISStream collection failed: '+str(e)[:180])
if __name__=='__main__':
 aircraft();asyncio.run(vessels());update_history()
