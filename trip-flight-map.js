/* SE Trip Manager · Trip Flight Map v1.6.1
 * 2D / globe projection based on MapLibre GL JS; shared db is read-only in map.
 * Geographic routes and flight motion are SIMULATIONS, not actual flight itineraries.
 */
const FLIGHT_COORDS={
  KR:{label:'한국 · 인천',lng:126.451,lat:37.460},
  BJ:{label:'북경',lng:116.407,lat:39.904},
  HF:{label:'허페이',lng:117.227,lat:31.821},
  NB:{label:'닝보',lng:121.550,lat:29.868},
  WX:{label:'우시',lng:120.312,lat:31.491},
  WH:{label:'우한',lng:114.305,lat:30.593},
  SX:{label:'샤오싱',lng:120.580,lat:30.031}
};
let fmMap=null,fmMarkers=[],fmPlaying=false,fmClock=null,fmProgress=0,fmMode='2d',fmSelected='',fmStart='',fmEnd='',fmPerson='ALL',fmSpeed=1,fmTimerElapsed=0;
const fmToday=()=>today();
function fmCoord(id){const r=byId(db.regions||[],id);if(r && Number.isFinite(Number(r.lng)) && Number.isFinite(Number(r.lat)) && r.lng!==undefined && r.lat!==undefined)return {label:r.name,lng:Number(r.lng),lat:Number(r.lat)};return FLIGHT_COORDS[id]||null;}
function fmHome(person){return person?.homeRegionId || (person?.country==='CN'?null:'KR');}
function fmTrips(){return db.trips.filter(t=>t.start<=fmEnd&&t.end>=fmStart&&t.status!=='취소'&&(fmPerson==='ALL'||t.personId===fmPerson));}
function fmRecords(d){return fmTrips().filter(t=>t.start<=d&&t.end>=d);}
function fmStartState(){return {d:fmSelected||fmToday(),start:fmStart||addDays(fmToday(),-15),end:fmEnd||addDays(fmToday(),45)};}
function fmEncode(v){return esc(v||'');}
function fmDateLabel(d){return `${d.slice(0,4)}.${d.slice(5,7)}.${d.slice(8,10)}`;}
function renderFlightMap(){const s=fmStartState();return `<section class="panel">
  <div class="tools" style="justify-content:space-between;gap:12px;margin-bottom:16px"><div><h3 style="margin:0 0 5px">✈ Trip Flight Map</h3><p class="muted" style="margin:0">출장 일정으로 생성한 이동 시뮬레이션 · 지역별 실시간 인원과 일일보고 연결</p></div><span class="pill">2D ↔ 3D Globe</span></div>
  <div class="flight-controls">
   <label class="field">시작일<input id="fmStart" type="date" value="${s.start}" onchange="fmSetRange()"></label>
   <label class="field">종료일<input id="fmEnd" type="date" value="${s.end}" onchange="fmSetRange()"></label>
   <label class="field">직원<select id="fmPerson" onchange="fmPerson=this.value;fmUpdate()"><option value="ALL">전체 직원</option>${db.people.map(p=>`<option value="${fmEncode(p.id)}" ${fmPerson===p.id?'selected':''}>${fmEncode(p.name)} · ${fmEncode(fmHome(p)||'미지정')}</option>`).join('')}</select></label>
   <button class="btn" id="fmProjection" onclick="fmToggleProjection()">${fmMode==='2d'?'🌐 3D 지구본':'🗺 2D 지도'}</button>
   <button class="btn" onclick="fmResetCamera()">전체 지역 보기</button>
  </div>
  <div class="flight-layout">
    <div id="fmMap" class="flight-map"><div class="flight-map-fallback">지도를 불러오는 중입니다…</div><div id="fmMapStatus" class="flight-status">${s.d} · 재생 준비</div></div>
    <div id="fmSummary" class="flight-sidebar"><strong>이동 현황</strong><p class="flight-notice">출장을 선택하면 이곳에서 이동과 업무 상태를 확인할 수 있습니다.</p></div>
  </div>
  <div class="flight-controls" style="margin-top:18px;align-items:center">
   <button class="btn primary" id="fmPlay" onclick="fmTogglePlay()">▶ 재생</button>
   <button class="btn" onclick="fmStep(-1)" title="하루 전">◀ 1일</button>
   <button class="btn" onclick="fmStep(1)" title="하루 다음">1일 ▶</button>
   <label class="field">재생 속도<select id="fmSpeed" onchange="fmSpeed=Number(this.value)"><option value="1">×1</option><option value="2">×2</option><option value="5">×5</option><option value="10">×10</option></select></label>
   <strong id="fmCurrentDate">${s.d}</strong>
  </div>
  <input id="fmSlider" class="flight-timeline" type="range" min="0" max="1" value="0" oninput="fmPause();fmSetProgress(Number(this.value))" aria-label="출장 날짜 타임라인">
  <div class="tools" style="justify-content:space-between"><span class="muted" id="fmRangeLabel"></span><span class="muted" id="fmCounts"></span></div>
  <div class="flight-legend"><span><i class="flight-dot" style="background:#3b82f6"></i>출발 및 귀국</span><span><i class="flight-dot" style="background:#e8b455"></i>현장 근무</span><span>✈ 비행기 경로</span><span>🚙 육상 이동</span></div>
  <p class="flight-notice">※ 출장 시작일 출발·종료일 귀환으로 가정한 시각화입니다. 실제 항공편, 출입국 기록 또는 실제 위치 추적이 아닙니다. 중국 현지 인원은 데이터 관리에서 기준 근무지를 설정하세요. 직원의 기준 근무지와 같은 지역 출장에는 이동 경로를 만들지 않습니다.</p>
 </section>`;}
