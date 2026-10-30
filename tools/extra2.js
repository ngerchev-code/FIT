/* ============ AI РАЗПОЗНАВАНЕ (APK) ============ */
const AI_MODEL = "claude-sonnet-5-5";
function aiCfg(){ return S.ai||{}; }
function aiReady(){ const a=aiCfg(); return !!(SAMPLE_IMG || a.url || a.key); }
async function shrinkImage(file){
  const url=URL.createObjectURL(file);
  try{
    const img=await new Promise((res,rej)=>{ const i=new Image(); i.onload=()=>res(i); i.onerror=rej; i.src=url; });
    const k=Math.min(1,1024/Math.max(img.naturalWidth,img.naturalHeight));
    const c=document.createElement("canvas"); c.width=Math.round(img.naturalWidth*k); c.height=Math.round(img.naturalHeight*k);
    c.getContext("2d").drawImage(img,0,0,c.width,c.height);
    return c.toDataURL("image/jpeg",0.85).split(",")[1];
  } finally { URL.revokeObjectURL(url); }
}
function parseJSONLoose(t){ const a=t.indexOf("{"), b=t.lastIndexOf("}"); if(a<0||b<a) throw {code:"invalid_json"}; return JSON.parse(t.slice(a,b+1)); }
async function aiScan(file, prompt, signal){
  if(SAMPLE && SAMPLE_IMG) return SAMPLE.json(prompt,{images:[file],signal});
  const a=aiCfg(); const data=await shrinkImage(file);
  if(a.url){
    const r=await fetch(a.url,{method:"POST",signal,headers:{"content-type":"application/json"},body:JSON.stringify({image:data,prompt})});
    if(!r.ok) throw {code:r.status===429?"rate_limited":"upstream_error"};
    const j=await r.json(); return parseJSONLoose(j.text||"");
  }
  if(a.key){
    const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",signal,headers:{"content-type":"application/json","x-api-key":a.key,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
      body:JSON.stringify({model:AI_MODEL,max_tokens:1800,messages:[{role:"user",content:[{type:"image",source:{type:"base64",media_type:"image/jpeg",data}},{type:"text",text:prompt}]}]})});
    if(r.status===401) throw {code:"bad_key"};
    if(!r.ok) throw {code:r.status===429?"rate_limited":"upstream_error"};
    const j=await r.json(); return parseJSONLoose((j.content||[]).map(c=>c.text||"").join(""));
  }
  throw {code:"not_configured"};
}
function aiSheet(){
  const a=aiCfg();
  sheet(`<div class="grab"></div><p class="eyebrow">Настройки</p><div class="h2">AI разпознаване на уреди</div>
    <p class="muted" style="margin:0">FIT изпраща снимката на Claude и получава уреда и до 10 упражнения за твоя профил. Избери един от двата начина.</p>
    <label class="f">Адрес на FIT сървъра (за всички потребители)<input class="in" id="ai-url" value="${esc(a.url||"")}" placeholder="https://….netlify.app/api/scan" inputmode="url"></label>
    <label class="f">Или личен ключ за Claude API (само на този телефон)<input class="in" id="ai-key" value="${esc(a.key||"")}" placeholder="sk-ant-…" autocomplete="off"></label>
    <p class="note" style="margin:0">Ключът остава само на този телефон и не се изпраща никъде освен към Claude. Не го давай на други хора.</p>
    <div class="row"><button class="btn" id="ai-ok" type="button" style="flex:1">Запази</button><button class="btn ghost" id="ai-clear" type="button">Изчисти</button></div>`,()=>{
    $("#ai-ok").onclick=()=>{ S.ai={url:$("#ai-url").value.trim(),key:$("#ai-key").value.trim()}; save(); closeSheet(); render(); toast("AI разпознаване", aiReady()?"Готово — снимай уред в Скенера.":"Не е зададен сървър или ключ."); };
    $("#ai-clear").onclick=()=>{ S.ai={}; save(); closeSheet(); render(); };
  });
}

