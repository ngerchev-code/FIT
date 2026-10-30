/* ============ ЧАТ БОТ „ПОПИТАЙ FIT“ ============ */
let CHAT=[], chatBusy=false;
const CHAT_SUGG=["Какво тренирам днес?","Къде да изляза навън?","Как да запиша час за пилатес?","Какво да ям след тренировка?","Безопасен ли е кофеинът за мен?","Какво е времето?"];
function goBtn(k,label){ return {k,label}; }
function workoutSummary(){
  const p=P(), dow=new Date().getDay(), di=dayIndexFor(p,dow);
  if(di<0){ const next=trainingDays(p).find(d=>d>dow) ?? trainingDays(p)[0]; return "Днес е ден за възстановяване. Следващата тренировка е в "+DAYN[next]+". Разходка 20–30 минути и разтягане са идеални днес."; }
  const day=buildDay(p,di); const ex=day.list.slice(0,5).map(it=>it.ex[0]+" ("+presc(p,it.ex[2])[0]+")").join(", ");
  return "Днес: "+SPLIT_N[day.split]+", "+day.list.length+" уреда, около "+p.minutes+" минути, режим „"+MODES[modeOf(p)].n+"“. Започни с: "+ex+".";
}
function localAnswer(q){
  const s=q.toLowerCase(); const p=P(); const has=(...w)=>w.some(x=>s.includes(x));
  if((/(^|\s)ям(\s|$|\?)/.test(s)||has("храна","хран","калори","протеин на ден","меню","mama","мама","диет"))) return {t:"Ориентирът ти за деня и чинията на FIT са в MAMA. След тренировка: 20–40 г протеин и въглехидрати до 2 часа.", go:[goBtn("mama","Храна и MAMA"),goBtn("w:food","Заведения")]};
  if(has("днес","тренир","упражн","програм","серии")) return {t:workoutSummary(), go:[goBtn("today","Днешна тренировка"),goBtn("plan","Цялата програма")]};
  if(has("време","прогноз","дъжд","температур","вали")){ if(WX){ const c=WX.w.current; return {t:`В ${WX.city} сега е ${Math.round(c.temperature_2m)}° (усеща се ${Math.round(c.apparent_temperature)}°), ${WMO[c.weather_code]||""}. ${trainAdvice()}`, go:[goBtn("w:weather","Подробна прогноза")]}; } return {t:"Прогнозата се зарежда в раздела Време.", go:[goBtn("w:weather","Отвори Време")]}; }
  if(has("навън","парк","разход","планин","море","плаж","гора","язовир","хижа","поход","ски","колело")){
    const c=(typeof natCandidates==="function")?natCandidates():[]; const ok=c.filter(x=>natFit(x,WX).ok);
    if(ok.length){ const x=ok[0]; return {t:`Предлагам ${x.name} (${NAT_T[x.type]}, ${distText(x.km).km} км): ${natFit(x,WX).act}.`, go:[goBtn("w:nature","Още места около мен"),goBtn("x:natidea","Дай ми идея")]}; }
    return {t:"Ще намеря паркове, гори, море, планина и язовири около теб по GPS — според сезона и времето.", go:[goBtn("w:nature","Навън около мен")]};
  }
  if(has("пилатес","reformer","реформ","йога","запиш","резерв час","час за")) return {t:"В „Пилатес и часове“ са студиата в София. Натисни „Записах час“, за да ти напомням вечерта преди и 2 часа преди. Ако часът е пълен — „Следи място“ и ще те подсещам да провериш за освободено място.", go:[goBtn("w:pilates","Пилатес и часове")]};
  if(has("свободн","място","пълен")) return {t:"Добави часа в „Следя за свободно място“. Щом въведеш, че местата са например 7/8, веднага излиза прозорец „Има 1 място!“ с бутон за записване.", go:[goBtn("w:pilates","Следи за място")]};
  if(has("заведен","ресторант","rezzo","резерв","обяд","вечеря навън","бранч")) return {t:"В „Заведения“ има подбрани места с отлични отзиви — растителни, поке с протеин, смути и бранч. Резервираш директно в Rezzo.", go:[goBtn("w:food","Заведения")]};
  const sub=SUBST.find(x=>x.n.toLowerCase().split(/[ (\/,]/).some(w=>w.length>3&&s.includes(w)));
  if(sub||has("добавк","витамин","минерал","креатин","кофеин","алерг")){
    if(sub){ const A=p.allergies||[]; const hit=sub.al.filter(a=>A.includes(a)); const lv={ok:"Безопасно",care:"Внимание",danger:"ОПАСНО"}[sub.lvl];
      return {t:`${sub.n} — ${lv}. ${sub.why} ${sub.lvl!=="danger"&&sub.dose?"Доза: "+sub.dose+" ":""}${sub.care?sub.care+" ":""}${hit.length?"Внимание: съдържа "+hit.map(a=>ALLERGENS[a]).join(", ")+", които си отбелязал.":""}`, go:[goBtn("w:subst","Добавки и безопасност")]}; }
    return {t:"В „Добавки“ всичко е маркирано: зелено — безопасно, жълто — внимание, червено — опасно. Отбележи алергиите си и продуктите с тях светват в червено.", go:[goBtn("w:subst","Добавки и безопасност")]};
  }
  if(has("магазин","outlet","аутлет","маратонк","екип","обувк","buzz","decathlon","depot")) return {t:"В „Магазини“ са спортните магазини и outlet-ите в София с бутон „Как да стигна“.", go:[goBtn("w:shops","Магазини и outlet-и")]};
  if(has("фитнес","зала","multisport","мултиспорт","coolfit","карта")) return {t:"В „Фитнеси“ са големите зали в София и картите MultiSport и Coolfit. Можеш да си запишеш цена, карта и паркинг за всяка зала.", go:[goBtn("w:gyms","Фитнеси и карти")]};
  if(has("уред","снима","скенер","машин")) return {t:aiReady()?"Отвори Скенер и снимай уреда — ще получиш до 10 упражнения за твоя профил.":"Отвори Скенер, снимай уреда и го избери от списъка. За автоматично разпознаване включи AI в менюто.", go:[goBtn("scan","Скенер"),goBtn("x:ai","AI разпознаване")]};
  if(has("как да стигна","навигац","waze","google maps","разстояни")) return {t:"При всяко място натисни „Как да стигна“ — разстояние, пеша или с кола, Google Maps или Waze.", go:[goBtn("w:places","Мои обекти")]};
  if(has("обект")) return {t:"„Мои обекти“ пази твоите места, подрежда ги по разстояние и брои посещенията ти.", go:[goBtn("w:places","Мои обекти")]};
  if(has("събити","маратон","ком","емине")) return {t:"В „Събития“ добавяш маратон или поход с дата — FIT брои дните и ти напомня 7 дни и 1 ден преди.", go:[goBtn("w:events","Събития")]};
  if(has("известия","звук","напомн")) return {t:"Известията идват дори когато FIT е затворено, със звук „капка“. Часовете ги сменяш в Известия.", go:[goBtn("x:notif","Известия")]};
  if(has("ниво","xp","точки","серия")){ const L=lvl(p); return {t:`Имаш ${p.xp} XP, ниво „${L.name}“, серия ${p.streak}. Точки получаваш за тренировки, предизвикателства, активности навън и посещения.`, go:[goBtn("w:people","Класиране")]}; }
  if(has("цел","профил","алергии","ограничен")) return {t:`Целта ти е „${goalName(p)}“. Промени я от „Моят профил“.`, go:[goBtn("x:profile","Моят профил")]};
  return null;
}
function appContext(){
  const p=P(); const c=WX?WX.w.current:null;
  return `Ти си FIT — дружелюбен асистент в приложението FIT (Fitness Intelligent Team) за начинаещи във фитнеса в България. Отговаряй на български, кратко (до 6 изречения), конкретно и безопасно. Не поставяш диагнози; при болка, заболяване или лекарства съветваш лекар. Никога не даваш дози за забранени или опасни вещества.
Потребител: ${p.name}, ${p.age} г., ${p.sex==="f"?"жена":"мъж"}, ${p.weight} кг, цели: ${goalName(p)}, ниво ${p.level}, ограничения: ${p.limits.map(x=>LIMITS[x]).join(", ")||"няма"}, алергии: ${(p.allergies||[]).map(a=>ALLERGENS[a]).join(", ")||"няма"}.
Днес: ${workoutSummary()}
${c?`Време в ${WX.city}: ${Math.round(c.temperature_2m)}°, ${WMO[c.weather_code]||""}.`:""}
Раздели в приложението, към които можеш да насочиш с маркер в края на отговора: [[today]] Днес, [[plan]] Програма, [[scan]] Скенер, [[mama]] Храна и MAMA, [[w:nature]] Навън около мен, [[w:pilates]] Пилатес и часове, [[w:food]] Заведения с Rezzo, [[w:gyms]] Фитнеси, [[w:subst]] Добавки, [[w:shops]] Магазини, [[w:weather]] Време, [[w:events]] Събития, [[w:places]] Мои обекти. Сложи най-много 2 маркера.`;
}
async function aiText(turns){
  if(SAMPLE){ const r=await SAMPLE(turns,{cache:false,modelTier:"quick"}); return r.text; }
  const a=aiCfg();
  if(a.url){ const r=await fetch(a.url,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({chat:turns})}); if(!r.ok) throw {code:"upstream_error"}; return (await r.json()).text||""; }
  if(a.key){ const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"content-type":"application/json","x-api-key":a.key,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},body:JSON.stringify({model:AI_MODEL,max_tokens:700,system:turns[0].content,messages:turns.slice(1)})}); if(r.status===401) throw {code:"bad_key"}; if(!r.ok) throw {code:"upstream_error"}; const j=await r.json(); return (j.content||[]).map(c=>c.text||"").join(""); }
  throw {code:"not_configured"};
}
function chatAiReady(){ const a=aiCfg(); return !!(SAMPLE||a.url||a.key); }
function parseGo(text){ const go=[]; const t=text.replace(/\[\[([a-z:]+)\]\]/g,(m,k)=>{ const lbl={today:"Днес",plan:"Програма",scan:"Скенер",mama:"Храна и MAMA","w:nature":"Навън около мен","w:pilates":"Пилатес и часове","w:food":"Заведения","w:gyms":"Фитнеси","w:subst":"Добавки","w:shops":"Магазини","w:weather":"Време","w:events":"Събития","w:places":"Мои обекти"}[k]; if(lbl&&go.length<2) go.push({k,label:lbl}); return ""; }); return {t:t.trim(),go}; }
function chatGo(k){ closeSheet();
  if(k.startsWith("w:")){ worldSeg=k.slice(2); show("world"); }
  else if(k==="x:ai") aiSheet(); else if(k==="x:notif") notifSheet(); else if(k==="x:profile") onboarding(false,P());
  else if(k==="x:natidea"){ natPick=0; loadNature().then(()=>showNatSheet(natCandidates())); }
  else show(k); }