function fmSetRange(){const a=document.getElementById('fmStart')?.value,b=document.getElementById('fmEnd')?.value;if(!a||!b||a>b){alert('시작일과 종료일을 확인해주세요.');return;}if(diff(a,b)>732){alert('한 번에 최대 2년까지 조회할 수 있습니다.');return;}fmPause();fmStart=a;fmEnd=b;fmSelected=fmSelected<a?a:fmSelected>b?b:fmSelected;fmUpdate();}
let fmLoadingPromise=null,fmInitSerial=0,fmMapFailureTimeout=null;
function fmLoadMapLibre(){
 if(window.maplibregl)return Promise.resolve(true);
 if(fmLoadingPromise)return fmLoadingPromise;
 // Try a second CDN if the first one is blocked by the corporate network.
 const urls=['https://unpkg.com/maplibre-gl@5.7.3/dist/maplibre-gl.js',
             'https://cdn.jsdelivr.net/npm/maplibre-gl@5.7.3/dist/maplibre-gl.js'];
 fmLoadingPromise=(async()=>{
   for(const src of urls){
     try{await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=src;script.onload=resolve;script.onerror=()=>reject(Error('CDN blocked'));document.head.appendChild(script);});if(window.maplibregl)return true;}
     catch(e){console.warn('지도 라이브러리 CDN 실패:',src,e);}
   }
   return false;
 })();return fmLoadingPromise;
}
function fmFallbackMap(message='외부 지도 연결이 차단되어 간략 이동도로 표시합니다.'){
 if(page!=='flightmap')return;
 const el=document.getElementById('fmMap');if(!el)return;
 if(fmMap){try{fmMap.remove();}catch(e){}fmMap=null;fmMarkers=[];}
 let status=el.querySelector('#fmMapStatus');
 if(!status){status=document.createElement('div');status.id='fmMapStatus';status.className='flight-status';el.appendChild(status);}
 el.querySelectorAll('.flight-map-fallback,#fmOfflineMap').forEach(e=>e.remove());
 const main=document.createElement('div');main.id='fmOfflineMap';main.className='flight-offline';
 main.innerHTML=`<div class="flight-offline-label">🗺 간략 이동도 · ${fmEncode(message)}<br><small>도시 좌표를 기준으로 한 개략도입니다. 정밀 지형·실제 항공 경로가 아닙니다.</small></div><svg viewBox="0 0 1000 600" preserveAspectRatio="xMidYMid meet" role="img" aria-label="한국과 중국 출장 이동 경로 개략도"><defs><linearGradient id="sea" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#c8e6f0"/><stop offset="1" stop-color="#a4d2e8"/></linearGradient></defs><rect width="1000" height="600" fill="url(#sea)"/><path d="M0 0H600L575 43 540 77 540 122 550 178 528 212 498 231 493 265 455 292 445 346 412 375 405 416 350 447 323 508 281 600H0Z" fill="#d7dfc5" stroke="#a1b59a" stroke-width="3"/><path d="M666 138 L692 171 702 218 692 262 703 296 690 315 676 303 670 273 660 252 654 209Z" fill="#d7dfc5" stroke="#a1b59a" stroke-width="3"/><path d="M690 314 L704 342 696 359 680 344Z" fill="#d7dfc5" stroke="#a1b59a"/><g opacity=".28" stroke="#f4f9fd" stroke-width="1">${[100,200,300,400,500,600,700,800,900].map(x=>`<path d="M${x} 0V600"/>`).join('')}${[100,200,300,400,500].map(y=>`<path d="M0 ${y}H1000"/>`).join('')}</g><text x="180" y="140" font-size="40" fill="#829277" font-weight="bold" opacity=".7">CHINA</text><text x="713" y="175" font-size="27" fill="#6b8c81" font-weight="bold">KOREA</text><g id="fmOfflineRoutes"></g><g id="fmOfflinePoints"></g></svg>`;
 el.prepend(main);fmOfflineVisual(fmSelected||fmToday(),0);
}
function fmProject(lng,lat){return {x:Math.round((lng-105)/25*930+35),y:Math.round((43-lat)/17*550+27)};}
function fmOfflineVisual(d,fraction){const holder=document.getElementById('fmOfflineMap');if(!holder)return;
 const routes=holder.querySelector('#fmOfflineRoutes'),points=holder.querySelector('#fmOfflinePoints');if(!routes||!points)return;
 let lines='',dots='';const sites=new Map();
 for(const t of fmTrips()){
  if(t.start>d)continue;const src=fmPoint(t,'start'),dst=fmPoint(t,'end');if(!src||!dst)continue;
  const a=fmProject(src.lng,src.lat),b=fmProject(dst.lng,dst.lat);const color=fmRouteColor(t);
  if(src.lng!==dst.lng||src.lat!==dst.lat)lines+=`<path d="M${a.x} ${a.y}Q${Math.round((a.x+b.x)/2)} ${Math.round((a.y+b.y)/2-65)} ${b.x} ${b.y}" fill="none" stroke="${color}" stroke-width="3" stroke-dasharray="9 6" opacity=".8"/>`;
  if(d>t.end)continue;const state=fmTravelState(t,d,fraction);
  if(state.phase==='out'||state.phase==='return'){
   const ca=fmProject(state.origin.lng,state.origin.lat),cb=fmProject(state.destination.lng,state.destination.lat),f=Math.max(0,Math.min(1,state.frac));let x=ca.x+(cb.x-ca.x)*f,y=ca.y+(cb.y-ca.y)*f-65*4*f*(1-f);
   dots+=`<text x="${x}" y="${y}" font-size="27" text-anchor="middle" class="offline-flight">${t.transport==='ground'?'🚙':'✈️'}</text><text x="${x}" y="${y+19}" font-size="13" fill="#1f2937" text-anchor="middle">${fmEncode(personName(t.personId))}</text>`;
  }else if(state.phase==='work'){let item=sites.get(t.regionId)||{x:b.x,y:b.y,names:[]};item.names.push(personName(t.personId));sites.set(t.regionId,item);}
 }
 for(const [id,item] of sites){dots+=`<g><circle cx="${item.x}" cy="${item.y}" r="15" fill="#f5be55" stroke="#fff" stroke-width="3"/><text x="${item.x}" y="${item.y+5}" text-anchor="middle" font-size="15">🏭</text><text x="${item.x}" y="${item.y+30}" fill="#20334c" text-anchor="middle" font-size="13" font-weight="bold">${fmEncode(regionName(id))} · ${item.names.length}명</text></g>`;}
 for(const key of ['KR','BJ','HF','NB','WX','WH','SX']){const c=fmCoord(key);if(!c)continue;const a=fmProject(c.lng,c.lat);dots+=`<circle cx="${a.x}" cy="${a.y}" r="4" fill="#223d59"/><text x="${a.x+9}" y="${a.y-8}" font-size="13" fill="#1c314a">${fmEncode(key)}</text>`;}
 routes.innerHTML=lines;points.innerHTML=dots;
}
async function initFlightMap(){if(page!=='flightmap')return;const serial=++fmInitSerial;
 const s=fmStartState();fmStart=s.start;fmEnd=s.end;fmSelected=s.d<fmStart?fmStart:s.d>fmEnd?fmEnd:s.d;
 const el=document.getElementById('fmMap');if(!el)return;
 if(fmMap){try{fmMap.remove()}catch(e){}fmMap=null;fmMarkers=[];}
 fmFallbackMap('온라인 지도를 불러오는 중입니다.');fmUpdate();
 const available=await fmLoadMapLibre();if(page!=='flightmap'||serial!==fmInitSerial)return;
 if(!available){fmFallbackMap('외부 지도 라이브러리에 접속할 수 없습니다.');fmUpdate();return;}
 try{
  el.querySelector('#fmOfflineMap')?.remove();el.querySelector('.flight-map-fallback')?.remove();
  fmMap=new maplibregl.Map({container:el,style:'https://tiles.openfreemap.org/styles/liberty',center:[121.3,34.8],zoom:4.1,attributionControl:true,canvasContextAttributes:{antialias:true}});
  fmMap.addControl(new maplibregl.NavigationControl({showCompass:true}),'top-right');
  let loaded=false;clearTimeout(fmMapFailureTimeout);
  fmMapFailureTimeout=setTimeout(()=>{if(!loaded&&page==='flightmap'&&serial===fmInitSerial){fmFallbackMap('지도 타일 응답이 지연되거나 차단됐습니다.');fmUpdate();}},12000);
  fmMap.on('load',()=>{if(page!=='flightmap'||serial!==fmInitSerial)return;loaded=true;clearTimeout(fmMapFailureTimeout);fmMap.addSource('fmLines',{type:'geojson',data:fmEmpty()});fmMap.addLayer({id:'fmLinesLayer',type:'line',source:'fmLines',paint:{'line-color':['get','color'],'line-opacity':0.8,'line-width':2.6,'line-dasharray':[3,2]}});fmApplyProjection();fmUpdate();});
  fmMap.on('error',e=>{if(e?.error){console.warn('지도 타일 오류:',e.error.message);if(!loaded&&/style|fetch|network|404|Failed/i.test(e.error.message||'')){clearTimeout(fmMapFailureTimeout);fmFallbackMap('온라인 지도 스타일을 불러오지 못했습니다.');fmUpdate();}}});
 }catch(e){console.error('지도 초기화 오류',e);fmFallbackMap('지도 초기화 오류: '+e.message);fmUpdate();}
}
function fmEmpty(){return {type:'FeatureCollection',features:[]};}
function fmApplyProjection(){if(!fmMap||!fmMap.loaded())return;try{fmMap.setProjection({type:fmMode==='3d'?'globe':'mercator'});fmMap.easeTo({center:[121.3,34.8],zoom:fmMode==='3d'?3.0:4.1,duration:700});}catch(e){console.warn(e);}}
function fmToggleProjection(){if(!fmMap){alert('3D 지구본 모드는 온라인 지도 라이브러리가 연결될 때 사용할 수 있습니다. 현재는 간략 2D 지도로 표시합니다.');return;}fmMode=fmMode==='2d'?'3d':'2d';document.getElementById('fmProjection').textContent=fmMode==='2d'?'🌐 3D 지구본':'🗺 2D 지도';fmApplyProjection();}
function fmResetCamera(){if(fmMap)fmMap.easeTo({center:[121.3,34.8],zoom:fmMode==='3d'?3.0:4.1,duration:900});}
function fmPoint(t,type){const person=byId(db.people,t.personId);let origin=t.originRegionId||fmHome(person);return fmCoord(type==='start'?origin:t.regionId);}
function fmRouteColor(t){const palette=regionPalette(t.regionId);return `hsl(${palette[0]},${palette[1]}%,45%)`;}
function fmLinePath(a,b,n=42){let pts=[];for(let i=0;i<=n;i++){let t=i/n;pts.push([a.lng+(b.lng-a.lng)*t,a.lat+(b.lat-a.lat)*t+Math.sin(t*Math.PI)*1.1]);}return pts;}
function fmTravelState(t,d,frac){const a=fmPoint(t,'start'),b=fmPoint(t,'end');if(!a||!b)return {phase:'missing',origin:a,destination:b};if(Math.abs(a.lng-b.lng)<.001&&Math.abs(a.lat-b.lat)<.001)return {phase:'work',origin:a,destination:b};const single=t.start===t.end;if(d===t.start&&(!single||frac<.32)){return {phase:'out',origin:a,destination:b,frac:single?frac/.32:frac};}if(d===t.end&&(!single||frac>=.68)){return {phase:'return',origin:b,destination:a,frac:single?(frac-.68)/.32:frac};}return {phase:'work',origin:a,destination:b};}
function fmMarker(lng,lat,text,cls,html,click){if(!fmMap)return;const el=document.createElement('div');el.className='flight-marker '+(cls||'');el.textContent=text;el.setAttribute('role','button');el.tabIndex=0;el.title=html.replace(/<[^>]*>/g,' ').slice(0,160);if(click){el.addEventListener('click',click);el.addEventListener('keydown',e=>{if(e.key==='Enter')click();});}const mk=new maplibregl.Marker({element:el,anchor:'center'}).setLngLat([lng,lat]).addTo(fmMap);fmMarkers.push(mk);return mk;}
function fmOpenReport(date,personId){const r=db.reports.find(x=>x.date===date&&x.personId===personId);editReport(date,r?.id||'');}
function fmBuildVisual(d,fraction){if(!fmMap||!fmMap.getSource('fmLines')){fmOfflineVisual(d,fraction);return;}for(const m of fmMarkers)m.remove();fmMarkers=[];const features=[],works=new Map(),workers=[];
 for(const t of fmTrips()){
  const start=fmPoint(t,'start'),dest=fmPoint(t,'end');if(!start||!dest)continue;
  if(d<t.start)continue;
  const p=byId(db.people,t.personId),name=p?.name||'이름 없음',state=fmTravelState(t,d,fraction);
  if(start.lng!==dest.lng||start.lat!==dest.lat){const points=fmLinePath(start,dest);features.push({type:'Feature',properties:{color:fmRouteColor(t)},geometry:{type:'LineString',coordinates:points}});}
  if(d>t.end)continue;
  if(state.phase==='out'||state.phase==='return'){
   let a=state.origin,b=state.destination,f=Math.max(0,Math.min(1,state.frac)),line=fmLinePath(a,b),pos=line[Math.round(f*(line.length-1))];
   const sign=t.transport==='ground'?'🚙':'✈';
   fmMarker(pos[0],pos[1],sign,'flight-airplane',name+' · '+state.phase,()=>fmSelectPerson(t.personId));
  }else if(state.phase==='work'){
   const k=t.regionId;if(!works.has(k))works.set(k,[]);works.get(k).push({t,name,person:p});
  }
 }
 for(const [regionId,items] of works){const c=fmCoord(regionId);if(!c)continue;fmMarker(c.lng,c.lat,'🧑‍🔧','flight-worker',items.map(it=>it.name).join(', '),()=>fmOpenReport(d,items[0].t.personId));}
 fmMap.getSource('fmLines').setData({type:'FeatureCollection',features});
}
function fmSelectPerson(id){fmPerson=fmPerson===id?'ALL':id;const sel=document.getElementById('fmPerson');if(sel)sel.value=fmPerson;fmUpdate();}
function fmStatusText(t,d,frac){const s=fmTravelState(t,d,frac);return s.phase==='out'?'✈ 출발':s.phase==='return'?'✈ 귀환':s.phase==='work'?'🏭 현지 근무':'📍 근무지 미설정';}
function fmUpdate(fraction=0){if(page!=='flightmap')return;const slider=document.getElementById('fmSlider');if(!slider)return;
 const total=Math.max(1,diff(fmStart,fmEnd)-1);fmProgress=Math.max(0,Math.min(total,diff(fmStart,fmSelected)-1));slider.max=total;slider.value=fmProgress;
 document.getElementById('fmCurrentDate').textContent=fmDateLabel(fmSelected);document.getElementById('fmRangeLabel').textContent=fmDateLabel(fmStart)+' — '+fmDateLabel(fmEnd);
 const all=fmTrips(),active=fmRecords(fmSelected),working=active.filter(t=>fmTravelState(t,fmSelected,fraction).phase==='work');
 document.getElementById('fmCounts').textContent=`기간 내 출장 ${all.length}건 · 당일 출장 ${active.length}건`;
 const summary=document.getElementById('fmSummary');if(summary){summary.innerHTML=`<strong>📍 ${fmDateLabel(fmSelected)} 이동 현황</strong><div class="flight-line">기간 내 출장 <b>${all.length}건</b> · 현지 근무 <b>${working.length}명</b></div>${active.length?active.map(t=>{const person=byId(db.people,t.personId),orig=t.originRegionId||fmHome(person),status=fmStatusText(t,fmSelected,fraction),report=db.reports.find(r=>r.date===fmSelected&&r.personId===t.personId);return `<div class="flight-person" onclick="fmSelectPerson('${fmEncode(t.personId)}')"><b>${fmEncode(person?.name||'미등록')}</b> <span class="pill">${fmEncode(tripRegion(t))}</span><div class="muted" style="margin-top:5px">${fmEncode(orig||'출발지 미지정')} → ${fmEncode(tripRegion(t))} · ${fmEncode(status)}</div><div class="muted">${t.start} ~ ${t.end}</div><button class="btn small" style="margin-top:7px" onclick="event.stopPropagation();fmOpenReport('${fmSelected}','${fmEncode(t.personId)}')">${report?'📝 보고서 열기':'＋ 일일보고'}</button></div>`}).join(''):'<p class="flight-notice">선택한 날짜에 출장 일정이 없어.</p>'}<p class="flight-notice">인원 선택: ${fmPerson==='ALL'?'전체':fmEncode(personName(fmPerson))} · 지도에서 근무 아이콘을 클릭하면 일일보고를 열 수 있어.</p>`;}
 const status=document.getElementById('fmMapStatus');if(status)status.textContent=fmDateLabel(fmSelected)+' · '+active.length+'명 출장 / '+working.length+'명 근무';
 fmBuildVisual(fmSelected,fraction);
}
function fmSetProgress(v){const max=Math.max(0,diff(fmStart,fmEnd)-1);const x=Math.max(0,Math.min(max,Math.round(v)));fmSelected=addDays(fmStart,x);fmUpdate();}
function fmStep(n){fmPause();fmSetProgress(fmProgress+n);}
function fmPause(){fmPlaying=false;if(fmClock){cancelAnimationFrame(fmClock);fmClock=null;}const b=document.getElementById('fmPlay');if(b)b.textContent='▶ 재생';}
function fmTogglePlay(){if(fmPlaying){fmPause();return;}if(fmSelected>=fmEnd)fmSetProgress(0);fmPlaying=true;fmTimerElapsed=0;const b=document.getElementById('fmPlay');if(b)b.textContent='Ⅱ 일시정지';let last=performance.now();function frame(now){if(!fmPlaying||page!=='flightmap'){fmPause();return;}const dt=Math.min(now-last,120);last=now;fmTimerElapsed+=dt*fmSpeed;const dayMs=1750;let part=fmTimerElapsed/dayMs;if(part>=1){fmTimerElapsed=0;if(fmSelected>=fmEnd){fmPause();return;}fmSetProgress(fmProgress+1);part=0;}fmUpdate(part);fmClock=requestAnimationFrame(frame);}fmClock=requestAnimationFrame(frame);}
