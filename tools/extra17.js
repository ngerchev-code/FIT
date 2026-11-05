/* ============ HOME & STREET FITNESS ============ */
const HS_LV = ["Начинаещ","Среден","Напреднал"];
function hsOf(p){ p.hs=p.hs||{place:"home", equip:["bw"], group:"", mins:30}; if(!p.hs.equip.includes("bw")) p.hs.equip.unshift("bw"); return p.hs; }
function hsPlan(p){ const h=hsOf(p); return FC.planHome({place:h.place, equip:h.equip, minutes:h.mins, level:p.level}); }
function rHS(){
  const p=P(), h=hsOf(p), v=$("#v-hs");
  const keys = h.place==="street" ? FC.HS_STREET : Object.keys(FC.HS_EQ);
  const plan=hsPlan(p);
  const lib=FC.hsList({equip:h.equip.filter(q=>keys.includes(q)), group:h.group||null, all:true});
  v.innerHTML=`
    <div class="hs-hero"><p class="eyebrow" style="color:#BFF5D2">Home &amp; Street Fitness</p><h1 class="h-display" style="margin:0;color:#fff">Тренирай навсякъде</h1>
      <p style="margin:0;color:#DDF7E6">Собствена тежест, лостове, гири, ластици — у дома или на площадката, без зала.</p>
      <div class="hs-seg"><button type="button" data-hp="home" aria-pressed="${h.place==="home"}">🏠 Home</button><button type="button" data-hp="street" aria-pressed="${h.place==="street"}">🏙️ Street</button></div></div>
    <div class="card"><p class="eyebrow">Моите уреди · филтър</p>
      <div class="chips">${keys.map(k=>`<button class="chip hs-chip" type="button" data-he="${k}" aria-pressed="${h.equip.includes(k)}" ${k==="bw"?"disabled":""}>${esc(FC.HS_EQ[k])}</button>`).join("")}</div>
      <p class="note" style="margin:0">Собствената тежест е винаги включена. Избери какво имаш — тренировката и библиотеката се нагласят.</p></div>
    <div class="card hs-plan"><p class="eyebrow">Тренировка от избраното</p>
      <div class="chips">${[15,20,30,45].map(n=>`<button class="chip hs-chip" type="button" data-hm="${n}" aria-pressed="${h.mins===n}">${n} мин</button>`).join("")}</div>
      <b>${esc(plan.title)} · ${plan.minutes} мин · ${plan.exercises.length} упражнения</b><p class="muted" style="margin:0">${esc(plan.note)}</p>
      ${plan.exercises.map(e=>`<div class="ex-meta">• ${esc(e.name)} — ${e.targetSets>1?e.targetSets+" × ":""}${e.targetReps} ${esc(e.unit||"")}</div>`).join("")}
      <button class="btn block hs-go" id="hsGo" type="button">▶ Започни тренировката</button>
      ${h.place==="street"?`<button class="btn ghost block" id="hsMap" type="button">📍 Площадки за street fitness наблизо</button>`:""}</div>
    <div class="card"><p class="eyebrow">Библиотека · ${lib.length} упражнения</p>
      <div class="chips" style="flex-wrap:nowrap;overflow-x:auto;padding-bottom:4px"><button class="chip hs-chip" type="button" data-hg="" aria-pressed="${!h.group}" style="flex:0 0 auto">Всички</button>${Object.entries(GROUP_N).map(([k,n])=>`<button class="chip hs-chip" type="button" data-hg="${k}" aria-pressed="${h.group===k}" style="flex:0 0 auto">${esc(n)}</button>`).join("")}</div>
      ${lib.map(e=>`<div class="ex"><div class="num hs-num">${esc((GROUP_N[e.g]||e.g).slice(0,2))}</div><div style="min-width:0"><div class="ex-name">${esc(e.n)}</div>
        <div class="ex-meta">${esc(e.eq.map(q=>FC.HS_EQ[q]).join(" / "))} · ${HS_LV[e.lv]} · ${esc(e.unit)}</div><div class="ex-meta">${esc(e.cue)}</div></div>
        <button class="btn ghost sm" type="button" data-hadd="${e.id}">+ Добави</button></div>`).join("")||`<p class="muted" style="margin:0">Няма упражнения за този филтър.</p>`}</div>`;
  const on=(sel,f)=>v.querySelectorAll(sel).forEach(b=>b.onclick=()=>f(b));
  on("[data-hp]",b=>{ h.place=b.dataset.hp; save(); rHS(); });
  on("[data-he]",b=>{ const k=b.dataset.he; if(k==="bw") return; h.equip=h.equip.includes(k)?h.equip.filter(x=>x!==k):[...h.equip,k]; save(); rHS(); });
  on("[data-hm]",b=>{ h.mins=+b.dataset.hm; save(); rHS(); });
  on("[data-hg]",b=>{ h.group=b.dataset.hg; save(); rHS(); });
  on("[data-hadd]",b=>{ const e=FC.HS_EX.find(x=>x.id===b.dataset.hadd); const lvl=p.level==="adv"?2:p.level==="mid"?1:0;
    const item={machineId:"bw-"+e.id, name:e.n, machine:h.place==="street"?"Street fitness":"Home fitness", group:e.g, cue:e.cue, restSec:45, targetSets:[2,3,3][lvl], targetKg:0, targetReps:e.unit==="сек"?[20,30,45][lvl]:e.unit==="мин"?2:[10,12,15][lvl], unit:e.unit};
    if(liveSession()){ addToLive(item); show("live"); toast("Добавено",e.n); }
    else recoverySheet(l=>startLive([item],"hs",l)); });
  $("#hsGo").onclick=()=>{ const pl=hsPlan(p); if(!pl.exercises.length) return toast("Home & Street","Избери поне един уред или собствена тежест.");
    recoverySheet(l=>{ const t=todayISO(); p.log[t]=p.log[t]||{}; p.log[t].alt={env:h.place, reason:"", at:new Date().toISOString()}; save(); startLive(pl.exercises.map(e=>Object.assign({},e)),"hs",l); }); };
  const mp=$("#hsMap"); if(mp) mp.onclick=()=>{ guideF="street"; show("guide"); };
}
/* „Не мога днес“ у дома / в парка → ползва твоите уреди от Home & Street */
(function(){ if(typeof altFor!=="function") return; const base=altFor; altFor=function(env,minutes,reason,fromIso,dayOffset){
  const p=P(); const h=hsOf(p); const eq=h.equip.filter(q=>q!=="bw");
  if((env==="home"||env==="park")&&eq.length&&reason!=="injury"&&reason!=="illness"){
    const w=env==="park"?weatherFor(dayOffset||0):null;
    if(!(w&&w.bad)){ const pl=FC.planHome({place:env==="park"?"street":"home", equip:h.equip, minutes, level:p.level, groups:todayGroups(fromIso)});
      pl.env=env; pl.title=FC.ALT_ENV[env]; if(reason==="fatigue"){ pl.exercises=FC.applyLoad(pl.exercises,0.8); pl.note+=" По-леко заради умората."; } return pl; } }
  return base.apply(this,arguments); }; })();
/* карта на „Днес“ — тъмнозелена, под GUIDE */
(function(){ const base=rToday; rToday=function(){ base.apply(this,arguments); const v=$("#v-today"); if(!v||v.querySelector(".hs-cta")) return;
  const g=v.querySelector(".guide-cta"); const html=`<button class="card hs-cta" type="button" data-go="hs"><span class="hs-ic" aria-hidden="true"><svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4h18"/><path d="M7 4v3a5 5 0 0 0 10 0V4"/><circle cx="12" cy="13" r="2"/><path d="M12 15v6M9 21h6"/></svg></span><span style="min-width:0;text-align:left"><b style="display:block;font-size:16px">Home &amp; Street Fitness</b><span class="ex-meta">Лост, гири, ластици, собствена тежест — тренировка от твоите уреди</span></span></button>`;
  if(g) g.insertAdjacentHTML("afterend",html); else v.insertAdjacentHTML("beforeend",html);
  v.querySelector(".hs-cta").onclick=()=>show("hs"); }; })();
