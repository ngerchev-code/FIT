/* ============ GUIDE — КАРТА: КАКВО ИМА НАОКОЛО (GPS) ============ */
const GUIDE_CAT = {
  gym:{n:"Фитнеси",c:"#2340E8"}, pilates:{n:"Пилатес и йога",c:"#9B3FD1"}, pool:{n:"Басейни",c:"#0B8FC4"},
  food:{n:"Здравословни заведения",c:"#17905F"}, shop:{n:"Спортни магазини",c:"#F2532E"},
  park:{n:"Паркове и игрища",c:"#5A8F1E"}, nature:{n:"Природа",c:"#7A5A2E"}, mine:{n:"Мои обекти",c:"#10141B"}
};
let GUIDE=null, GUIDEbusy=false, GUIDEerr="", guideMap=null, guideF="all", guideRadius=3;
async function loadGuide(force){
  if(GUIDEbusy) return; GUIDEbusy=true; GUIDEerr="";
  try{
    const me=await myPosition();
    if(!me){ GUIDEerr=NATIVE?"Разреши местоположение (GPS), за да видиш какво има около теб.":"Картата и GPS работят в приложението FIT за Android."; return; }
    const key="fit_guide_"+me.lat.toFixed(2)+"_"+me.lon.toFixed(2)+"_"+guideRadius;
    if(!force){ try{ const c=JSON.parse(localStorage.getItem(key)||"null"); if(c&&Date.now()-c.at<6*3600e3){ GUIDE={me,list:c.list}; return; } }catch(e){} }
    const R=guideRadius*1000, a=`(around:${R},${me.lat},${me.lon})`;
    const q=`[out:json][timeout:25];(
      nwr["leisure"="fitness_centre"]["name"]${a};
      nwr["sport"~"pilates|yoga"]["name"]${a};
      nwr["leisure"="sports_centre"]["name"]${a};
      nwr["leisure"="swimming_pool"]["access"!="private"]["name"]${a};
      nwr["shop"="sports"]["name"]${a};
      nwr["shop"="outdoor"]["name"]${a};
      nwr["amenity"~"restaurant|cafe|fast_food"]["diet:vegan"~"yes|only"]["name"]${a};
      nwr["amenity"~"restaurant|cafe|fast_food"]["diet:vegetarian"~"yes|only"]["name"]${a};
      nwr["shop"="health_food"]["name"]${a};
      nwr["leisure"="park"]["name"]${a};
      nwr["leisure"="pitch"]["name"]${a};
      nwr["leisure"="track"]["name"]${a};
    );out center tags 300;`;
    const r=await fetch("https://overpass-api.de/api/interpreter",{method:"POST",body:"data="+encodeURIComponent(q),headers:{"content-type":"application/x-www-form-urlencoded"}});
    const j=await r.json(); const seen=new Set(); const list=[];
    (j.elements||[]).forEach(e=>{ const t=e.tags||{}; const name=t["name:bg"]||t.name; const c=e.center||(e.lat?{lat:e.lat,lon:e.lon}:null); if(!name||!c) return;
      const k=name+"|"+c.lat.toFixed(3); if(seen.has(k)) return; seen.add(k);
      const cat= /pilates|yoga/.test(t.sport||"")?"pilates": t.leisure==="fitness_centre"||t.leisure==="sports_centre"?"gym": t.leisure==="swimming_pool"?"pool": (t.shop==="sports"||t.shop==="outdoor")?"shop": (t.shop==="health_food"||t.amenity)?"food":"park";
      list.push({name,cat,lat:c.lat,lon:c.lon,km:kmBetween(me,{lat:c.lat,lon:c.lon}),addr:[t["addr:street"],t["addr:housenumber"]].filter(Boolean).join(" "),hours:t.opening_hours||""});
    });
    list.sort((x,y)=>x.km-y.km);
    try{ localStorage.setItem(key,JSON.stringify({at:Date.now(),list:list.slice(0,250)})); }catch(e){}
    GUIDE={me,list:list.slice(0,250)};
  }catch(e){ GUIDEerr="Не успях да заредя картата наоколо. Провери интернета и опитай пак."; }
  finally{ GUIDEbusy=false; if(TAB==="guide") rGuide(); }
}
function guideItems(){
  if(!GUIDE) return [];
  let L=GUIDE.list.slice();
  if(NAT&&NAT.list) NAT.list.forEach(x=>L.push({name:x.name,cat:"nature",lat:x.lat,lon:x.lon,km:x.km,sub:NAT_T[x.type]}));
  myPlaces().forEach(o=>{ if(o.coords) L.push({name:o.name,cat:"mine",lat:o.coords.lat,lon:o.coords.lon,km:kmBetween(GUIDE.me,o.coords),sub:o.type}); });
  if(guideF!=="all") L=L.filter(x=>x.cat===guideF);
  return L.sort((a,b)=>a.km-b.km);
}
function rGuide(){
  const p=P(); if(!p) return;
  if(guideMap){ try{ guideMap.remove(); }catch(e){} guideMap=null; }
  const items=guideItems(); const hasL=!!window.L;
  $("#v-guide").innerHTML=`
    <div class="row" style="justify-content:space-between;align-items:flex-end"><div><p class="eyebrow">GUIDE · какво има наоколо</p><h1 class="h-display">Около теб</h1></div>
    <div class="row" style="gap:6px"><button class="btn ghost sm" id="gdLocate" type="button">Моята позиция</button></div></div>
    <div class="chips" style="flex-wrap:nowrap;overflow-x:auto;padding-bottom:4px"><button class="chip" type="button" data-gf="all" aria-pressed="${guideF==="all"}" style="flex:0 0 auto">Всичко</button>${Object.entries(GUIDE_CAT).map(([k,v])=>`<button class="chip" type="button" data-gf="${k}" aria-pressed="${guideF===k}" style="flex:0 0 auto"><span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${v.c};margin-right:6px"></span>${v.n}</button>`).join("")}</div>
    <div id="gmap" style="height:min(56vh,460px);border-radius:16px;border:1px solid var(--line);overflow:hidden;background:var(--surface-2);display:grid;place-items:center">${GUIDE&&hasL?"":`<div class="muted" style="padding:16px;text-align:center">${GUIDEbusy?'<div class="thinking"><span class="spin"></span>Търся какво има около теб…</div>':esc(GUIDEerr|| (hasL?"Зареждам картата…":"Картата работи в приложението FIT за Android."))}${GUIDEerr?'<div style="margin-top:8px"><button class="btn ghost sm" id="gdRetry" type="button">Опитай пак</button></div>':""}</div>`}</div>
    <div class="row" style="justify-content:space-between"><span class="muted" style="font-size:13px">${GUIDE?items.length+" места в радиус "+guideRadius+" км":""}</span>
      <label class="row" style="gap:6px;font-size:13px;font-weight:700">Радиус<select class="in" id="gdRad" style="min-height:36px;padding:4px 8px;width:auto">${[1,3,5,10].map(r=>`<option value="${r}" ${r===guideRadius?"selected":""}>${r} км</option>`).join("")}</select></label></div>
    <div>${items.slice(0,40).map((x,i)=>{ const d=distText(x.km); const c=GUIDE_CAT[x.cat]; return `<div class="ex"><div class="num" style="border-color:${c.c};color:${c.c}">${i+1}</div><div style="min-width:0"><div class="ex-name">${esc(x.name)}</div><div class="ex-meta">${esc(x.sub||c.n)} · ${d.km} км · пеша ${d.walk} · кола ${d.car}${x.hours?" · "+esc(x.hours):""}</div></div><button class="btn ghost sm" type="button" data-gnav="${i}">Как да стигна</button></div>`; }).join("")}</div>
    <p class="note">Карта: © OpenStreetMap, © CARTO. Местата са от OpenStreetMap. Местоположението ти остава на телефона.</p>`;
  const v=$("#v-guide");
  v.querySelectorAll("[data-gf]").forEach(b=>b.onclick=()=>{ guideF=b.dataset.gf; rGuide(); });
  v.querySelectorAll("[data-gnav]").forEach(b=>b.onclick=()=>{ const x=items[+b.dataset.gnav]; navSheet(x.name,x.name,{lat:x.lat,lon:x.lon}); });
  const rt=$("#gdRetry"); if(rt) rt.onclick=()=>{ MYPOS=null; loadGuide(true); rGuide(); };
  $("#gdRad").onchange=e=>{ guideRadius=+e.target.value; GUIDE=null; loadGuide(); rGuide(); };
  $("#gdLocate").onclick=()=>{ MYPOS=null; GUIDE=null; loadGuide(true); if(!NAT) loadNature(); rGuide(); };
  if(!GUIDE){ if(!GUIDEbusy&&!GUIDEerr) loadGuide(); return; }
  if(!hasL) return;
  guideMap=L.map("gmap",{zoomControl:true,attributionControl:true}).setView([GUIDE.me.lat,GUIDE.me.lon],guideRadius<=1?16:guideRadius<=3?14:guideRadius<=5?13:12);
  L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",{maxZoom:19,subdomains:"abcd",attribution:"© OpenStreetMap, © CARTO"}).addTo(guideMap);
  L.circleMarker([GUIDE.me.lat,GUIDE.me.lon],{radius:9,color:"#fff",weight:3,fillColor:"#2340E8",fillOpacity:1}).addTo(guideMap).bindTooltip("Ти си тук");
  L.circle([GUIDE.me.lat,GUIDE.me.lon],{radius:guideRadius*1000,color:"#2340E8",weight:1,fillOpacity:0.04}).addTo(guideMap);
  items.forEach((x,i)=>{ const c=GUIDE_CAT[x.cat]; const d=distText(x.km);
    const m=L.circleMarker([x.lat,x.lon],{radius:8,color:"#fff",weight:2,fillColor:c.c,fillOpacity:0.95}).addTo(guideMap);
    const el=document.createElement("div"); el.style.minWidth="180px";
    el.innerHTML=`<b>${esc(x.name)}</b><br><span style="font-size:12px">${esc(x.sub||c.n)} · ${d.km} км · пеша ${d.walk}</span><br>`;
    const b1=document.createElement("button"); b1.className="btn sm"; b1.style.marginTop="6px"; b1.textContent="Как да стигна"; b1.onclick=()=>navSheet(x.name,x.name,{lat:x.lat,lon:x.lon});
    el.appendChild(b1); m.bindPopup(el);
  });
  setTimeout(()=>{ try{ guideMap.invalidateSize(); }catch(e){} },200);
}
