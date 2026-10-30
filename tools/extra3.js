/* ============ ПИЛАТЕС, ЧАСОВЕ, СЛЕДЕНЕ ЗА МЯСТО ============ */
const PILATES = [
  {n:"LAVA LAB",area:"Център, ул. д-р Г. Вълкович 6",tags:["Reformer","Класове и на английски"],q:"LAVA LAB reformer pilates София"},
  {n:"Goddess Reformer Pilates",area:"Сердика, ул. Охридско езеро 50",tags:["Reformer","Класове и на английски","Всеки ден"],q:"Goddess Reformer Pilates Studio София"},
  {n:"Pure Reformer Pilates",area:"Манастирски ливади",tags:["Reformer","Всеки ден до 21 ч"],q:"Pure Reformer Pilates София"},
  {n:"Body Reformer Studio",area:"Хаджи Димитър, ул. В. Петлешков 1",tags:["Reformer","Всеки ден"],q:"Body Reformer Studio София"},
  {n:"UPREFORMER Banishora",area:"Банишора, ул. Странджа 109",tags:["Reformer","Тренировки на екран","От 7 ч"],q:"UPREFORMER Banishora София"},
  {n:"Pilates Reformer Studio RM",area:"Света Троица, ул. Пловдив 347А",tags:["Reformer","Групови и индивидуални"],q:"Pilates Reformer Studio RM София"},
  {n:"СтудиоРеформ Пилатес",area:"Център, ул. Джордж Вашингтон 29",tags:["Reformer","Групови и индивидуални"],q:"СтудиоРеформ Пилатес София"},
  {n:"PowerMamaFit Reformer Pilates",area:"Люлин",tags:["Reformer","Power"],q:"PowerMamaFit Reformer Pilates Люлин"},
  {n:"Studio 7",area:"Център, ул. 6-ти септември 14",tags:["Пилатес","Персонални тренировки"],q:"Studio 7 6-ти септември София"}
];
const CLASS_TYPES = ["Reformer пилатес","Power пилатес","Мат пилатес","Йога","Група във фитнеса","Персонална тренировка","Друго"];
function fmtWhen(iso){ const d=new Date(iso); return d.toLocaleDateString("bg-BG",{weekday:"short",day:"numeric",month:"short"})+" · "+d.toTimeString().slice(0,5); }
function pilatesHTML(){
  const p=P(); p.classes=p.classes||[]; p.watches=p.watches||[];
  const now=Date.now();
  const up=p.classes.filter(c=>new Date(c.at).getTime()>now-3600e3).sort((a,b)=>a.at.localeCompare(b.at));
  const ws=p.watches.filter(w=>new Date(w.at).getTime()>now).sort((a,b)=>a.at.localeCompare(b.at));
  return `<div class="card" style="border-color:var(--accent)">
    <div class="row" style="justify-content:space-between"><p class="eyebrow" style="margin:0">Моите часове</p><button class="btn sm" type="button" data-addcls="book">+ Записан час</button></div>
    ${up.length?up.map(c=>`<div class="ex"><div class="num" style="width:auto;border-radius:8px;padding:0 6px">${esc(fmtWhen(c.at).split(" · ")[1])}</div><div style="min-width:0"><div class="ex-name">${esc(c.type)} · ${esc(c.studio)}</div><div class="ex-meta">${esc(fmtWhen(c.at))}${c.spots?" · места: "+esc(c.spots):""}</div></div><button class="x" type="button" data-delcls="${c.id}" aria-label="Премахни">×</button></div>`).join(""):`<p class="muted" style="margin:0">Запиши часа си и FIT ще ти напомни вечерта преди и 2 часа преди началото — с известие, дори когато приложението е затворено.</p>`}
  </div>
  <div class="card" style="border-color:var(--hot)">
    <div class="row" style="justify-content:space-between"><p class="eyebrow" style="margin:0">Следя за свободно място</p><button class="btn hot sm" type="button" data-addcls="watch">+ Следи час</button></div>
    ${ws.length?ws.map(w=>`<div class="ex"><div class="num" style="border-color:var(--hot);color:var(--hot)">!</div><div style="min-width:0"><div class="ex-name">${esc(w.type)} · ${esc(w.studio)}</div><div class="ex-meta">${esc(fmtWhen(w.at))} · напомняне на всеки ${w.every} ч${w.spots?" · последно: "+esc(w.spots):""}</div>
      <div class="row" style="margin-top:6px"><button class="btn sm" type="button" data-gotspot="${w.id}">Записах се</button><button class="btn ghost sm" type="button" data-wspots="${w.id}">Обнови местата</button>${w.link?`<a class="btn ghost sm" href="${esc(w.link)}" target="_blank" rel="noopener">Запиши се</a>`:""}</div></div><button class="x" type="button" data-delw="${w.id}" aria-label="Спри следенето">×</button></div>`).join(""):`<p class="muted" style="margin:0">Пълен час? Добави го тук — FIT ще те подсеща да провериш за освободено място през деня до началото на часа, със звук „капка“.</p>`}
    <p class="note" style="margin:0">Автоматично записване изисква връзка със системата за резервации на студиото. Кажи кои студиа ползваш и проверявам дали имат такава възможност.</p>
  </div>
  <p class="eyebrow">Reformer и power пилатес в София</p>
  ${PILATES.map(s=>`<div class="card"><div style="min-width:0"><h2 class="h2">${esc(s.n)}</h2><div class="ex-meta">${esc(s.area)}</div></div>
    <div class="chips">${s.tags.map(t=>`<span class="pill accent">${esc(t)}</span>`).join("")}</div>
    <div class="row"><a class="btn sm" href="${MAPS(s.q)}" target="_blank" rel="noopener">Карта, телефон и часове</a><button class="btn ghost sm" type="button" data-addcls="book" data-st="${esc(s.n)}">Записах час</button><button class="btn ghost sm" type="button" data-addcls="watch" data-st="${esc(s.n)}">Следи място</button></div></div>`).join("")}`;
}
function classSheet(kind, studio){
  const p=P(); const d=new Date(); d.setDate(d.getDate()+1); d.setHours(18,0,0,0);
  const def=new Date(d.getTime()-d.getTimezoneOffset()*60e3).toISOString().slice(0,16);
  sheet(`<div class="grab"></div><p class="eyebrow">${kind==="watch"?"Следене за свободно място":"Записан час"}</p>
    <label class="f">Студио / зала<input class="in" id="cl-st" value="${esc(studio||"")}" list="cl-list" placeholder="напр. LAVA LAB"><datalist id="cl-list">${PILATES.map(s=>`<option value="${esc(s.n)}">`).join("")}${GYMS.map(g=>`<option value="${esc(g.n)}">`).join("")}</datalist></label>
    <label class="f">Вид<select class="in" id="cl-ty">${CLASS_TYPES.map(t=>`<option>${t}</option>`).join("")}</select></label>
    <label class="f">Дата и час<input class="in mono" id="cl-at" type="datetime-local" value="${def}"></label>
    <label class="f">Места (по желание, напр. 7/8 заети)<input class="in" id="cl-sp" placeholder="7/8"></label>
    ${kind==="watch"?`<label class="f">Напомняй ми на всеки<select class="in" id="cl-ev"><option value="1">1 час</option><option value="2" selected>2 часа</option><option value="4">4 часа</option></select></label>
    <label class="f">Линк за записване (по желание)<input class="in" id="cl-ln" placeholder="https://…" inputmode="url"></label>`:""}
    <button class="btn block ${kind==="watch"?"hot":""}" id="cl-ok" type="button">${kind==="watch"?"Започни следене":"Запази часа"}</button>`,()=>{
    $("#cl-ok").onclick=()=>{
      const st=$("#cl-st").value.trim().slice(0,50), at=$("#cl-at").value, ty=$("#cl-ty").value, sp=$("#cl-sp").value.trim().slice(0,12);
      if(!st){ $("#cl-st").focus(); return; } if(!at){ $("#cl-at").focus(); return; }
      if(kind==="watch"){ let ln=($("#cl-ln").value||"").trim(); if(ln&&!/^https?:\/\//.test(ln)) ln="https://"+ln;
        p.watches=p.watches||[]; p.watches.push({id:"w"+Date.now(),studio:st,type:ty,at,spots:sp,every:+$("#cl-ev").value,link:ln.slice(0,300)}); }
      else { p.classes=p.classes||[]; p.classes.push({id:"c"+Date.now(),studio:st,type:ty,at,spots:sp}); addXP(10,"Записан час: "+ty); }
      save(); closeSheet(); worldSeg="pilates"; render(); scheduleNotifs(); dropSound();
      toast(kind==="watch"?"Следя за място":"Часът е записан", kind==="watch"?"Ще те подсещам до началото на часа.":"Ще ти напомня вечерта преди и 2 часа преди.");
    };
  });
}
function wirePilates(v){
  const p=P();
  v.querySelectorAll("[data-addcls]").forEach(b=>b.onclick=()=>classSheet(b.dataset.addcls,b.dataset.st));
  v.querySelectorAll("[data-delcls]").forEach(b=>b.onclick=()=>{ p.classes=p.classes.filter(c=>c.id!==b.dataset.delcls); save(); rWorld(); scheduleNotifs(); });
  v.querySelectorAll("[data-delw]").forEach(b=>b.onclick=()=>{ p.watches=p.watches.filter(w=>w.id!==b.dataset.delw); save(); rWorld(); scheduleNotifs(); });
  v.querySelectorAll("[data-gotspot]").forEach(b=>b.onclick=()=>{ const w=p.watches.find(x=>x.id===b.dataset.gotspot); if(!w) return; p.watches=p.watches.filter(x=>x!==w); p.classes=p.classes||[]; p.classes.push({id:"c"+Date.now(),studio:w.studio,type:w.type,at:w.at,spots:w.spots}); save(); rWorld(); scheduleNotifs(); dropSound(); addXP(20,"Хвана място: "+w.type); });
  v.querySelectorAll("[data-wspots]").forEach(b=>b.onclick=()=>{ const w=p.watches.find(x=>x.id===b.dataset.wspots); if(!w) return;
    sheet(`<div class="grab"></div><p class="eyebrow">Места</p><div class="h2">${esc(w.type)} · ${esc(w.studio)}</div><label class="f">Заети / общо<input class="in mono" id="ws-v" value="${esc(w.spots||"")}" placeholder="8/8"></label><button class="btn block" id="ws-ok" type="button">Запази</button>`,()=>{
      $("#ws-ok").onclick=()=>{ w.spots=$("#ws-v").value.trim().slice(0,12); const m=w.spots.match(/(\d+)\s*\/\s*(\d+)/); save(); closeSheet(); rWorld();
        if(m&&+m[1]<+m[2]){ dropSound(); sheet(`<div class="grab"></div><p class="eyebrow">Свободно място</p><div class="h-display">Има ${+m[2]-+m[1]} място!</div><p class="muted" style="margin:0">Запиши се веднага.</p>${w.link?`<a class="btn hot block" href="${esc(w.link)}" target="_blank" rel="noopener">Запиши се</a>`:`<a class="btn hot block" href="${MAPS(w.studio+" София")}" target="_blank" rel="noopener">Обади се на студиото</a>`}<button class="btn ghost block" data-close type="button">Затвори</button>`,h=>h.querySelectorAll("[data-close]").forEach(x=>x.onclick=closeSheet)); } };
    }); });
}

/* ============ ЗВУК „КАПКА“ ============ */
let dropAudio=null;
function dropSound(){ try{ if(!dropAudio){ dropAudio=new Audio("drop.wav"); dropAudio.volume=0.6; } dropAudio.currentTime=0; const pr=dropAudio.play(); if(pr&&pr.catch) pr.catch(()=>{}); }catch(e){} }
