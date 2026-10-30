/* ============ НАВЪН ОКОЛО МЕН — ПАРКОВЕ, ГОРИ, ЕЗЕРА, ВЪРХОВЕ (GPS) ============ */
const NAT_T = {park:"Парк", forest:"Гора", lake:"Езеро", dam:"Язовир", sea:"Море / плаж", peak:"Връх", hut:"Хижа", ski:"Ски зона", reserve:"Природна зона"};
function season(d){ const m=(d||new Date()).getMonth(); return m<=1||m===11?"winter":m<=4?"spring":m<=7?"summer":"autumn"; }
const SEASON_N={winter:"зима",spring:"пролет",summer:"лято",autumn:"есен"};
let NAT=null, NATbusy=false, NATerr="", natPick=0;
function natCacheKey(me){ return "fit_nat_"+me.lat.toFixed(2)+"_"+me.lon.toFixed(2); }
async function loadNature(force){
  if(NATbusy) return NAT;
  NATbusy=true; NATerr="";
  try{
    const me=await myPosition();
    if(!me){ NATerr=NATIVE?"Разреши местоположение, за да намеря места около теб.":"Местата около теб се показват в приложението FIT за Android."; return null; }
    const key=natCacheKey(me);
    if(!force){ try{ const c=JSON.parse(localStorage.getItem(key)||"null"); if(c&&Date.now()-c.at<6*3600e3){ NAT={me,list:c.list}; return NAT; } }catch(e){} }
    const q=`[out:json][timeout:25];(
      way["leisure"="park"]["name"](around:7000,${me.lat},${me.lon});
      relation["leisure"="park"]["name"](around:7000,${me.lat},${me.lon});
      way["landuse"="forest"]["name"](around:20000,${me.lat},${me.lon});
      way["natural"="wood"]["name"](around:20000,${me.lat},${me.lon});
      way["natural"="water"]["name"]["water"~"lake|reservoir"](around:30000,${me.lat},${me.lon});
      relation["natural"="water"]["name"]["water"~"lake|reservoir"](around:30000,${me.lat},${me.lon});
      node["natural"="peak"]["name"](around:30000,${me.lat},${me.lon});
      relation["boundary"="protected_area"]["name"](around:35000,${me.lat},${me.lon});
      relation["leisure"="nature_reserve"]["name"](around:35000,${me.lat},${me.lon});
      way["natural"="beach"]["name"](around:60000,${me.lat},${me.lon});
      node["natural"="beach"]["name"](around:60000,${me.lat},${me.lon});
      node["tourism"="alpine_hut"]["name"](around:40000,${me.lat},${me.lon});
      way["tourism"="alpine_hut"]["name"](around:40000,${me.lat},${me.lon});
      way["landuse"="winter_sports"]["name"](around:90000,${me.lat},${me.lon});
      relation["landuse"="winter_sports"]["name"](around:90000,${me.lat},${me.lon});
    );out center tags 120;`;
    const r=await fetch("https://overpass-api.de/api/interpreter",{method:"POST",body:"data="+encodeURIComponent(q),headers:{"content-type":"application/x-www-form-urlencoded"}});
    const j=await r.json(); const seen=new Set(); const list=[];
    (j.elements||[]).forEach(e=>{
      const t=e.tags||{}; const name=t["name:bg"]||t.name; if(!name||seen.has(name)) return;
      const c=e.center||(e.lat?{lat:e.lat,lon:e.lon}:null); if(!c) return;
      const type= t.leisure==="park"?"park": (t.landuse==="forest"||t.natural==="wood")?"forest": t.natural==="water"?(t.water==="reservoir"?"dam":"lake"): t.natural==="beach"?"sea": t.natural==="peak"?"peak": t.tourism==="alpine_hut"?"hut": t.landuse==="winter_sports"?"ski":"reserve";
      seen.add(name); const km=kmBetween(me,{lat:c.lat,lon:c.lon});
      list.push({name,type,lat:c.lat,lon:c.lon,km,ele:t.ele?+t.ele:null});
    });
    list.sort((a,b)=>a.km-b.km);
    const out=[]; const per={park:8,forest:6,lake:4,dam:4,sea:5,peak:5,hut:5,ski:4,reserve:4}; const cnt={};
    list.forEach(x=>{ cnt[x.type]=(cnt[x.type]||0)+1; if(cnt[x.type]<=per[x.type]) out.push(x); });
    try{ localStorage.setItem(key,JSON.stringify({at:Date.now(),list:out})); }catch(e){}
    NAT={me,list:out}; return NAT;
  }catch(e){ NATerr="Не успях да заредя местата наоколо. Провери интернета."; return null; }
  finally{ NATbusy=false; }
}
// подходящо ли е мястото сега: сезон + времето
function natFit(x, wx){
  const s=season(); const c=wx?wx.w.current:null; const d=wx?wx.w.daily:null;
  const code=c?c.weather_code:2, t=c?c.apparent_temperature:15, wind=c?(c.wind_gusts_10m||0):10, snow=code>=71&&code<=86;
  const storm=code>=95, rain=code>=61&&code<=82&&!snow, fog=code===45||code===48;
  let ok=true, why="", act="";
  const acts={
    park:{winter:snow?"Разходка в снега — 40 минути бързо ходене":"Бързо ходене 30–40 минути",spring:"Лек крос или ролери",summer:t>=28?"Бягане рано сутрин или вечер в сянка":"Бягане и упражнения на открито",autumn:"Разходка сред есенните листа и стречинг"},
    forest:{winter:snow?"Зимна разходка с подходящи обувки":"Скандинавско ходене по горските пътеки",spring:"Поход по еко пътека",summer:"Поход в сянката на гората — по-хладно от града",autumn:"Есенен поход — най-красивият сезон в гората"},
    lake:{winter:"Разходка около водата — внимавай с леда",spring:"Колело около езерото",summer:t>=26?"Колело или гребане — освежаване до водата":"Колело и разходка до водата",autumn:"Разходка и колело край водата"},
    peak:{winter:"Само с опит, екипировка и водач — иначе избери по-ниско място",spring:"Поход до върха, ако пътеките са сухи",summer:"Поход до върха — тръгни рано, вземи вода и яке",autumn:"Поход до върха — провери кога се стъмва"},
    dam:{winter:"Разходка около язовира — внимавай с леда",spring:"Колело по пътя около язовира",summer:t>=26?"Колело и разходка; къпане само на разрешени места":"Колело и разходка до водата",autumn:"Разходка и колело край язовира"},
    sea:{winter:"Разходка по брега — свеж морски въздух",spring:"Бягане по пясъка — тренира и прасците",summer:t>=24?"Плуване и плажен волейбол — следи флаговете на спасителите":"Бягане и разходка по плажа",autumn:"Разходка и бягане по брега"},
    hut:{winter:"Само с опит и екипировка — иначе избери по-ниско място",spring:"Поход до хижата — провери пътеката за сняг",summer:"Поход до хижата и обяд там",autumn:"Поход до хижата — тръгни рано, стъмва се по-рано"},
    ski:{winter:snow||t<=3?"Ски или сноуборд — загрей 10 минути преди първото спускане":"Разходка в планината",spring:"Поход или планинско колело",summer:"Поход, лифт и планинско колело",autumn:"Поход в планината"},
    reserve:{winter:"Кратка разходка по маркираните пътеки",spring:"Еко пътека и наблюдение на природата",summer:"Еко пътека рано сутрин",autumn:"Еко пътека сред есенните цветове"}
  };
  act=acts[x.type][s];
  if(storm){ ok=false; why="буря"; }
  else if(rain){ ok=false; why="дъжд"; }
  else if(fog&&(x.type==="peak"||x.type==="forest")){ ok=false; why="мъгла"; }
  else if(wind>=50&&/peak|lake|dam|sea|hut|ski/.test(x.type)){ ok=false; why="силен вятър"; }
  else if(x.type==="ski"&&s!=="winter"&&s!=="summer"){ ok=true; }
  else if(t>=33&&(x.type==="peak"||x.type==="park")){ ok=false; why="жега — избери гора или вода"; }
  else if(s==="winter"&&(x.type==="peak"||x.type==="hut")){ ok=false; why="зимни условия в планината"; }
  else if(x.type==="sea"&&s==="summer"&&t<20){ ok=true; }
  else if(t<=-8){ ok=false; why="силен студ"; }
  return {ok, why, act, s};
}
function natCandidates(){
  if(!NAT) return [];
  const sBoost={winter:{ski:-40},summer:{sea:-30,lake:-10,dam:-10,forest:-5},spring:{park:-5},autumn:{forest:-15,hut:-10}}[season()]||{};
  const score=x=>{ const f=natFit(x,WX); return (f.ok?0:1000)+x.km*(x.type==="park"?1.4:/peak|hut|ski|sea/.test(x.type)?0.5:0.8)+(sBoost[x.type]||0); };
  return NAT.list.slice().sort((a,b)=>score(a)-score(b));
}
function indoorFallback(){
  const mine=(P().places||[]).filter(o=>/Фитнес|Пилатес|Басейн/.test(o.type||""));
  if(mine.length) return {name:mine[0].name,q:mine[0].q,coords:mine[0].coords,act:"Тренировка на закрито в твоя обект"};
  const g=GYMS[new Date().getDate()%GYMS.length]; return {name:g.n,q:g.q,act:"Тренировка или басейн на закрито"};
}
async function natPopup(force){
  const p=P(); if(!p) return; const t=todayISO();
  if(!force && p.log[t]&&p.log[t].natShown) return;
  await loadNature(); const cands=natCandidates(); if(!cands.length && !force) return;
  p.log[t]=p.log[t]||{}; p.log[t].natShown=1; save();
  natPick=0; showNatSheet(cands);
}
function showNatSheet(cands){
  const x=cands[natPick%Math.max(1,cands.length)];
  if(!x){ return; }
  const f=natFit(x,WX); const dt=distText(x.km);
  const fb=f.ok?null:indoorFallback();
  if($("#sheetHost").innerHTML && !$("#natSheet")) return;
  sheet(`<div id="natSheet" style="display:contents"><div class="grab"></div>
    <p class="eyebrow">${f.ok?"Идея за днес · "+SEASON_N[f.s]:"Форсмажор · "+esc(f.why)}${WX?" · "+Math.round(WX.w.current.temperature_2m)+"°":""}</p>
    ${f.ok?`<div class="h-display">${esc(x.name)}</div>
      <div class="chips"><span class="pill accent">${NAT_T[x.type]}</span><span class="pill good">${dt.km} км · пеша ${dt.walk} · кола ${dt.car}</span></div>
      <p style="margin:0;font-weight:700">${esc(f.act)}</p>`
    :`<div class="h-display">${esc(fb.name)}</div><p style="margin:0;font-weight:700">${esc(fb.act)}</p><p class="muted" style="margin:0">Днес не е за ${esc(x.name)} — ${esc(f.why)}. FIT смени идеята с място на закрито.</p>`}
    <div class="grid2">
      <button class="btn" id="natGo" type="button">Как да стигна</button>
      <button class="btn hot" id="natDo" type="button">Ще отида · +15 XP</button>
      <button class="btn ghost" id="natNext" type="button">Друга идея</button>
      <button class="btn ghost" id="natSave" type="button">В Моите обекти</button>
    </div></div>`,()=>{
      $("#natGo").onclick=()=>{ closeSheet(); f.ok? navSheet(x.name, x.name, {lat:x.lat,lon:x.lon}) : navSheet(fb.name, fb.q, fb.coords); };
      $("#natDo").onclick=()=>{ closeSheet(); addXP(15,"Активност: "+(f.ok?x.name:fb.name)); };
      $("#natNext").onclick=()=>{ natPick++; closeSheet(); showNatSheet(cands); };
      $("#natSave").onclick=()=>{ const pp=P(); pp.places=myPlaces(); const nm=f.ok?x.name:fb.name; if(!pp.places.some(o=>o.name===nm)) pp.places.push({id:"o"+Date.now(),name:nm,type:f.ok?NAT_T[x.type]:"Фитнес",q:f.ok?x.name:fb.q,coords:f.ok?{lat:x.lat,lon:x.lon}:fb.coords,visits:0}); save(); toast("Мои обекти","„"+nm+"“ е добавен."); };
    });
  dropSound();
}
function natureHTML(){
  if(!NAT) return `<div class="card"><p class="eyebrow">Навън около мен</p><p class="muted" style="margin:0">${NATbusy?"Търся паркове, гори, езера и върхове около теб…":esc(NATerr||"Търся места около теб…")}</p>${NATerr?`<button class="btn ghost sm" id="natRetry" type="button">Опитай пак</button>`:""}</div>`;
  const c=natCandidates();
  return `<div class="card" style="border-color:var(--accent)"><p class="eyebrow">Навън около мен · ${SEASON_N[season()]}${WX?" · "+esc(WMO[WX.w.current.weather_code]||"")+" "+Math.round(WX.w.current.temperature_2m)+"°":""}</p>
    <p class="muted" style="margin:0">Места по GPS, подредени по това кое е най-подходящо сега — според сезона, времето и разстоянието.</p>
    <div class="row"><button class="btn sm" id="natIdea" type="button">Дай ми идея</button><button class="btn ghost sm" id="natRefresh" type="button">Обнови по местоположение</button></div></div>
  ${c.map(x=>{ const f=natFit(x,WX); const dt=distText(x.km); return `<div class="card" style="${f.ok?"":"opacity:.75"}">
    <div class="row" style="justify-content:space-between;align-items:flex-start"><div style="min-width:0"><h2 class="h2">${esc(x.name)}</h2><div class="ex-meta">${NAT_T[x.type]}${x.ele?" · "+x.ele+" м":""} · ${dt.km} км · пеша ${dt.walk} · кола ${dt.car}</div></div><span class="pill ${f.ok?"good":"hot"}">${f.ok?"Подходящо сега":"Не днес"}</span></div>
    <p style="margin:0">${f.ok?esc(f.act):"Днес не: "+esc(f.why)+"."}</p>
    <div class="row"><button class="btn sm" type="button" data-natnav="${encodeURIComponent(JSON.stringify([x.name,x.lat,x.lon]))}">Как да стигна</button></div></div>`; }).join("")}
  <p class="note">Местата са от OpenStreetMap. Местоположението ти остава на телефона — за търсенето се изпращат само координатите.</p>`;
}
function wireNature(v){
  const r=$("#natRetry"); if(r) r.onclick=()=>{ NATerr=""; rWorld(); loadNature(true).then(()=>{ if(TAB==="world") rWorld(); }); };
  const rf=$("#natRefresh"); if(rf) rf.onclick=()=>{ MYPOS=null; NAT=null; rWorld(); loadNature(true).then(()=>{ if(TAB==="world") rWorld(); }); };
  const id=$("#natIdea"); if(id) id.onclick=()=>{ natPick=0; showNatSheet(natCandidates()); };
  v.querySelectorAll("[data-natnav]").forEach(b=>b.onclick=()=>{ const [n,la,lo]=JSON.parse(decodeURIComponent(b.dataset.natnav)); navSheet(n,n,{lat:la,lon:lo}); });
}
