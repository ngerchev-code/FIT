/* ============ НЕ МОГА ДНЕС: АЛТЕРНАТИВА ДНЕС ИЛИ УТРЕ НА ДРУГО МЯСТО ============ */
function todayGroups(fromIso){
  const p=P(); const d=fromIso?new Date(fromIso+"T12:00:00"):new Date(); const di=dayIndexFor(p,d.getDay());
  if(di<0) return ["legs","back","chest","core"];
  return buildDay(p,di).list.map(it=>it.ex[2]).filter(g=>g!=="cardio");
}
function weatherFor(dayOffset){
  try{ if(!WX||!WX.w||!WX.w.daily) return null; const d=WX.w.daily; const i=Math.min(dayOffset,d.time.length-1);
    return dayIdea(d.weather_code[i], d.temperature_2m_max[i], d.wind_speed_10m_max[i], i); }catch(e){ return null; }
}
function altFor(env, minutes, reason, fromIso, dayOffset){
  const p=P(); return FC.altPlan({env, minutes, reason, level:p.level, groups:todayGroups(fromIso), weather:weatherFor(dayOffset||0)});
}
function startAlt(plan, reason){
  const p=P(), t=todayISO(); p.log[t]=p.log[t]||{}; p.log[t].alt={env:plan.env, reason:reason||"", at:new Date().toISOString()}; save();
  startLive(plan.exercises.map(e=>Object.assign({},e)), "alt", 1);
}
function cantTodaySheet(){
  const p=P(); let st={reason:"", when:"today", env:"home", mins:Math.min(30,p.minutes||30), at:""};
  const tom=new Date(Date.now()+864e5); const defAt=tom.toISOString().slice(0,10)+"T"+(notifCfg().evening||"18:00");
  const safe=()=>st.reason==="injury"||st.reason==="illness";
  const draw=()=>{
    const envs = safe()?["mobility"]:["home","park","walk","run","travel","mobility"];
    if(!envs.includes(st.env)) st.env=envs[0];
    const plan = st.when==="rest"||st.when==="gym" ? null : altFor(st.env, st.mins, st.reason, null, st.when==="tomorrow"?1:0);
    sheet(`<div class="grab"></div><p class="eyebrow">Днес не мога в залата</p><div class="h2">Няма проблем — да намерим друг начин</div>
      <b>Какво се случи? <span class="muted" style="font-weight:600">(по желание)</span></b>
      <div class="chips">${Object.entries(FC.SKIP_REASONS).map(([k,n])=>`<button class="chip" type="button" data-cr="${k}" aria-pressed="${st.reason===k}">${esc(n)}</button>`).join("")}</div>
      ${safe()?`<p class="note" style="margin:0">При болка или болест — само леко разтягане или почивка. Ако симптомите не минават, потърси лекар.</p>`:""}
      <b>Кога?</b>
      <div class="chips">${[["today","Днес, другаде"],["tomorrow","Утре, другаде"],["gym","Пренасрочи залата"],["rest","Почивка днес"]].filter(([k])=>!(safe()&&k==="gym")).map(([k,n])=>`<button class="chip" type="button" data-cw="${k}" aria-pressed="${st.when===k}">${n}</button>`).join("")}</div>
      ${st.when==="today"||st.when==="tomorrow"?`<b>Къде?</b><div class="chips">${envs.map(k=>`<button class="chip" type="button" data-ce="${k}" aria-pressed="${st.env===k}">${esc(FC.ALT_ENV[k])}</button>`).join("")}</div>
        <b>Колко време имаш?</b><div class="chips">${[15,20,30,45].map(n=>`<button class="chip" type="button" data-cm="${n}" aria-pressed="${st.mins===n}">${n} мин</button>`).join("")}</div>`:""}
      ${st.when==="tomorrow"||st.when==="gym"?`<label>${st.when==="gym"?"Нов ден и час за залата":"Утре в"}<input class="in" id="ctAt" type="datetime-local" value="${esc(st.at||defAt)}"></label>`:""}
      ${plan?`<div class="card" style="background:var(--surface-2);gap:6px"><b>${esc(plan.title)} · ${plan.minutes} мин</b><p class="muted" style="margin:0">${esc(plan.note)}</p>${plan.exercises.map(e=>`<div class="ex-meta">• ${esc(e.name)} — ${e.targetSets>1?e.targetSets+" × ":""}${e.targetReps} ${esc(e.unit||"")}</div>`).join("")}</div>`:""}
      ${st.when==="rest"?`<p class="muted" style="margin:0">Почивката също е напредък. Следващата тренировка остава по план — без двойно натоварване.</p>`:""}
      <button class="btn hot block" id="ctGo" type="button">${st.when==="today"?"▶ Започни сега":st.when==="tomorrow"?"Запази за утре":st.when==="gym"?"Пренасрочи":"Почивам днес"}</button>
      <button class="btn ghost block" data-close type="button">Назад</button>`, h=>{
        h.querySelectorAll("[data-close]").forEach(b=>b.onclick=closeSheet);
        h.querySelectorAll("[data-cr]").forEach(b=>b.onclick=()=>{ st.reason=st.reason===b.dataset.cr?"":b.dataset.cr; draw(); });
        h.querySelectorAll("[data-cw]").forEach(b=>b.onclick=()=>{ st.when=b.dataset.cw; draw(); });
        h.querySelectorAll("[data-ce]").forEach(b=>b.onclick=()=>{ st.env=b.dataset.ce; draw(); });
        h.querySelectorAll("[data-cm]").forEach(b=>b.onclick=()=>{ st.mins=+b.dataset.cm; draw(); });
        const at=$("#ctAt"); if(at) at.onchange=()=>{ st.at=at.value; };
        $("#ctGo").onclick=()=>{
          const t=todayISO(); p.log[t]=p.log[t]||{}; const reason=st.reason||"private";
          if(st.when==="today"){ closeSheet(); startAlt(plan, st.reason); return; }
          const when=(at&&at.value)||st.at||defAt;
          const r=FC.resolveSkip({reason, alternative:st.when==="rest"?"rest":"reschedule", newTime:when, confirmed:true});
          if(!r.ok) return toast("Провери","Избери ден и час.");
          p.log[t].skip=r.changes.skip;
          if(r.changes.reschedule){ p.resched=(p.resched||[]).filter(x=>!x.done&&x.from!==t); p.resched.push({from:t, at:when, done:false, env:st.when==="tomorrow"?st.env:"gym", minutes:st.mins}); }
          if(r.changes.loadFactor<1) p.loadNext=r.changes.loadFactor;
          save(); closeSheet(); scheduleNotifs();
          toast("Разбрано", st.when==="rest"?"Почивка днес — следващата тренировка по план.":st.when==="tomorrow"?"Утре: "+FC.ALT_ENV[st.env]+" · "+st.mins+" мин":"Залата е пренасрочена.");
          render(); };
      }); };
  draw();
}
/* пренасрочено „на друго място“ → днес се показва и пуска алтернативният план */
(function(){ const base=planExercises; planExercises=function(){ const rs=reschedToday();
  if(rs&&rs.env&&rs.env!=="gym"){ const pl=altFor(rs.env, rs.minutes||30, "", rs.from, 0); return pl.exercises.map(e=>Object.assign({},e)); }
  return base.apply(this,arguments); }; })();
