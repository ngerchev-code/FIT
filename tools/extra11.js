/* ============ GUIDE — КАРТА: КАКВО ИМА НАОКОЛО (GPS) ============ */
const GUIDE_CAT = {
  gym:{n:"Фитнеси и зали",c:"#2340E8",i:"🏋️"}, pilates:{n:"Пилатес и йога",c:"#9B3FD1",i:"🧘"}, pool:{n:"Басейни",c:"#0B8FC4",i:"🏊"},
  street:{n:"Фитнес на открито",c:"#E0661B",i:"💪"}, stadium:{n:"Стадиони и писти",c:"#B8860B",i:"🏟️"}, park:{n:"Паркове",c:"#3E8E1E",i:"🌳"},
  food:{n:"Здравословно хранене",c:"#17905F",i:"🥗"}, shop:{n:"Спортни магазини",c:"#F2532E",i:"🛍️"},
  med:{n:"Болници и спешна помощ",c:"#D7263D",i:"🏥"}, pharm:{n:"Аптеки",c:"#0FA3A3",i:"💊"}, sight:{n:"Забележителности",c:"#6B4FA0",i:"🏛️"},
  water:{n:"Питейна вода",c:"#2A7DE1",i:"🚰"}, nature:{n:"Природа",c:"#7A5A2E",i:"⛰️"}, mine:{n:"Мои обекти",c:"#10141B",i:"⭐"}
};
const GUIDE_GROUPS = {sport:["gym","pilates","pool","street","stadium"], city:["med","pharm","sight","water"], out:["park","nature"], life:["food","shop","mine"]};
let GUIDE=null, GUIDEbusy=false, GUIDEerr="", guideMap=null, guideF="all", guideRadius=3, guideCity="gps", guideSat=false, guideMarks={};
function guideCatOf(t){
  if(/pilates|yoga/.test(t.sport||"")) return "pilates";
  if(t.leisure==="fitness_station") return "street";
  if(/^(fitness_centre|sports_centre|sports_hall)$/.test(t.leisure||"")) return "gym";
  if(t.leisure==="swimming_pool"||t.leisure==="water_park") return "pool";
  if(t.leisure==="stadium"||t.leisure==="track") return "stadium";
  if(t.leisure==="park"||t.leisure==="garden") return "park";
  if(/^(sports|outdoor|bicycle)$/.test(t.shop||"")) return "shop";
  if(t.shop==="health_food"||/^(restaurant|cafe)$/.test(t.amenity||"")) return "food";
  if(t.amenity==="hospital"||t.emergency==="ambulance_station") return "med";
  if(t.amenity==="pharmacy") return "pharm";
  if(t.tourism||t.historic) return "sight";
  if(t.amenity==="drinking_water") return "water";
  return null;
}
const GUIDE_DEF_NAME={pharm:"Аптека",water:"Чешма / питейна вода",street:"Уреди за фитнес на открито",med:"Спешна помощ"};
async function cityName(me){
  const k="fit_city_"+me.lat.toFixed(2)+"_"+me.lon.toFixed(2);
  try{ const c=localStorage.getItem(k); if(c) return c; }catch(e){}
  try{
    const ctl=new AbortController(); const tm=setTimeout(()=>ctl.abort(),8000);
    const r=await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=10&accept-language=bg&lat=${me.lat}&lon=${me.lon}`,{signal:ctl.signal}); clearTimeout(tm);
    const j=await r.json(); const a=j.address||{}; const n=a.city||a.town||a.village||a.municipality||a.county||"";
    if(n){ try{ localStorage.setItem(k,n); }catch(e){} } return n;
  }catch(e){ return ""; }
}
async function guideCenter(){
  if(guideCity!=="gps"){ const c=CITIES.find(x=>x[0]===guideCity); if(c) return {lat:c[1],lon:c[2],city:c[0],picked:true}; }
  const me=await myPosition();
  if(me) return Object.assign({},me);
  return {lat:42.6977,lon:23.3219,approx:true,city:"София"};
}
async function loadGuide(force){
  if(GUIDEbusy) return; GUIDEbusy=true; GUIDEerr="";
  try{
    const me=await guideCenter();
    const key="fit_guide2_"+me.lat.toFixed(2)+"_"+me.lon.toFixed(2)+"_"+guideRadius;
    if(!force){ try{ const c=JSON.parse(localStorage.getItem(key)||"null"); if(c&&Date.now()-c.at<6*3600e3){ GUIDE={me:Object.assign(me,{city:me.city||c.city}),list:c.list}; return; } }catch(e){} }
    GUIDE={me,list:[],loading:true}; GUIDEbusy=false; if(TAB==="guide") rGuide(); GUIDEbusy=true;
    if(!me.city) cityName(me).then(n=>{ if(n&&GUIDE&&GUIDE.me===me){ me.city=n; if(TAB==="guide") guideHead(); } });
    const R=guideRadius*1000, A=`(around:${R},${me.lat},${me.lon})`;
    const q=`[out:json][timeout:25];
(nwr["leisure"~"^(fitness_centre|sports_centre|sports_hall)$"]["name"]${A};)->.a; .a out center 60;
(nwr["sport"~"pilates|yoga"]["name"]${A};)->.b; .b out center 30;
(nwr["leisure"~"^(swimming_pool|water_park)$"]["access"!~"private|customers"]["name"]${A};)->.c; .c out center 30;
(nwr["leisure"="fitness_station"]${A};)->.d; .d out center 40;
(nwr["leisure"~"^(stadium|track)$"]["name"]${A};)->.e; .e out center 30;
(nwr["leisure"~"^(park|garden)$"]["name"]["access"!="private"]${A};)->.f; .f out center 60;
(nwr["shop"~"^(sports|outdoor|bicycle)$"]["name"]${A};)->.g; .g out center 40;
(nwr["amenity"~"^(restaurant|cafe)$"]["diet:vegan"~"yes|only"]["name"]${A}; nwr["amenity"~"^(restaurant|cafe)$"]["diet:vegetarian"~"yes|only"]["name"]${A}; nwr["shop"="health_food"]["name"]${A};)->.h; .h out center 40;
(nwr["amenity"="hospital"]["name"]${A}; nwr["emergency"="ambulance_station"]${A};)->.i; .i out center 25;
(nwr["amenity"="pharmacy"]${A};)->.j; .j out center 40;
(nwr["tourism"~"^(attraction|museum|viewpoint)$"]["name"]${A}; nwr["historic"~"^(monument|memorial|castle|fort|archaeological_site)$"]["name"]${A};)->.k; .k out center 40;
(nwr["amenity"="drinking_water"]${A};)->.l; .l out center 30;`;
    let j=null;
    for(const host of ["https://overpass-api.de/api/interpreter","https://overpass.kumi.systems/api/interpreter","https://overpass.private.coffee/api/interpreter"]){
      const ctl=new AbortController(); const tm=setTimeout(()=>ctl.abort(),20000);
      try{ const r=await fetch(host,{method:"POST",signal:ctl.signal,body:"data="+encodeURIComponent(q),headers:{"content-type":"application/x-www-form-urlencoded"}}); if(r.ok){ j=await r.json(); clearTimeout(tm); break; } }catch(e){}
      clearTimeout(tm);
    }
    if(!j) throw new Error("overpass");
    const seen=new Set(); const list=[];
    (j.elements||[]).forEach(e=>{ const t=e.tags||{}; const cat=guideCatOf(t); const c=e.center||(e.lat?{lat:e.lat,lon:e.lon}:null); if(!cat||!c) return;
      const name=t["name:bg"]||t.name||GUIDE_DEF_NAME[cat]; if(!name) return;
      const k=cat+"|"+name+"|"+c.lat.toFixed(3)+c.lon.toFixed(3); if(seen.has(k)) return; seen.add(k);
      const sub = cat==="sight"?({museum:"Музей",viewpoint:"Гледка",attraction:"Забележителност"}[t.tourism]||"Паметник"):cat==="stadium"&&t.leisure==="track"?"Писта":cat==="gym"&&t.leisure!=="fitness_centre"?"Спортна зала":cat==="med"&&t.emergency?"Спешна помощ":"";
      list.push({name,cat,sub,lat:c.lat,lon:c.lon,km:kmBetween(me,{lat:c.lat,lon:c.lon}),addr:[t["addr:street"],t["addr:housenumber"]].filter(Boolean).join(" "),hours:t.opening_hours||"",phone:t.phone||t["contact:phone"]||"",web:t.website||t["contact:website"]||""});
    });
    list.sort((x,y)=>x.km-y.km);
    try{ localStorage.setItem(key,JSON.stringify({at:Date.now(),city:me.city||"",list})); }catch(e){}
    GUIDE={me,list};
  }catch(e){ if(GUIDE&&GUIDE.loading){ GUIDE.loading=false; GUIDE.failed=true; } else GUIDEerr="Не успях да заредя картата наоколо. Провери интернета и опитай пак."; }
  finally{ GUIDEbusy=false; if(TAB==="guide") rGuide(); }
}
function guideAll(){
  if(!GUIDE) return [];
  const L=GUIDE.list.slice();
  if(NAT&&NAT.list) NAT.list.forEach(x=>L.push({name:x.name,cat:"nature",lat:x.lat,lon:x.lon,km:kmBetween(GUIDE.me,{lat:x.lat,lon:x.lon}),sub:NAT_T[x.type]}));
  myPlaces().forEach(o=>{ if(o.coords) L.push({name:o.name,cat:"mine",lat:o.coords.lat,lon:o.coords.lon,km:kmBetween(GUIDE.me,o.coords),sub:o.type}); });
  return L;
}
function guideItems(){
  let L=guideAll();
  if(GUIDE_GROUPS[guideF]) L=L.filter(x=>GUIDE_GROUPS[guideF].includes(x.cat)); else if(guideF!=="all") L=L.filter(x=>x.cat===guideF);
  return L.sort((a,b)=>a.km-b.km);
}
function guideHead(){
  const h=$("#gdHead"); if(!h||!GUIDE) return; const me=GUIDE.me;
  h.innerHTML=`<span class="gd-city">📍 ${esc(me.city||"Определям града…")}</span><span class="muted">${me.picked?"избран град":me.approx?"GPS не е наличен — център на София":"по GPS"} · радиус ${guideRadius} км</span>`;
}
function rGuide(){
  const p=P(); if(!p) return;
  if(guideMap){ try{ guideMap.remove(); }catch(e){} guideMap=null; }
  const all=guideAll(), items=guideItems(); const hasL=!!window.L;
  const cnt=k=>all.filter(x=>x.cat===k).length;
  const grp=(k,n)=>{ const c=GUIDE_GROUPS[k].reduce((a,x)=>a+cnt(x),0); return `<button class="chip" type="button" data-gf="${k}" aria-pressed="${guideF===k}" style="flex:0 0 auto">${n}${GUIDE&&!GUIDE.loading?` <b class="mono" style="margin-left:4px">${c}</b>`:""}</button>`; };
  $("#v-guide").innerHTML=`
    <div class="row" style="justify-content:space-between;align-items:flex-end;gap:8px"><div style="min-width:0"><p class="eyebrow">GUIDE · какво има наоколо</p><h1 class="h-display" style="margin:0">Около теб</h1></div>
      <button class="btn ghost sm" id="gdLocate" type="button">◎ Моята позиция</button></div>
    <div class="gd-head" id="gdHead"></div>
    <div class="row" style="gap:8px;flex-wrap:nowrap">
      <select class="in" id="gdCity" aria-label="Град" style="min-height:40px;padding:6px 10px;flex:1 1 auto"><option value="gps" ${guideCity==="gps"?"selected":""}>📍 Където съм (GPS)</option>${CITIES.map(c=>`<option value="${esc(c[0])}" ${guideCity===c[0]?"selected":""}>${esc(c[0])}</option>`).join("")}</select>
      <select class="in" id="gdRad" aria-label="Радиус" style="min-height:40px;padding:6px 10px;width:auto">${[1,3,5,10,15].map(r=>`<option value="${r}" ${r===guideRadius?"selected":""}>${r} км</option>`).join("")}</select></div>
    <div class="chips" style="flex-wrap:nowrap;overflow-x:auto;padding-bottom:2px"><button class="chip" type="button" data-gf="all" aria-pressed="${guideF==="all"}" style="flex:0 0 auto">Всичко${GUIDE&&!GUIDE.loading?` <b class="mono" style="margin-left:4px">${all.length}</b>`:""}</button>${grp("sport","Спорт")}${grp("city","Важно в града")}${grp("out","Навън")}${grp("life","Храна и магазини")}</div>
    <div class="chips" style="flex-wrap:nowrap;overflow-x:auto;padding-bottom:4px">${Object.entries(GUIDE_CAT).filter(([k])=>!GUIDE||GUIDE.loading||cnt(k)>0||guideF===k).map(([k,v])=>`<button class="chip gd-cat" type="button" data-gf="${k}" aria-pressed="${guideF===k}" style="flex:0 0 auto;--c:${v.c}"><span aria-hidden="true">${v.i}</span>${v.n}${GUIDE&&!GUIDE.loading?` <b class="mono" style="margin-left:4px">${cnt(k)}</b>`:""}</button>`).join("")}</div>
    <div class="gwrap" id="gwrap"><button class="gfs" id="gdFull" type="button" aria-label="Карта на цял екран">⤢ Цял екран</button><button class="gfs gsat" id="gdSat" type="button">${guideSat?"🗺 Карта":"🛰 Сателит"}</button><div id="gmap" style="height:max(420px,calc(100vh - 300px));border-radius:16px;border:1px solid var(--line);overflow:hidden;background:var(--surface-2);display:grid;place-items:center">${GUIDE&&hasL?"":`<div class="muted" style="padding:16px;text-align:center">${GUIDEbusy&&!GUIDE?'<div class="thinking"><span class="spin"></span>Определям позицията…</div>':esc(GUIDEerr|| (hasL?"Зареждам картата…":"Картата не можа да се зареди. Провери интернета."))}${GUIDEerr?'<div style="margin-top:8px"><button class="btn ghost sm" id="gdRetry" type="button">Опитай пак</button></div>':""}</div>`}</div>
    </div>
    <div class="row" style="justify-content:space-between"><span class="muted" style="font-size:13px">${GUIDE?(GUIDE.loading?'<span class="thinking" style="display:inline-flex"><span class="spin"></span>Зареждам обектите…</span>':GUIDE.failed?'Сървърът за места не отговори. <button class="btn ghost sm" id="gdRetry2" type="button">Опитай пак</button>':items.length+" обекта · подредени по разстояние"):""}</span></div>
    <div>${items.slice(0,60).map((x,i)=>{ const d=distText(x.km); const c=GUIDE_CAT[x.cat]; return `<div class="ex gd-item"><div class="gd-badge" style="background:${c.c}" aria-hidden="true">${c.i}</div><div style="min-width:0"><div class="ex-name">${esc(x.name)}</div><div class="ex-meta"><b style="color:${c.c}">${esc(x.sub||c.n)}</b> · ${d.km} км · пеша ${d.walk} · кола ${d.car}</div>${x.addr||x.hours?`<div class="ex-meta">${esc([x.addr,x.hours].filter(Boolean).join(" · "))}</div>`:""}</div><div style="display:flex;flex-direction:column;gap:6px"><button class="btn sm" type="button" data-gnav="${i}">Как да стигна</button><button class="btn ghost sm" type="button" data-gshow="${i}">На картата</button></div></div>`; }).join("")}</div>
    <p class="note">Карта: © Esri, © OpenStreetMap. Обектите са от OpenStreetMap и може да не са пълни — провери работното време преди да тръгнеш. Местоположението ти остава на телефона.</p>`;
  guideHead();
  const v=$("#v-guide");
  v.querySelectorAll("[data-gf]").forEach(b=>b.onclick=()=>{ guideF=b.dataset.gf; rGuide(); });
  v.querySelectorAll("[data-gnav]").forEach(b=>b.onclick=()=>{ const x=items[+b.dataset.gnav]; navSheet(x.name,x.name,{lat:x.lat,lon:x.lon}); });
  v.querySelectorAll("[data-gshow]").forEach(b=>b.onclick=()=>{ const x=items[+b.dataset.gshow]; const m=guideMarks[x.lat+","+x.lon]; if(guideMap&&m){ $("#gwrap").scrollIntoView({behavior:"smooth",block:"start"}); guideMap.flyTo([x.lat,x.lon],17,{duration:.6}); setTimeout(()=>m.openPopup(),650); } });
  { const fb=$("#gdFull"), w=$("#gwrap"); if(fb) fb.onclick=()=>{ const on=!w.classList.contains("full"); w.classList.toggle("full",on); fb.textContent=on?"✕ Затвори":"⤢ Цял екран"; setTimeout(()=>{ try{ guideMap&&guideMap.invalidateSize(); }catch(e){} },150); }; }
  $("#gdSat").onclick=()=>{ guideSat=!guideSat; rGuide(); };
  const rt=$("#gdRetry"); if(rt) rt.onclick=()=>{ MYPOS=null; GUIDEerr=""; loadGuide(true); rGuide(); };
  const rt2=$("#gdRetry2"); if(rt2) rt2.onclick=()=>{ GUIDE=null; loadGuide(true); rGuide(); };
  $("#gdRad").onchange=e=>{ guideRadius=+e.target.value; GUIDE=null; loadGuide(); rGuide(); };
  $("#gdCity").onchange=e=>{ guideCity=e.target.value; GUIDE=null; loadGuide(); rGuide(); };
  $("#gdLocate").onclick=()=>{ guideCity="gps"; MYPOS=null; GUIDE=null; loadGuide(true); if(!NAT) loadNature(); rGuide(); };
  if(!GUIDE){ if(!GUIDEbusy&&!GUIDEerr) loadGuide(); return; }
  if(!hasL) return;
  const me=GUIDE.me; guideMarks={};
  guideMap=L.map("gmap",{zoomControl:true,attributionControl:true});
  (function(){ const SRC=guideSat?[["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",{maxZoom:19,attribution:"© Esri"}]]:[
    ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",{maxZoom:19,attribution:"© Esri, © OpenStreetMap"}],
    ["https://tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:"© OpenStreetMap"}],
    ["https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",{maxZoom:17,subdomains:"abc",attribution:"© OpenStreetMap, © OpenTopoMap"}]];
    let i=0, bad=0, lay=null; const m=guideMap;
    const put=()=>{ if(lay) m.removeLayer(lay); bad=0; lay=L.tileLayer(SRC[i][0],SRC[i][1]).addTo(m);
      lay.on("tileerror",()=>{ if(++bad>=4 && i<SRC.length-1){ i++; put(); } }); };
    put(); })();
  guideMap.fitBounds(L.latLng(me.lat,me.lon).toBounds(guideRadius*2000),{padding:[10,10]});
  L.circle([me.lat,me.lon],{radius:guideRadius*1000,color:"#12A150",weight:2,dashArray:"6 6",fillColor:"#12A150",fillOpacity:0.05}).addTo(guideMap);
  L.marker([me.lat,me.lon],{icon:L.divIcon({className:"",html:'<div class="gme"><i></i></div>',iconSize:[22,22],iconAnchor:[11,11]}),zIndexOffset:1000}).addTo(guideMap).bindTooltip(me.picked?("Център: "+me.city):"Ти си тук");
  items.forEach(x=>{ const c=GUIDE_CAT[x.cat]; const d=distText(x.km);
    const m=L.marker([x.lat,x.lon],{icon:L.divIcon({className:"",html:`<div class="gpin" style="--c:${c.c}"><span>${c.i}</span></div>`,iconSize:[34,42],iconAnchor:[17,40],popupAnchor:[0,-36]})}).addTo(guideMap);
    const el=document.createElement("div"); el.style.minWidth="200px";
    el.innerHTML=`<div style="font-size:11px;font-weight:800;color:${c.c};text-transform:uppercase;letter-spacing:.05em">${c.i} ${esc(x.sub||c.n)}</div><b style="font-size:15px">${esc(x.name)}</b><div style="font-size:12px;margin-top:2px">${d.km} км · пеша ${d.walk} · кола ${d.car}</div>${x.hours?`<div style="font-size:12px">🕒 ${esc(x.hours)}</div>`:""}${x.addr?`<div style="font-size:12px">${esc(x.addr)}</div>`:""}`;
    const b1=document.createElement("button"); b1.className="btn sm"; b1.style.marginTop="8px"; b1.textContent="Как да стигна"; b1.onclick=()=>navSheet(x.name,x.name,{lat:x.lat,lon:x.lon});
    el.appendChild(b1); m.bindPopup(el); guideMarks[x.lat+","+x.lon]=m;
  });
  setTimeout(()=>{ try{ guideMap.invalidateSize(); }catch(e){} },200);
}