/* ============ ЛЯВО МЕНЮ ============ */
const DRAWER = [
  ["Фитнес конзола",[["today","Днес"],["plan","Програма"],["scan","Скенер на уреди"]]],
  ["Лайфстайл",[["w:weather","Време и прогноза"],["w:events","Събития и походи"],["w:gyms","Фитнеси и карти"],["w:subst","Добавки и безопасност"],["w:shops","Магазини и outlet-и"],["w:news","Новини"],["w:people","Хора и класиране"],["mama","MAMA — храна"]]],
  ["Настройки",[["x:ai","AI разпознаване"],["x:notif","Известия"],["x:profile","Моят профил"]]]
];
function openDrawer(){
  const host=$("#sheetHost");
  host.innerHTML=`<div class="scrim" id="scrim" style="align-items:stretch;justify-content:flex-start"><nav class="drawer" aria-label="Меню">
    <div class="logo" style="padding:4px 0 10px"><span class="plate" aria-hidden="true"></span><span>FIT<small class="logo-sub">Fitness Intelligent Team</small></span></div>
    ${DRAWER.map(([h,items])=>`<p class="eyebrow" style="margin:14px 0 4px">${h}</p>${items.map(([k,n])=>`<button class="drawer-i" type="button" data-dr="${k}">${n}</button>`).join("")}`).join("")}
    <p class="note" style="margin-top:auto">По-силни днес. По-добри хора утре.</p></nav></div>`;
  $("#scrim").onclick=e=>{ if(e.target.id==="scrim") closeSheet(); };
  host.querySelectorAll("[data-dr]").forEach(b=>b.onclick=()=>{ const k=b.dataset.dr; closeSheet();
    if(k.startsWith("w:")){ worldSeg=k.slice(2); show("world"); }
    else if(k==="x:ai") aiSheet();
    else if(k==="x:notif") notifSheet();
    else if(k==="x:profile") onboarding(false,P());
    else show(k); });
}

/* ============ ИДЕИ ЗА АКТИВНОСТ И ФОРСМАЖОР ============ */
const IDEAS_OUT = ["Бърза разходка 30 минути в парка","Колело 45 минути в спокойно темпо","Лек крос 20–30 минути","Поход до близкия връх или хижа","Скандинавско ходене 40 минути","Футбол или баскетбол с приятели","Изкачване по стълби на открито — 10 серии"];
const IDEAS_IN = ["Плуване 30 минути на закрито","Йога или стречинг 25 минути вкъщи","Катерачна зала — пробна тренировка","Групова тренировка в залата","Тренировка с тегло на тялото: 4 кръга клек, лицеви опори, планк","Пътека с наклон 30 минути в залата","Мобилност за гръб и рамене — 15 минути"];
function dayIdea(code, tmax, wind, dayIdx){
  const bad = code>=61 || code===45 || code===48 || tmax>=33 || tmax<=-3 || wind>=50;
  const why = code>=95?"буря":code>=71&&code<=86?"сняг":code>=61?"дъжд":(code===45||code===48)?"мъгла":tmax>=33?"жега":tmax<=-3?"студ":wind>=50?"силен вятър":"";
  const list = bad?IDEAS_IN:IDEAS_OUT; const idea=list[(new Date().getDate()+dayIdx)%list.length];
  return {bad, why, idea};
}
function ideaToday(){
  if(!WX) return null; const d=WX.w.daily; return dayIdea(d.weather_code[0], d.temperature_2m_max[0], d.wind_speed_10m_max[0], 0);
}
function ideaPopup(){
  const id=ideaToday(); const p=P(); if(!id||!p) return;
  const t=todayISO(); if(p.log[t]&&p.log[t].ideaShown) return;
  p.log[t]=p.log[t]||{}; p.log[t].ideaShown=1; save();
  setTimeout(()=>{ if($("#sheetHost").innerHTML) return; sheet(`<div class="grab"></div>
    <p class="eyebrow">${id.bad?"Форсмажор · "+esc(id.why):"Идея за днес · "+esc(WX.city)}</p>
    <div class="h-display">${esc(id.idea)}</div>
    <p class="muted" style="margin:0">${id.bad?"Времето не е за навън — FIT смени плана с активност на закрито.":"Времето е хубаво — излез навън след тренировката."} ${esc(trainAdvice())}</p>
    <div class="row"><button class="btn hot" id="idDone" type="button" style="flex:1">Ще го направя · +15 XP</button><button class="btn ghost" data-close type="button">По-късно</button></div>`,host=>{
      host.querySelectorAll("[data-close]").forEach(b=>b.onclick=closeSheet);
      $("#idDone").onclick=()=>{ closeSheet(); addXP(15,"Активност: "+id.idea); };
    }); }, 1800);
}

