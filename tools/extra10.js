/* ============ ТРЕНИРОВКА НА ЖИВО (fit-core.js) ============ */
const FC = window.FITCore;
function wk(){ const p=P(); p.wk=p.wk||{sessions:[], activeId:null}; return p.wk; }
function liveSession(){ const w=wk(); return w.sessions.find(s=>s.id===w.activeId)||null; }
function lastSettings(){ return FC.lastByMachine(wk().sessions); }
function machineList(){
  const p=P(); const ids=(p.gym&&p.gym.length)?p.gym:Object.keys(LIB);
  const out=ids.map(id=>{ const e=LIB[id]||(p.custom||[]).find(c=>c.id===id); return e?{id, name:e.n, group:(e.ex&&e.ex[0]&&e.ex[0][2])||"", def:e.def||null}:null; }).filter(Boolean);
  (p.custom||[]).forEach(c=>{ if(!out.some(x=>x.id===c.id)) out.push({id:c.id,name:c.n,group:(c.ex&&c.ex[0]&&c.ex[0][2])||c.group||"",def:c.def||null}); });
  return out;
}
function parsePresc(s,r,group){
  if(group==="cardio"){ const m=/(\d+)/.exec(s||""); return {sets:1, reps:m?+m[1]:15, rest:0}; }
  const m=/(\d+)\s*×\s*(\d+)(?:[–-](\d+))?/.exec(s||""); const sets=m?+m[1]:3; const reps=m?(m[3]?Math.round((+m[2]+ +m[3])/2):+m[2]):10;
  let rest=90; const mm=/(\d+)(?:[–-](\d+))?\s*(сек|мин)/.exec(r||""); if(mm){ const v=mm[2]?Math.round((+mm[1]+ +mm[2])/2):+mm[1]; rest=mm[3]==="мин"?v*60:v; }
  return {sets,reps,rest};
}
function persistLive(s){
  const w=wk(); const i=w.sessions.findIndex(x=>x.id===s.id); if(i>=0) w.sessions[i]=s; else w.sessions.push(s);
  if(w.sessions.length>80) w.sessions=w.sessions.slice(-80);
  if(s.state==="completed"||s.state==="cancelled"){ if(w.activeId===s.id) w.activeId=null; } else w.activeId=s.id;
  save();
}
function liveDo(a){
  const s=liveSession(); if(!s) return null;
  a.opId=a.opId||FC.uuid(); a.at=a.at||new Date().toISOString();
  try{ const n=FC.apply(s,a); persistLive(n); restNotify(n); return n; }
  catch(e){ const M={set_active:"Първо завърши текущата серия.",invalid_values:"Провери килограмите и повторенията.",not_active:"Тренировката е на пауза."}; toast("Тренировка",M[e.code]||"Действието не е възможно сега."); return null; }
}
async function restNotify(s){
  const LN=Plug("LocalNotifications"); if(!NATIVE||!LN) return;
  let nativeRest=false; try{ nativeRest=!!(WB&&WB()); }catch(e){}
  if(nativeRest){ try{ await LN.cancel({notifications:[{id:7700}]}); }catch(e){} return; } /* краят на почивката се вика от известието (и при затворено приложение) */
  try{
    await LN.cancel({notifications:[{id:7700}]});
    if(s.restUntil && Date.parse(s.restUntil)>Date.now()+3000 && s.state==="active")
      await LN.schedule({notifications:[{id:7700,title:"Почивката свърши",body:"Следваща серия — ти определяш темпото.",channelId:"fit_drop",sound:"drop.wav",schedule:{at:new Date(s.restUntil),allowWhileIdle:true}}]});
  }catch(e){}
}
function startLive(exercises, kind, load){
  const last=lastSettings();
  const ex=exercises.map(e=>Object.assign({}, e, { targetKg: e.targetKg || (last[e.machineId]?last[e.machineId].weightKg:0) }));
  const s=FC.newSession({exercises: load<1?FC.applyLoad(ex,load):ex, kind, load, date:todayISO()});
  persistLive(s); liveDo({type:"START_WORKOUT"}); show("live");
}
function planExercises(){
  const p=P(), dow=new Date().getDay(); let di=dayIndexFor(p,dow);
  const rs=reschedToday(); if(di<0 && rs) di=dayIndexFor(p,new Date(rs.from+"T12:00:00").getDay());
  if(di<0) return [];
  return buildDay(p,di).list.map(it=>{ const [s,r]=presc(p,it.ex[2]); const q=parsePresc(s,r,it.ex[2]);
    return {machineId:it.eq, name:it.ex[0], machine:it.eqn, group:it.ex[2], cue:it.ex[3], restSec:q.rest, targetSets:q.sets, targetReps:q.reps, targetKg:0}; });
}
/* проверка за възстановяване преди старт */
function recoverySheet(then){
  let c={energy:3,sleep:"ok",pain:false,ill:false};
  const draw=()=>sheet(`<div class="grab"></div><p class="eyebrow">Преди да започнем</p><div class="h2">Как се чувстваш днес?</div>
    <p class="muted" style="margin:0">Отговорът е по желание. Помага да изберем честно натоварване.</p>
    <div><b>Енергия</b><div class="chips">${[1,2,3,4,5].map(n=>`<button class="chip" type="button" data-en="${n}" aria-pressed="${c.energy===n}">${["","Изтощен","Уморен","Нормално","Добре","Отлично"][n]}</button>`).join("")}</div></div>
    <div><b>Сън</b><div class="chips">${[["bad","Лош"],["ok","Нормален"],["good","Добър"]].map(([k,n])=>`<button class="chip" type="button" data-sl="${k}" aria-pressed="${c.sleep===k}">${n}</button>`).join("")}</div></div>
    <div class="chips"><button class="chip" type="button" id="rcPain" aria-pressed="${c.pain}">Имам болка</button><button class="chip" type="button" id="rcIll" aria-pressed="${c.ill}">Болен съм</button></div>
    <button class="btn block" id="rcGo" type="button">Продължи</button><button class="btn ghost block" id="rcSkip" type="button">Пропусни въпросите</button>`, h=>{
      h.querySelectorAll("[data-en]").forEach(b=>b.onclick=()=>{ c.energy=+b.dataset.en; draw(); });
      h.querySelectorAll("[data-sl]").forEach(b=>b.onclick=()=>{ c.sleep=b.dataset.sl; draw(); });
      $("#rcPain").onclick=()=>{ c.pain=!c.pain; draw(); }; $("#rcIll").onclick=()=>{ c.ill=!c.ill; draw(); };
      $("#rcSkip").onclick=()=>{ closeSheet(); then(1); };
      $("#rcGo").onclick=()=>{ const r=FC.recovery(c); const p=P(); p.recovery=p.recovery||{}; p.recovery[todayISO()]=Object.assign({},c,{action:r.action,source:"self-report",at:new Date().toISOString()}); save();
        if(r.action==="normal"){ closeSheet(); return then(1); }
        sheet(`<div class="grab"></div><p class="eyebrow">${r.action==="rest"?"Почивка":"По-лек ден"}</p><div class="h2">${r.action==="rest"?"Днес почиваме":"Тренираме по-леко"}</div><p style="margin:0">${esc(r.message)}</p>
          ${r.action==="rest"?`<button class="btn block" id="rcRest" type="button">Добре, почивам</button><button class="btn ghost block" id="rcMob" type="button">Само 10 мин разтягане</button>`:`<button class="btn block" id="rcLight" type="button">Започни по-леко</button>`}
          <button class="btn ghost block" data-close type="button">Назад</button>`, h2=>{
            h2.querySelectorAll("[data-close]").forEach(b=>b.onclick=closeSheet);
            const rr=$("#rcRest"); if(rr) rr.onclick=()=>{ const p=P(), t=todayISO(); p.log[t]=p.log[t]||{}; p.log[t].rest={reason:c.pain?"pain":c.ill?"illness":"fatigue",at:new Date().toISOString()}; save(); closeSheet(); toast("Почивка","Почивката също е напредък."); rToday(); };
            const rm=$("#rcMob"); if(rm) rm.onclick=()=>{ closeSheet(); startLive([{machineId:"mobility",name:"Разтягане и мобилност",group:"mobility",restSec:0,targetSets:1,targetReps:10,targetKg:0}],"mobility",1); };
            const rl=$("#rcLight"); if(rl) rl.onclick=()=>{ closeSheet(); then(r.load); };
          }); };
    });
  draw();
}
function quickSheet(){
  const ms=machineList(); let mins=20, pick=new Set(ms.slice(0,2).map(m=>m.id));
  const draw=()=>{ const last=lastSettings(); const plan=FC.planQuick({minutes:mins, machines:ms.filter(m=>pick.has(m.id)).map(m=>({id:m.id,name:m.name,group:m.group,weightKg:last[m.id]?last[m.id].weightKg:(m.def&&m.def.kg)||0,reps:(m.def&&m.def.reps)||10,restSec:(m.def&&m.def.rest)||90}))});
    sheet(`<div class="grab"></div><p class="eyebrow">Бърза тренировка</p><div class="h2">Колко време имаш?</div>
      <div class="chips">${[15,20,30,45,60].map(n=>`<button class="chip" type="button" data-mn="${n}" aria-pressed="${mins===n}">${n} мин</button>`).join("")}</div>
      <b>Свободни уреди</b><div class="chips">${ms.map(m=>`<button class="chip" type="button" data-qm="${esc(m.id)}" aria-pressed="${pick.has(m.id)}">${esc(m.name)}</button>`).join("")}</div>
      <div class="card" style="background:var(--surface-2)"><b>${esc(plan.note)}</b>${plan.exercises.map(e=>`<div class="ex-meta">${esc(e.name)} · ${e.targetSets} × ${e.targetReps}${e.targetKg?" · "+e.targetKg+" kg":""}</div>`).join("")}</div>
      <button class="btn hot block" id="qGo" type="button" ${plan.exercises.length?"":"disabled"}>Започни</button><button class="btn ghost block" data-close type="button">Затвори</button>`, h=>{
        h.querySelectorAll("[data-close]").forEach(b=>b.onclick=closeSheet);
        h.querySelectorAll("[data-mn]").forEach(b=>b.onclick=()=>{ mins=+b.dataset.mn; draw(); });
        h.querySelectorAll("[data-qm]").forEach(b=>b.onclick=()=>{ const id=b.dataset.qm; if(pick.has(id)) pick.delete(id); else pick.add(id); draw(); });
        $("#qGo").onclick=()=>{ closeSheet(); recoverySheet(load=>startLive(plan.exercises.map(e=>Object.assign({},e)),"quick",load)); };
      }); };
  draw();
}
function addExerciseSheet(){
  const ms=machineList(); let mode="list";
  const draw=()=>sheet(`<div class="grab"></div><p class="eyebrow">Смени или добави уред</p><div class="h2">${mode==="list"?"Избери уред":"Нов уред"}</div>
    ${mode==="list"?`<div class="chips">${ms.map(m=>`<button class="chip" type="button" data-am="${esc(m.id)}">${esc(m.name)}</button>`).join("")}</div>
      <button class="btn ghost block" id="amNew" type="button">+ Мой уред (име, мускули, тежест, повторения, почивка)</button>`:
      `<label>Име<input class="in" id="nmN" placeholder="напр. Хак клек"></label>
       <label>Мускулна група<select class="in" id="nmG">${Object.entries(GROUP_N).map(([k,v])=>`<option value="${k}">${esc(v)}</option>`).join("")}</select></label>
       <div class="grid2"><label>Тежест (kg)<input class="in" id="nmK" type="number" inputmode="decimal" value="20"></label><label>Повторения<input class="in" id="nmR" type="number" inputmode="numeric" value="10"></label>
       <label>Серии<input class="in" id="nmS" type="number" inputmode="numeric" value="3"></label><label>Почивка (сек)<input class="in" id="nmP" type="number" inputmode="numeric" value="90"></label></div>
       <button class="btn block" id="nmOk" type="button">Запази и добави</button>`}
    <button class="btn ghost block" data-close type="button">Затвори</button>`, h=>{
      h.querySelectorAll("[data-close]").forEach(b=>b.onclick=closeSheet);
      const nw=$("#amNew"); if(nw) nw.onclick=()=>{ mode="new"; draw(); };
      h.querySelectorAll("[data-am]").forEach(b=>b.onclick=()=>{ const m=ms.find(x=>x.id===b.dataset.am); const last=lastSettings()[m.id];
        addToLive({machineId:m.id,name:m.name,machine:m.name,group:m.group,restSec:(m.def&&m.def.rest)||90,targetSets:(m.def&&m.def.sets)||3,targetReps:(m.def&&m.def.reps)||10,targetKg:last?last.weightKg:((m.def&&m.def.kg)||0)}); });
      const ok=$("#nmOk"); if(ok) ok.onclick=()=>{ const n=$("#nmN").value.trim(); if(!n) return toast("Нов уред","Напиши име на уреда.");
        const g=$("#nmG").value, def={kg:Math.max(0,+$("#nmK").value||0),reps:Math.max(1,+$("#nmR").value||10),sets:Math.max(1,Math.min(10,+$("#nmS").value||3)),rest:Math.max(0,+$("#nmP").value||90)};
        const p=P(); p.custom=p.custom||[]; const id="u"+Date.now(); p.custom.push({id,n,group:g,def,ex:[[n,GROUP_N[g]||"",g,"",""]]}); if(p.gym&&p.gym.length) p.gym.push(id); save();
        addToLive({machineId:id,name:n,machine:n,group:g,restSec:def.rest,targetSets:def.sets,targetReps:def.reps,targetKg:def.kg}); };
    });
  draw();
}
function addToLive(e){
  const s=liveSession(); if(!s) return; closeSheet();
  const id=FC.uuid(); let n=liveDo({type:"ADD_EXERCISE",exerciseId:id,exercise:e});
  if(n && !FC.activeSet(n) && n.state==="active") liveDo({type:"SWITCH_EXERCISE",exerciseId:id});
  rLive();
}
let liveKg=null, liveReps=null, liveFor=null, liveTimer=null;
function rLive(){
  const v=$("#v-live"); const s=liveSession();
  if(!s){ v.innerHTML=`<p class="eyebrow">Тренировка на живо</p><h1 class="h-display">Няма активна тренировка</h1>
    <button class="btn hot block" id="lvPlan" type="button">Започни днешната тренировка</button><button class="btn ghost block" id="lvQuick" type="button">Бърза тренировка (време + уреди)</button>`;
    $("#lvPlan").onclick=()=>{ const ex=planExercises(); if(!ex.length) return quickSheet(); recoverySheet(l=>startLive(ex,"plan",l)); };
    $("#lvQuick").onclick=quickSheet; return; }
  const e=s.exercises.find(x=>x.id===s.activeExerciseId)||s.exercises[0]; const act=FC.activeSet(s);
  const done=e?FC.completedSets(s,e.id):[]; const last=e?FC.lastByMachine(wk().sessions.filter(z=>z.id!==s.id))[e.machineId]:null;
  if(liveFor!==(e&&e.id)+":"+done.length+":"+(act?act.id:"")){ liveFor=(e&&e.id)+":"+done.length+":"+(act?act.id:""); const prev=done[done.length-1];
    liveKg = act?act.weightKg:(prev?prev.weightKg:(e?e.targetKg:0)); liveReps = act?act.reps:(prev?prev.reps:(e?e.targetReps:10)); }
  const cardio=e&&e.group==="cardio", mob=e&&e.group==="mobility";
  const resting=!act && s.restUntil && Date.parse(s.restUntil)>Date.now();
  const st=s.state==="paused"?["ПАУЗА","var(--muted)"]:act?["СЕРИЯ","var(--hot)"]:resting?["ПОЧИВКА","var(--go)"]:["ГОТОВ","var(--accent)"];
  v.innerHTML=`
    <div class="row" style="justify-content:space-between;align-items:center"><div><p class="eyebrow">Тренировка на живо</p><div class="live-clock mono" id="lvClock">${clockText(s)}</div></div>
      <span class="live-state" style="background:${st[1]}">${st[0]}</span></div>
    <div class="chips" style="flex-wrap:nowrap;overflow-x:auto;padding-bottom:4px">${s.exercises.map((x,i)=>{ const c=FC.completedSets(s,x.id).length; return `<button class="chip" type="button" data-lx="${x.id}" aria-pressed="${x.id===e.id}" style="flex:0 0 auto" ${act?"disabled":""}>${i+1}. ${esc(x.machine||x.name)} <b class="mono" style="margin-left:6px">${c}/${x.targetSets}</b></button>`; }).join("")}</div>
    <div class="card live-card">
      ${e.machine||e.cue?`<p class="eyebrow">${esc(e.machine||"")}${e.machine&&e.cue?" · ":""}${esc(e.cue||"")}</p>`:""}
      <div class="h2" style="margin:0">${esc(e.name)}</div>
      <div class="muted">Цел: ${e.targetSets} × ${e.targetReps}${cardio?" мин":""}${!cardio&&!mob&&e.targetKg?" · "+e.targetKg+" kg":""}${last&&!cardio?` · последно ${last.weightKg} kg × ${last.reps}`:""}</div>
      ${resting?`<div class="rest-ring"><div class="mono" id="lvRest">${restText(s)}</div><span>почивка</span></div>
        <div class="grid2"><button class="btn ghost" id="lvRest30" type="button">+30 сек</button><button class="btn ghost" id="lvSkipRest" type="button">Пропусни</button></div>`:""}
      ${!cardio&&!mob?`<div class="stepper"><span>Тежест</span><button type="button" data-kg="-2.5" aria-label="Намали тежестта">−</button><b class="mono" id="lvKg">${liveKg} kg</b><button type="button" data-kg="2.5" aria-label="Увеличи тежестта">+</button></div>`:""}
      <div class="stepper"><span>${cardio?"Минути":"Повторения"}</span><button type="button" data-rp="-1" aria-label="Намали">−</button><b class="mono" id="lvReps">${liveReps}</b><button type="button" data-rp="1" aria-label="Увеличи">+</button></div>
      ${s.state==="paused"?`<button class="btn block live-main" id="lvResume" type="button">Продължи</button>`:
        act?`<button class="btn hot block live-main" id="lvEnd" type="button">Край на серията · запиши</button><button class="btn ghost block" id="lvCancelSet" type="button">Отмени серията</button>`:
        `<button class="btn block live-main" id="lvStart" type="button">${done.length>=e.targetSets?"Още една серия (по желание)":"Започни серия "+(done.length+1)}</button>`}
      ${done.length?`<div>${done.map((x,i)=>`<button class="set-row" type="button" data-ed="${x.id}"><span>Серия ${i+1}</span><b class="mono">${cardio?x.reps+" мин":x.weightKg+" kg × "+x.reps}</b><span class="muted">${x.edited?"поправено":x.source==="manual"?"ръчно":"от часовник"} ✎</span></button>`).join("")}</div>`:""}
    </div>
    <div class="grid2"><button class="btn ghost" id="lvAdd" type="button" ${act?"disabled":""}>Смени / добави уред</button>
      ${s.state==="active"?`<button class="btn ghost" id="lvPause" type="button" ${act?"disabled":""}>Пауза</button>`:`<span></span>`}</div>
    <button class="btn hot block" id="lvFinish" type="button" ${act?"disabled":""}>Завърши тренировката</button>
    <button class="btn ghost block" id="lvCancel" type="button">Прекрати без запис като завършена</button>
    <p class="note">Килограмите и повторенията се записват само когато ги потвърдиш. FIT не брои повторения автоматично и не разпознава уреда без теб.</p>`;
  v.querySelectorAll("[data-lx]").forEach(b=>b.onclick=()=>{ if(b.dataset.lx!==e.id){ liveDo({type:"SWITCH_EXERCISE",exerciseId:b.dataset.lx}); rLive(); } });
  v.querySelectorAll("[data-kg]").forEach(b=>b.onclick=()=>{ liveKg=Math.max(0,Math.round((liveKg+ +b.dataset.kg)*2)/2); $("#lvKg").textContent=liveKg+" kg"; });
  v.querySelectorAll("[data-rp]").forEach(b=>b.onclick=()=>{ liveReps=Math.max(0,liveReps+ +b.dataset.rp); $("#lvReps").textContent=liveReps; });
  const on=(id,f)=>{ const el=$(id); if(el) el.onclick=f; };
  on("#lvStart",()=>{ liveDo({type:"START_SET",setId:FC.uuid(),weightKg:liveKg,reps:liveReps}); buzz(30); rLive(); });
  on("#lvEnd",()=>{ const a=FC.activeSet(liveSession()); if(!a) return; liveDo({type:"COMPLETE_SET",setId:a.id,reps:liveReps,weightKg:cardio||mob?0:liveKg,source:"manual"}); buzz(60); autoAdvance(); rLive(); });
  on("#lvCancelSet",()=>{ const a=FC.activeSet(liveSession()); if(a){ liveDo({type:"CANCEL_SET",setId:a.id}); rLive(); } });
  on("#lvSkipRest",()=>{ liveDo({type:"SKIP_REST"}); rLive(); });
  on("#lvRest30",()=>{ const s2=liveSession(); s2.restUntil=new Date(Date.parse(s2.restUntil)+30000).toISOString(); persistLive(s2); restNotify(s2); rLive(); });
  on("#lvPause",()=>{ liveDo({type:"PAUSE_WORKOUT"}); rLive(); });
  on("#lvResume",()=>{ liveDo({type:"RESUME_WORKOUT"}); rLive(); });
  on("#lvAdd",addExerciseSheet);
  on("#lvFinish",finishLive);
  on("#lvCancel",()=>{ liveDo({type:"CANCEL_WORKOUT"}); toast("Тренировка","Прекратена. Записаните серии остават в историята."); show("today"); });
  v.querySelectorAll("[data-ed]").forEach(b=>b.onclick=()=>editSetSheet(b.dataset.ed));
  clearInterval(liveTimer);
  liveTimer=setInterval(()=>{ if(TAB!=="live"){ clearInterval(liveTimer); return; } const s2=liveSession(); if(!s2) return;
    const c=$("#lvClock"); if(c) c.textContent=clockText(s2);
    const r=$("#lvRest"); if(r){ if(Date.parse(s2.restUntil)<=Date.now()){ buzz([120,80,120]); dropSound(); liveDo({type:"SKIP_REST"}); rLive(); } else r.textContent=restText(s2); } },1000);
}
/* FIT води: след последната серия на уред минава сам на следващия */
function autoAdvance(){
  const s=liveSession(); if(!s||s.state!=="active"||FC.activeSet(s)) return;
  const e=s.exercises.find(x=>x.id===s.activeExerciseId); if(!e||FC.completedSets(s,e.id).length<e.targetSets) return;
  const i=s.exercises.indexOf(e); const order=s.exercises.slice(i+1).concat(s.exercises.slice(0,i));
  const n=order.find(x=>FC.completedSets(s,x.id).length<x.targetSets);
  if(n){ liveDo({type:"SWITCH_EXERCISE",exerciseId:n.id}); toast("Готово ✓","Следва: "+(n.machine||n.name)); }
  else toast("Всички уреди са готови ✓","Натисни „Завърши тренировката“ или направи още серия.");
}
function clockText(s){ const sec=s.startedAt?Math.max(0,Math.round((Date.now()-Date.parse(s.startedAt))/1000)):0; return String(Math.floor(sec/60)).padStart(2,"0")+":"+String(sec%60).padStart(2,"0"); }
function restText(s){ const sec=Math.max(0,Math.ceil((Date.parse(s.restUntil)-Date.now())/1000)); return Math.floor(sec/60)+":"+String(sec%60).padStart(2,"0"); }
function buzz(p){ try{ if(navigator.vibrate) navigator.vibrate(p); }catch(e){} }
function editSetSheet(id){
  const s=liveSession(); const x=s&&s.sets.find(z=>z.id===id); if(!x) return;
  sheet(`<div class="grab"></div><p class="eyebrow">Поправи серия</p><div class="grid2"><label>Тежест (kg)<input class="in" id="esK" type="number" inputmode="decimal" value="${x.weightKg}"></label><label>Повторения<input class="in" id="esR" type="number" inputmode="numeric" value="${x.reps}"></label></div>
    <button class="btn block" id="esOk" type="button">Запази</button><button class="btn ghost block" data-close type="button">Затвори</button>`, h=>{
      h.querySelectorAll("[data-close]").forEach(b=>b.onclick=closeSheet);
      $("#esOk").onclick=()=>{ const k=parseFloat($("#esK").value), r=parseInt($("#esR").value,10); if(liveDo({type:"EDIT_SET",setId:id,weightKg:k,reps:r})){ closeSheet(); rLive(); } };
    });
}
function finishLive(){
  const s=liveSession(); if(!s) return; const sm=FC.summary(s);
  if(!sm.sets){ sheet(`<div class="grab"></div><div class="h2">Няма записани серии</div><p class="muted" style="margin:0">Запиши поне една серия или прекрати тренировката.</p><button class="btn block" data-close type="button">Добре</button>`,h=>h.querySelectorAll("[data-close]").forEach(b=>b.onclick=closeSheet)); return; }
  const n=liveDo({type:"END_WORKOUT"}); if(!n) return;
  const p=P(), t=todayISO(); p.log[t]=p.log[t]||{}; p.log[t].session=n.id;
  const rs=reschedToday(); if(rs){ rs.done=true; save(); }
  const wasDone=p.log[t].complete; if(n.kind!=="mobility") markWorkoutDone(); else save();
  sheet(`<div class="grab"></div><p class="eyebrow">Тренировката е записана</p><div class="h-display">Браво, ${esc(p.name)}</div>
    <div class="stats"><div class="stat"><b>${sm.sets}</b><span>серии</span></div><div class="stat"><b>${sm.minutes}</b><span>минути</span></div><div class="stat"><b>${sm.volumeKg}</b><span>kg общо</span></div></div>
    <div>${sm.exercises.map(x=>`<div class="ex-meta">${esc(x.name)} · ${x.sets}/${x.target} серии</div>`).join("")}</div>
    <p class="muted" style="margin:0">Данните са ръчно потвърдени. Утре — възстановяване и вода.</p><button class="btn block" data-close type="button">Супер</button>`, h=>h.querySelectorAll("[data-close]").forEach(b=>b.onclick=()=>{ closeSheet(); if(!wasDone) afterWorkoutVenue(); }));
  show("today");
}
/* ---------- Пропусната тренировка ---------- */
function reschedToday(){ const p=P(); if(!p||!p.resched) return null; const t=todayISO(); return p.resched.find(r=>r.at.slice(0,10)===t && !r.done)||null; }
function missedCheck(){
  const p=P(); if(!p||p.id==="demo") return false;
  const days=FC.missedDays({today:todayISO(), start:p.start, days:trainingDays(p), log:p.log});
  if(!days.length) return false;
  missedSheet(days[0]); return true;
}
function missedSheet(d){
  const p=P(); const dn=new Date(d+"T12:00:00").toLocaleDateString("bg-BG",{weekday:"long",day:"numeric",month:"long"});
  let st={step:"ask",reason:"",details:"",alternative:"",newTime:""};
  const tomorrow=new Date(Date.now()+864e5); const defT=tomorrow.toISOString().slice(0,10)+"T"+(notifCfg().evening||"18:00");
  const draw=()=>sheet(`<div class="grab"></div><p class="eyebrow">${esc(dn)}</p>
    ${st.step==="ask"?`<div class="h2">Как мина тренировката?</div><p class="muted" style="margin:0">Беше в плана. Без вина — просто да знаем как да продължим.</p>
      <button class="btn block" id="msDone" type="button">Завърших я</button><button class="btn ghost block" id="msSkip" type="button">Пропуснах я</button><button class="btn ghost block" id="msRe" type="button">Пренасрочи</button><button class="btn ghost block" id="msLater" type="button">Не сега</button>`:
    `<div class="h2">${st.step==="re"?"Кога ти е удобно?":"Какво се случи?"}</div>
      <div class="chips">${Object.entries(FC.SKIP_REASONS).map(([k,n])=>`<button class="chip" type="button" data-rs="${k}" aria-pressed="${st.reason===k}">${esc(n)}</button>`).join("")}</div>
      ${st.reason&&st.reason!=="private"?`<label>Подробности (по желание)<input class="in" id="msDet" value="${esc(st.details)}" placeholder="Кратко, ако искаш"></label>`:""}
      ${st.reason?`<b>Какво да направим вместо това?</b><div class="chips">${FC.alternativesFor(st.reason).map(k=>`<button class="chip" type="button" data-alt="${k}" aria-pressed="${st.alternative===k}">${esc(FC.ALTERNATIVES[k])}</button>`).join("")}</div>`:""}
      ${st.alternative==="reschedule"?`<label>Нов ден и час<input class="in" id="msWhen" type="datetime-local" value="${esc(st.newTime||defT)}"></label><p class="note">Пренасрочената тренировка заменя, а не добавя — не удвояваме натоварването.</p>`:""}
      ${st.reason==="injury"||st.reason==="illness"?`<p class="note">При болка или болест почивката е на първо място. Ако симптомите не минават, потърси лекар.</p>`:""}
      <button class="btn block" id="msOk" type="button" ${st.reason&&st.alternative?"":"disabled"}>Потвърди</button><button class="btn ghost block" id="msBack" type="button">Назад</button>`}`, h=>{
      const on=(id,f)=>{ const el=$(id); if(el) el.onclick=f; };
      on("#msDone",()=>{ p.log[d]=p.log[d]||{}; p.log[d].complete=true; p.log[d].confirmedLate=true; p.xp+=30; save(); closeSheet(); toast("Записано","Тренировката от "+dn+" е отбелязана."); render(); });
      on("#msSkip",()=>{ st.step="skip"; draw(); }); on("#msRe",()=>{ st.step="re"; st.alternative="reschedule"; draw(); });
      on("#msLater",()=>{ p.log[d]=p.log[d]||{}; p.log[d].missedAsked=true; save(); closeSheet(); });
      on("#msBack",()=>{ st={step:"ask",reason:"",details:"",alternative:"",newTime:""}; draw(); });
      h.querySelectorAll("[data-rs]").forEach(b=>b.onclick=()=>{ st.reason=b.dataset.rs; if(!FC.alternativesFor(st.reason).includes(st.alternative)) st.alternative=st.step==="re"&&FC.alternativesFor(st.reason).includes("reschedule")?"reschedule":""; draw(); });
      h.querySelectorAll("[data-alt]").forEach(b=>b.onclick=()=>{ const det=$("#msDet"); if(det) st.details=det.value; st.alternative=b.dataset.alt; draw(); });
      const w=$("#msWhen"); if(w) w.onchange=()=>{ st.newTime=w.value; };
      on("#msOk",()=>{ const det=$("#msDet"); if(det) st.details=det.value; if(st.alternative==="reschedule"&&!st.newTime) st.newTime=($("#msWhen")||{}).value||defT;
        const r=FC.resolveSkip(Object.assign({},st,{confirmed:true}));
        if(!r.ok) return toast("Провери",r.errors.includes("time_required")?"Избери ден и час.":"Избери причина.");
        p.log[d]=p.log[d]||{}; p.log[d].skip=r.changes.skip;
        if(r.changes.reschedule){ p.resched=(p.resched||[]).filter(x=>!x.done); p.resched.push({from:d, at:r.changes.reschedule.at, done:false}); }
        if(r.changes.loadFactor<1) p.loadNext=r.changes.loadFactor;
        save(); closeSheet(); scheduleNotifs();
        toast("Разбрано", st.alternative==="reschedule"?"Пренасрочено за "+new Date(st.newTime).toLocaleString("bg-BG",{weekday:"short",day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}):FC.ALTERNATIVES[st.alternative]+" — без двойно натоварване.");
        render(); });
    });
  draw();
}
/* известие вечерта, ако днешната тренировка не е отбелязана, и за пренасрочените */
(function(){ const base=scheduleNotifs; scheduleNotifs=async function(){ await base.apply(this,arguments);
  const LN=Plug("LocalNotifications"), p=P(); if(!NATIVE||!LN||!p||!notifCfg().on) return;
  try{ const out=[], now=new Date(), t=todayISO();
    if(trainingDays(p).includes(now.getDay()) && !(p.log[t]&&(p.log[t].complete||p.log[t].skip))){ const at=new Date(); at.setHours(21,0,0,0); if(at>now) out.push({id:7701,title:"Как мина днешната тренировка?",body:"Отбележи я, пропусни или пренасрочи — с един докосване.",schedule:{at,allowWhileIdle:true}}); }
    (p.resched||[]).filter(r=>!r.done).forEach((r,k)=>{ const at=new Date(new Date(r.at).getTime()-3600e3); if(at>now) out.push({id:7710+k,title:"След 1 час: пренасрочената тренировка",body:"Същият план, без двойно натоварване.",schedule:{at,allowWhileIdle:true}}); });
    out.forEach(n=>{ n.channelId="fit_drop"; n.sound="drop.wav"; }); if(out.length) await LN.schedule({notifications:out});
  }catch(e){} }; })();
