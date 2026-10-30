/* ============ НАВИГАЦИЯ, РАЗСТОЯНИЕ, МОИ ОБЕКТИ ============ */
let MYPOS=null, MYPOSat=0;
async function myPosition(){
  if(MYPOS && Date.now()-MYPOSat<5*60e3) return MYPOS;
  const G=Plug("Geolocation");
  try{
    if(NATIVE && G){
      let pm=await G.checkPermissions(); if(pm.location!=="granted") pm=await G.requestPermissions(); if(pm.location!=="granted") return null;
      const r=await G.getCurrentPosition({enableHighAccuracy:false,timeout:12000,maximumAge:120000});
      MYPOS={lat:r.coords.latitude,lon:r.coords.longitude};
    } else if(navigator.geolocation){
      MYPOS=await new Promise((res)=>navigator.geolocation.getCurrentPosition(p=>res({lat:p.coords.latitude,lon:p.coords.longitude}),()=>res(null),{timeout:10000,maximumAge:120000}));
    }
  }catch(e){ MYPOS=null; }
  if(MYPOS) MYPOSat=Date.now(); return MYPOS;
}
function geoCache(){ try{ return JSON.parse(localStorage.getItem("fit_geo")||"{}"); }catch(e){ return {}; } }
function geoSave(c){ try{ localStorage.setItem("fit_geo",JSON.stringify(c)); }catch(e){} }
let geoQueue=Promise.resolve();
function geocode(q){
  const c=geoCache(); if(c[q]) return Promise.resolve(c[q]);
  // OpenStreetMap Nominatim — по една заявка в секунда
  geoQueue=geoQueue.then(async()=>{
    const cc=geoCache(); if(cc[q]) return cc[q];
    try{
      const r=await fetch("https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=bg&accept-language=bg&q="+encodeURIComponent(q));
      const j=await r.json(); await new Promise(x=>setTimeout(x,1100));
      if(j&&j[0]){ cc[q]={lat:+j[0].lat,lon:+j[0].lon}; geoSave(cc); return cc[q]; }
    }catch(e){}
    return null;
  });
  return geoQueue;
}
function kmBetween(a,b){ const R=6371,t=x=>x*Math.PI/180; const dl=t(b.lat-a.lat), dn=t(b.lon-a.lon); const h=Math.sin(dl/2)**2+Math.cos(t(a.lat))*Math.cos(t(b.lat))*Math.sin(dn/2)**2; return 2*R*Math.asin(Math.sqrt(h)); }
function distText(km){ const road=km*1.3; const walk=Math.round(road/4.8*60), car=Math.max(3,Math.round(road/28*60));
  return {km:road.toFixed(road<10?1:0).replace(".",","), walk: walk>=90? Math.round(walk/60*10)/10+" ч" : walk+" мин", car: car+" мин"}; }