/* ============ ИЗВЕСТИЯ (ANDROID) ============ */
function notifCfg(){ return Object.assign({on:true, morning:"08:30", evening:"17:30"}, S.notif||{}); }
async function scheduleNotifs(){
  const LN=Plug("LocalNotifications"); const p=P(); if(!NATIVE||!LN||!p) return;
  const cfg=notifCfg();
  try{
    const pend=await LN.getPending(); if(pend&&pend.notifications&&pend.notifications.length) await LN.cancel({notifications:pend.notifications.map(n=>({id:n.id}))});
    if(!cfg.on) return;
    let perm=await LN.checkPermissions(); if(perm.display!=="granted") perm=await LN.requestPermissions(); if(perm.display!=="granted") return;
    const out=[]; const [mh,mm]=cfg.morning.split(":").map(Number), [eh,em]=cfg.evening.split(":").map(Number);
    for(let i=1;i<=7;i++){
      const day=new Date(); day.setDate(day.getDate()+i);
      const dow=day.getDay();
      if(trainingDays(p).includes(dow)){
        const at=new Date(day); at.setHours(mh,mm,0,0);
        const di=dayIndexFor(p,dow); const n=buildDay(p,di).list.length;
        out.push({id:1000+i,title:"Днес тренираме",body:`${SPLIT_N[SPLITS[p.days][di%SPLITS[p.days].length]]} · ${n} уреда · ~${p.minutes} мин. По-силни днес.`,schedule:{at,allowWhileIdle:true}});
      }
      const at2=new Date(day); at2.setHours(eh,em,0,0);
      let title="Идея за активност", body=IDEAS_OUT[(day.getDate())%IDEAS_OUT.length];
      if(WX){ const d=WX.w.daily; if(i<d.time.length){ const id=dayIdea(d.weather_code[i], d.temperature_2m_max[i], d.wind_speed_10m_max[i], i); title=id.bad?"Форсмажор: "+id.why:"Хубаво време навън"; body=id.idea+(id.bad?" — на закрито.":" — излез навън."); } }
      out.push({id:2000+i,title,body,schedule:{at:at2,allowWhileIdle:true}});
    }
    (p.events||[]).forEach((e,k)=>{ [7,1].forEach(b=>{ const at=new Date(e.date+"T09:00:00"); at.setDate(at.getDate()-b); if(at>new Date()) out.push({id:3000+k*10+b,title:b===1?"Утре: "+e.name:"След седмица: "+e.name,body:b===1?"Лек ден, вода и ранен сън. Успех!":"Последна седмица подготовка — не прекалявай с натоварването.",schedule:{at,allowWhileIdle:true}}); }); });
    if(out.length) await LN.schedule({notifications:out});
  }catch(e){}
}
function notifSheet(){
  const c=notifCfg();
  sheet(`<div class="grab"></div><p class="eyebrow">Настройки</p><div class="h2">Известия</div>
    <p class="muted" style="margin:0">Сутрин в тренировъчните дни, вечер — идея за активност според прогнозата (при дъжд, жега или вятър — форсмажор с активност на закрито) и напомняния преди твоите събития.</p>
    <label class="f"><span>Известия</span><select class="in" id="nf-on"><option value="1" ${c.on?"selected":""}>Включени</option><option value="0" ${c.on?"":"selected"}>Изключени</option></select></label>
    <div class="grid2"><label class="f">Сутрин<input class="in mono" id="nf-m" type="time" value="${c.morning}"></label><label class="f">Вечер<input class="in mono" id="nf-e" type="time" value="${c.evening}"></label></div>
    <button class="btn block" id="nf-ok" type="button">Запази</button>
    ${NATIVE?"":`<p class="note" style="margin:0">Известията работят в приложението FIT за Android.</p>`}`,()=>{
    $("#nf-ok").onclick=()=>{ S.notif={on:$("#nf-on").value==="1",morning:$("#nf-m").value||"08:30",evening:$("#nf-e").value||"17:30"}; save(); closeSheet(); scheduleNotifs(); toast("Известия", S.notif.on?"Нагласени за следващите 7 дни.":"Изключени."); };
  });
}