function chatBubble(m){ const me=m.role==="user";
  return `<div style="align-self:${me?"flex-end":"flex-start"};max-width:88%;display:flex;flex-direction:column;gap:6px">
    <div style="background:${me?"var(--accent)":"var(--surface-2)"};color:${me?"var(--on-accent)":"var(--ink)"};border:1px solid ${me?"var(--accent)":"var(--line)"};border-radius:16px;padding:10px 12px;white-space:pre-wrap">${esc(m.t)}</div>
    ${(m.go||[]).length?`<div class="row" style="gap:6px">${m.go.map(g=>`<button class="btn ghost sm" type="button" data-chatgo="${g.k}">${esc(g.label)}</button>`).join("")}</div>`:""}</div>`; }
function openChat(){
  if(!CHAT.length) CHAT.push({role:"assistant",t:`Здравей, ${P().name}! Аз съм FIT. Питай ме за тренировката, храната, добавките, времето, места навън, пилатес, заведения или как работи нещо в приложението.`});
  sheet(`<div class="grab"></div><div class="row" style="justify-content:space-between"><div class="h2">Попитай FIT</div><span class="pill ${chatAiReady()?"good":"accent"}">${chatAiReady()?"AI включен":"Помощник"}</span></div>
    <div id="chatLog" style="display:flex;flex-direction:column;gap:10px;max-height:52vh;overflow:auto;padding-right:2px">${CHAT.map(chatBubble).join("")}${chatBusy?`<div class="thinking"><span class="spin"></span>Мисля…</div>`:""}</div>
    <div class="chips" style="flex-wrap:nowrap;overflow-x:auto;padding-bottom:4px">${CHAT_SUGG.map(q=>`<button class="chip" type="button" data-sugg="${esc(q)}" style="flex:0 0 auto">${esc(q)}</button>`).join("")}</div>
    <form id="chatForm" class="row" style="flex-wrap:nowrap"><input class="in" id="chatIn" placeholder="Напиши въпрос…" autocomplete="off" enterkeyhint="send"><button class="btn" type="submit" ${chatBusy?"disabled":""}>Питай</button></form>
    ${chatAiReady()?"":`<p class="note" style="margin:0">За свободен разговор по всякакви теми включи AI от менюто → AI разпознаване. Без него отговарям за всичко в приложението.</p>`}`,host=>{
    const log=$("#chatLog"); log.scrollTop=log.scrollHeight;
    host.querySelectorAll("[data-chatgo]").forEach(b=>b.onclick=()=>chatGo(b.dataset.chatgo));
    host.querySelectorAll("[data-sugg]").forEach(b=>b.onclick=()=>chatSend(b.dataset.sugg));
    $("#chatForm").onsubmit=e=>{ e.preventDefault(); chatSend($("#chatIn").value); };
  });
}
async function chatSend(q){
  q=(q||"").trim().slice(0,600); if(!q||chatBusy) return;
  CHAT.push({role:"user",t:q});
  const local=localAnswer(q);
  if(local && !(chatAiReady() && q.length>70)){ CHAT.push({role:"assistant",t:local.t,go:local.go}); openChat(); return; }
  if(!chatAiReady()){ CHAT.push({role:"assistant",t:local?local.t:"Мога да помогна с: тренировката днес, програмата, скенера, храната, добавките и алергиите, времето, места навън, пилатес и часове, заведения с Rezzo, магазини, фитнеси, събития и известия. Попитай по-конкретно — например „Къде да изляза навън?“",go:local?local.go:[]}); openChat(); return; }
  chatBusy=true; openChat();
  try{
    const turns=[{role:"user",content:appContext()}];
    CHAT.slice(-10).forEach(m=>turns.push({role:m.role==="user"?"user":"assistant",content:m.t}));
    if(turns[1]&&turns[1].role==="assistant") turns.splice(1,1);
    const merged=[turns[0]]; turns.slice(1).forEach(t=>{ const last=merged[merged.length-1]; if(last.role===t.role) last.content+="\n\n"+t.content; else merged.push(t); });
    const text=await aiText(merged); const pg=parseGo(text||"");
    CHAT.push({role:"assistant",t:pg.t||"Не успях да отговоря.",go:pg.go.length?pg.go:(local?local.go:[])});
  }catch(e){ CHAT.push({role:"assistant",t:(local?local.t+"\n\n":"")+(e.code==="bad_key"?"(Ключът за Claude API не е валиден.)":e.code==="not_granted"?"(Нямам разрешение да питам Claude тук.)":"(AI не отговори в момента — опитай пак.)"),go:local?local.go:[]}); }
  chatBusy=false; if($("#chatLog")||!$("#sheetHost").innerHTML) openChat();
}
// стария FIT Coach го заменяме с чат бота
function coachHTML(){ return `<button class="card" type="button" id="openChat2" style="text-align:left;cursor:pointer;border-color:var(--accent)"><p class="eyebrow" style="margin:0">Попитай FIT</p><b>Чат за всичко в приложението</b><span class="ex-meta">Тренировка, храна, добавки, време, места навън, пилатес, заведения…</span></button>`; }
function wireCoach(){ const b=$("#openChat2"); if(b) b.onclick=openChat; }