(function(){ const base=rToday; rToday=function(){ base.apply(this,arguments);
  const v=$("#v-today"); if(!v) return; const p=P(), t=todayISO(), rs=reschedToday();
  const host=v.querySelector("#liveHost")||v.querySelector("#restHost");
  if(rs&&rs.env&&rs.env!=="gym"&&!liveSession()){
    const n=v.querySelector("#reschedNote"); if(n) n.innerHTML=`<span class="pill accent">Днес: ${esc(FC.ALT_ENV[rs.env])} · ${rs.minutes||30} мин — вместо пропуснатата тренировка</span>`;
    const lg=$("#liveGo"); if(lg) lg.textContent="▶ Започни: "+FC.ALT_ENV[rs.env];
    const rh=v.querySelector("#restHost"); if(rh&&!rh.querySelector("#altGo")){ rh.insertAdjacentHTML("afterbegin",`<button class="btn hot block live-main" id="altGo" type="button">▶ Започни: ${esc(FC.ALT_ENV[rs.env])}</button>`); $("#altGo").onclick=()=>startAlt(altFor(rs.env, rs.minutes||30, "", rs.from, 0)); }
  }
  if(host && !liveSession() && !(p.log[t]&&p.log[t].complete) && !v.querySelector("#cantGo")){
    host.insertAdjacentHTML("beforeend",`<button class="btn ghost block" id="cantGo" type="button">Не мога днес · друго място или ден</button>`);
    $("#cantGo").onclick=cantTodaySheet;
  }
  if(p.log[t]&&p.log[t].alt&&p.log[t].complete){ const n=v.querySelector("#reschedNote"); if(n) n.innerHTML=`<span class="pill good">Днес: ${esc(FC.ALT_ENV[p.log[t].alt.env]||"алтернатива")} ✓ — броим я като тренировка</span>`; }
}; })();
/* при пропусната тренировка: „у дома / разходка / мобилност“ → предложение да я направиш сега */
function offerAltNow(alt){
  const env = alt==="walk"?"walk":alt==="mobility"?"mobility":"home"; const pl=altFor(env,20,"",null,0);
  sheet(`<div class="grab"></div><p class="eyebrow">Алтернатива</p><div class="h2">${esc(pl.title)} · 20 мин</div><p class="muted" style="margin:0">${esc(pl.note)}</p>
    ${pl.exercises.map(e=>`<div class="ex-meta">• ${esc(e.name)} — ${e.targetSets>1?e.targetSets+" × ":""}${e.targetReps} ${esc(e.unit||"")}</div>`).join("")}
    <button class="btn hot block" id="oaGo" type="button">▶ Започни сега</button><button class="btn ghost block" data-close type="button">По-късно</button>`, h=>{
      h.querySelectorAll("[data-close]").forEach(b=>b.onclick=closeSheet);
      $("#oaGo").onclick=()=>{ closeSheet(); startAlt(pl,""); };
    });
}