function startToday(){
  const ex=planExercises(); if(!ex.length) return quickSheet();
  recoverySheet(l=>{ const p=P(); const ln=p.loadNext||1; p.loadNext=null; save(); startLive(ex,"plan",Math.min(l,ln)); });
}
(function(){ const base=rToday; rToday=function(){ base.apply(this,arguments);
  const v=$("#v-today"); if(!v) return;
  const s=liveSession(); const rs=reschedToday();
  const host=v.querySelector("#liveHost");
  if(host){
    host.innerHTML = s ? `<button class="btn hot block live-main" data-go="live" type="button">Продължи тренировката на живо</button>` :
      `<button class="btn hot block live-main" id="liveGo" type="button">▶ Започни на живо</button><button class="btn ghost block" id="quickGo" type="button">Имам малко време — бърза тренировка</button>`;
  }
  const rest=v.querySelector("#restHost");
  if(rest) rest.innerHTML = s ? `<button class="btn hot block live-main" data-go="live" type="button">Продължи тренировката на живо</button>` : `<button class="btn ghost block" id="quickGo" type="button">Искам да потренирам — бърза тренировка</button>`;
  if(rs){ const n=v.querySelector("#reschedNote"); if(n) n.innerHTML=`<span class="pill accent">Пренасрочена от ${new Date(rs.from+"T12:00:00").toLocaleDateString("bg-BG",{weekday:"long"})} · ${rs.at.slice(11,16)} · без двойно натоварване</span>`; }
  const lg=$("#liveGo"); if(lg) lg.onclick=startToday;
  const qg=$("#quickGo"); if(qg) qg.onclick=quickSheet;
}; })();
