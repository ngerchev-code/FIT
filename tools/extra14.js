/* ============ ЧАСОВНИК (Wear OS — Galaxy Watch) ============ */
const WATCH_APK = "https://github.com/ngerchev-code/FIT/releases/latest/download/FIT-watch.apk";
const WB = () => Plug("WearBridge");
let watchAcks = [], watchPushT = null, watchRestT = null;
function watchState(){
  const p=P(); const s=p?liveSession():null;
  if(!s){ const last=p&&p.wk&&p.wk.sessions.filter(x=>x.state==="completed").slice(-1)[0];
    return {v:1, active:false, state:"none", name:p?p.name:"", acks:watchAcks.slice(-100),
      summary: last&&last.date===todayISO()?("Днес: "+FC.summary(last).sets+" серии ✓"):""}; }
  const e=s.exercises.find(x=>x.id===s.activeExerciseId)||s.exercises[0]; const act=FC.activeSet(s);
  const done=e?FC.completedSets(s,e.id):[]; const prev=done[done.length-1];
  return {v:1, active:s.state==="active"||s.state==="paused", state:s.state, name:p.name, cur:e?e.id:"",
    setNo:done.length+1, kg:act?act.weightKg:(prev?prev.weightKg:(e?e.targetKg:0)), reps:act?act.reps:(prev?prev.reps:(e?e.targetReps:10)),
    restSec:e?e.restSec:90, set:act?{id:act.id, startedAt:Date.parse(act.startedAt)}:null,
    restUntil:s.restUntil&&Date.parse(s.restUntil)>Date.now()?Date.parse(s.restUntil):null,
    ex:s.exercises.map(x=>({id:x.id, name:x.name, machine:x.machine||"", done:FC.completedSets(s,x.id).length, target:x.targetSets, kg:x.targetKg, reps:x.targetReps, rest:x.restSec, cardio:x.group==="cardio"||x.group==="mobility"})),
    acks:watchAcks.slice(-100), at:Date.now()};
}
function pushWatch(){
  if(!NATIVE||!WB()) return;
  clearTimeout(watchPushT);
  watchPushT=setTimeout(()=>{ try{ const st=watchState(), js=JSON.stringify(st); WB().sendState({json:js});
    if(st.active && allowed2("notif")) WB().showWorkout({json:js}); else WB().clearWorkout();
    clearTimeout(watchRestT); if(st.restUntil) watchRestT=setTimeout(pushWatch, Math.max(500, st.restUntil-Date.now()+500)); }catch(e){} },120);
}
function ackWatch(id){ if(id&&!watchAcks.includes(id)){ watchAcks.push(id); if(watchAcks.length>300) watchAcks=watchAcks.slice(-200); } }
function onWatchAction(json){
  let a; try{ a=typeof json==="string"?JSON.parse(json):json; }catch(e){ return; }
  if(!a||!a.type) return;
  if(a.type==="REQUEST_STATE") return pushWatch();
  const p=P(); if(!p){ ackWatch(a.opId); return pushWatch(); }
  if(String(a.opId||"").startsWith("w-")) a.at=FC.trustAt(a.at); else if(!a.at) a.at=new Date().toISOString();
  const s=liveSession();
  try{
    if(a.type==="START_PLAN"){
      if(!s){ let ex=planExercises();
        if(!ex.length){ const last=lastSettings(); ex=FC.planQuick({minutes:Math.min(p.minutes||30,45),machines:machineList().slice(0,3).map(m=>({id:m.id,name:m.name,group:m.group,weightKg:last[m.id]?last[m.id].weightKg:0}))}).exercises; }
        const ln=p.loadNext||1; p.loadNext=null; startLive(ex,"plan",ln); toast("Часовник","Тренировката започна от часовника."); }
    } else if(!s){ /* няма активна тренировка — потвърждаваме, за да не се повтаря */ }
    else if(a.type==="END_WORKOUT"){
      const act=FC.activeSet(s); if(act) liveDo({type:"CANCEL_SET",setId:act.id});
      if(FC.summary(liveSession()).sets) finishLive(); else { liveDo({type:"CANCEL_WORKOUT"}); toast("Часовник","Тренировката е прекратена без серии."); show("today"); }
    } else {
      const n=FC.apply(s,a); if(n!==s){ persistLive(n); restNotify(n); } if(a.type==="COMPLETE_SET") autoAdvance();
    }
  }catch(e){ /* невалидно в текущото състояние — потвърждаваме и пращаме истинското състояние */ }
  ackWatch(a.opId);
  if(TAB==="live") rLive(); else if(TAB==="today") rToday();
  pushWatch();
}
/* всяка промяна по тренировката отива и към часовника */
(function(){ const base=persistLive; persistLive=function(){ const r=base.apply(this,arguments); pushWatch(); return r; }; })();
function watchSheet(){
  const paint=(st)=>sheet(`<div class="grab"></div><p class="eyebrow">Часовник · Wear OS</p><div class="h2">FIT на Galaxy Watch</div>
    ${!NATIVE?`<p style="margin:0">Часовникът работи с FIT за Android на телефона. На iPhone — Apple Watch ще бъде добавен по-късно.</p>`:
      `<p style="margin:0">${st?(st.nodes?`<b style="color:var(--go)">● Свързан: ${esc(st.names||"часовник")}</b>`:`<b style="color:var(--muted)">○ Няма свързан часовник</b>`):"Проверявам…"}</p>`}
    <ol style="margin:0;padding-left:20px;display:flex;flex-direction:column;gap:6px">
      <li>На часовника: Настройки → За часовника → Софтуер → натисни 5 пъти „Версия на софтуера“ (включва режим за разработчици).</li>
      <li>Настройки → Опции за разработчици → включи „ADB отстраняване на грешки“ и „Отстраняване на грешки през Wi-Fi“.</li>
      <li>На телефона инсталирай „Wear Installer 2“ (или „Bugjaeger“) от Google Play и свали FIT-watch.apk.</li>
      <li>В приложението въведи IP адреса от часовника, сдвои и избери FIT-watch.apk → Инсталирай.</li>
    </ol>
    <p class="note" style="margin:0;color:var(--hot);font-weight:800">Не инсталирай FIT-watch.apk на телефона — той ще замени FIT. Сваля се на телефона, но се инсталира на часовника през Wear Installer 2.</p><a class="btn block" href="${WATCH_APK}" target="_blank" rel="noopener">Свали FIT-watch.apk</a>
    <p class="note" style="margin:0">Часовникът е придружител: тренировката се записва на телефона. Без връзка действията се пазят на часовника и се изпращат после — без дублиране. Пулсът е от сензора на часовника, само с твое разрешение, и не е медицинско измерване.</p>
    <button class="btn ghost block" data-close type="button">Затвори</button>`);
  paint(null);
  if(NATIVE&&WB()) WB().status().then(paint).catch(()=>paint({nodes:0}));
}
/* известия за всички потребители: план за деня, напомняния, пропусната тренировка — и при затворено приложение */
if(NATIVE) setTimeout(()=>{ try{ if(P()&&S.consent) scheduleNotifs(); }catch(e){} },4000);
if(NATIVE && WB()){
  try{
    WB().addListener("watchAction",e=>onWatchAction(e.json));
    const drain=()=>WB().drainQueue().then(r=>{ let q=[]; try{ q=JSON.parse(r.items||"[]"); }catch(e){} q.forEach(j=>onWatchAction(j)); pushWatch(); }).catch(()=>{});
    setTimeout(drain,1200);
    const App=Plug("App"); if(App) App.addListener("resume",drain);
  }catch(e){}
}