function navLinks(dest){
  const d=encodeURIComponent(dest.coords? dest.coords.lat+","+dest.coords.lon : dest.q);
  return {
    gWalk:"https://www.google.com/maps/dir/?api=1&travelmode=walking&destination="+d,
    gCar:"https://www.google.com/maps/dir/?api=1&travelmode=driving&destination="+d,
    gTransit:"https://www.google.com/maps/dir/?api=1&travelmode=transit&destination="+d,
    waze: dest.coords? "https://waze.com/ul?ll="+dest.coords.lat+"%2C"+dest.coords.lon+"&navigate=yes" : "https://waze.com/ul?q="+encodeURIComponent(dest.q)+"&navigate=yes"
  };
}
function myPlaces(){ const p=P(); p.places=p.places||[]; return p.places; }
function isMine(q){ return myPlaces().some(x=>x.q===q); }
async function navSheet(name,q,coords){
  const dest={name,q,coords:coords||null}; const L=navLinks(dest); const mine=isMine(q);
  const draw=(info)=>sheet(`<div class="grab"></div><p class="eyebrow">Как да стигна</p><div class="h2">${esc(name)}</div>
    <div id="navInfo">${info}</div>
    <div class="grid2">
      <a class="btn" href="${L.gWalk}" target="_blank" rel="noopener">Пеша · Google Maps</a>
      <a class="btn" href="${L.gCar}" target="_blank" rel="noopener">С кола · Google Maps</a>
      <a class="btn ghost" href="${L.waze}" target="_blank" rel="noopener">С кола · Waze</a>
      <a class="btn ghost" href="${L.gTransit}" target="_blank" rel="noopener">С градски транспорт</a>
    </div>
    <p class="note" style="margin:0">Waze е само за кола; за пеша и с транспорт ползвай Google Maps.</p>
    <button class="btn ghost block" id="navMine" type="button">${mine?"В Моите обекти ✓ — премахни":"Добави в Моите обекти"}</button>`,()=>{
      $("#navMine").onclick=()=>{ const P_=P(); if(isMine(q)) P_.places=myPlaces().filter(x=>x.q!==q); else { P_.places=myPlaces(); P_.places.push({id:"o"+Date.now(),name,q,type:"Обект",coords:dest.coords,visits:0}); } save(); closeSheet(); dropSound(); toast("Мои обекти", isMine(q)?"Добавено — виж меню → Мои обекти.":"Премахнато."); if(TAB==="world") rWorld(); };
    });
  draw(`<div class="thinking"><span class="spin"></span>Изчислявам разстоянието…</div>`);
  const [me,to]=await Promise.all([myPosition(), dest.coords?Promise.resolve(dest.coords):geocode(q)]);
  const el=$("#navInfo"); if(!el) return;
  if(me&&to){ dest.coords=to; const t=distText(kmBetween(me,to));
    el.innerHTML=`<div class="macros-lite"><div><b class="mono">${t.km} км</b><span>приблизително</span></div><div><b class="mono">${t.walk}</b><span>пеша</span></div><div><b class="mono">${t.car}</b><span>с кола</span></div></div><p class="note" style="margin:0">Точното време с трафика ти показва навигацията.</p>`; }
  else el.innerHTML=`<p class="note" style="margin:0">${me?"Не открих точния адрес — навигацията ще го намери.":NATIVE?"Разреши местоположение, за да видиш разстоянието.":"Разстоянието се показва в приложението FIT за Android."}</p>`;
}
function placesHTML(){
  const L=myPlaces();
  return `<div class="card" style="border-color:var(--accent)">
    <div class="row" style="justify-content:space-between"><p class="eyebrow" style="margin:0">Мои обекти</p><button class="btn sm" id="plAdd" type="button">+ Добави обект</button></div>
    <p class="muted" style="margin:0">Твоите зали, студиа, магазини, паркове и маршрути. Добавяш ги с бутона или със „Добави в Моите обекти“ от всяко място във FIT.</p>
    ${L.length?`<button class="btn ghost sm" id="plDist" type="button">Подреди по разстояние от мен</button>`:""}
  </div>
  ${L.length?L.map(o=>`<div class="card"><div class="row" style="justify-content:space-between;align-items:flex-start"><div style="min-width:0"><h2 class="h2">${esc(o.name)}</h2><div class="ex-meta">${esc(o.type||"Обект")}${o.addr?" · "+esc(o.addr):""}${o.dist?" · "+esc(o.dist):""}</div><div class="ex-meta">Посещения: ${o.visits||0}${o.last?" · последно "+new Date(o.last).toLocaleDateString("bg-BG"):""}</div></div><button class="x" type="button" data-pldel="${o.id}" aria-label="Премахни">×</button></div>
    <div class="row"><button class="btn sm" type="button" data-plnav="${o.id}">Как да стигна</button><button class="btn ghost sm" type="button" data-plvisit="${o.id}">Бях тук · +5 XP</button></div></div>`).join(""):`<div class="card"><p class="muted" style="margin:0">Още нямаш обекти.</p></div>`}`;
}
function addPlaceSheet(){
  const TYPES=["Фитнес","Пилатес / йога","Магазин","Парк / маршрут","Басейн","Друго"];
  sheet(`<div class="grab"></div><p class="eyebrow">Нов обект</p>
    <label class="f">Име<input class="in" id="pl-n" placeholder="напр. Моята зала, Южен парк"></label>
    <label class="f">Вид<select class="in" id="pl-t">${TYPES.map(t=>`<option>${t}</option>`).join("")}</select></label>
    <label class="f">Адрес<input class="in" id="pl-a" placeholder="ул., номер, квартал, град"></label>
    <button class="btn ghost block" id="pl-here" type="button">Използвай мястото, където съм сега</button>
    <button class="btn block" id="pl-ok" type="button">Запази</button>`,()=>{
    let here=null;
    $("#pl-here").onclick=async()=>{ $("#pl-here").textContent="Търся местоположението…"; here=await myPosition(); $("#pl-here").textContent= here? "Местоположението е взето ✓":"Не успях — въведи адрес"; };
    $("#pl-ok").onclick=()=>{ const n=$("#pl-n").value.trim().slice(0,50), a=$("#pl-a").value.trim().slice(0,120);
      if(!n){ $("#pl-n").focus(); return; } if(!a&&!here){ $("#pl-a").focus(); return; }
      const p=P(); p.places=myPlaces(); p.places.push({id:"o"+Date.now(),name:n,type:$("#pl-t").value,addr:a,q:a?(n+", "+a):n,coords:here,visits:0});
      save(); closeSheet(); rWorld(); dropSound(); toast("Мои обекти","„"+n+"“ е добавен."); };
  });
}
function wirePlaces(v){
  const p=P();
  const ad=$("#plAdd"); if(ad) ad.onclick=addPlaceSheet;
  v.querySelectorAll("[data-pldel]").forEach(b=>b.onclick=()=>{ p.places=myPlaces().filter(o=>o.id!==b.dataset.pldel); save(); rWorld(); });
  v.querySelectorAll("[data-plnav]").forEach(b=>b.onclick=()=>{ const o=myPlaces().find(x=>x.id===b.dataset.plnav); if(o) navSheet(o.name,o.q,o.coords); });
  v.querySelectorAll("[data-plvisit]").forEach(b=>b.onclick=()=>{ const o=myPlaces().find(x=>x.id===b.dataset.plvisit); if(!o) return; o.visits=(o.visits||0)+1; o.last=Date.now(); save(); rWorld(); addXP(5,"Посещение: "+o.name); });
  const pd=$("#plDist"); if(pd) pd.onclick=async()=>{ pd.textContent="Изчислявам…"; pd.disabled=true; const me=await myPosition(); if(!me){ pd.textContent=NATIVE?"Разреши местоположение":"Работи в приложението за Android"; return; }
    for(const o of myPlaces()){ const c=o.coords||await geocode(o.q); if(c){ o.coords=c; const t=distText(kmBetween(me,c)); o.km=+t.km.replace(",","."); o.dist=t.km+" км · пеша "+t.walk+" · кола "+t.car; } }
    p.places.sort((a,b)=>(a.km??1e9)-(b.km??1e9)); save(); rWorld(); };
}
