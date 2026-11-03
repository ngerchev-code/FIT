/* ============ СЪГЛАСИЯ, ПОВЕРИТЕЛНОСТ, ТИХИ ЧАСОВЕ, ДАННИ ============ */
const CONSENT_V = 1;
const CONSENT_ITEMS = [
  ["loc","Местоположение","За картата GUIDE, времето и идеите навън. Остава на телефона."],
  ["notif","Известия","Напомняния за тренировка, почивка и часове. Без спам — има тихи часове."],
  ["health","Самооценка за възстановяване","Енергия, сън, болка преди тренировка. Само на телефона."],
  ["ai","AI разпознаване на снимки","Снимката на уреда се изпраща към Claude само когато натиснеш „Разпознай“."]
];
function consent(){ return S.consent||{}; }
function allowed2(k){ const c=consent(); return c[k]!==false; }
function consentSheet(next){
  const c=Object.assign({loc:true,notif:true,health:true,ai:true},S.consent||{});
  const draw=()=>sheet(`<div class="grab"></div>
    <svg class="ens" viewBox="0 0 100 100" width="68" height="68" aria-label="Ensō 円相 — дзен кръг"><path d="M78 22 A38 38 0 1 0 86 52" fill="none" style="stroke:var(--go)" stroke-width="9" stroke-linecap="round" opacity=".9"/><path d="M86 52 A38 38 0 0 1 84 60" fill="none" style="stroke:var(--go)" stroke-width="5" stroke-linecap="round" opacity=".6"/></svg>
    <p class="eyebrow">Beyond fitness. Built around you.</p>
    <div class="h-display" style="font-size:26px">Твоят ритъм. Твоите възможности. Твоят напредък.</div>
    <p style="margin:0">Не всеки започва от едно и също място. Не всеки има еднакви възможности. И никой не трябва да следва чужда програма. FIT се адаптира към теб — към силите, амбициите и ежедневието ти. <b>Ние предлагаме пътя. Ти запазваш избора.</b></p>
    <p class="eyebrow" style="margin-top:6px">Какво разрешаваш</p>
    ${CONSENT_ITEMS.map(([k,n,d])=>`<button class="cs-row" type="button" data-cs="${k}" aria-pressed="${c[k]}"><span class="cs-sw" aria-hidden="true"></span><span><b>${n}</b><br><span class="muted">${d}</span></span></button>`).join("")}
    <p class="note">Данните ти стоят на устройството. Можеш да ги изтеглиш или изтриеш по всяко време: Меню → Поверителност и данни. FIT не поставя диагнози и не замества лекар.</p>
    <button class="btn block" id="csOk" type="button">Продължи</button>`, h=>{
      $("#scrim").onclick=null;
      h.querySelectorAll("[data-cs]").forEach(b=>b.onclick=()=>{ c[b.dataset.cs]=!c[b.dataset.cs]; draw(); });
      $("#csOk").onclick=()=>{ S.consent=Object.assign({},c,{v:CONSENT_V,at:new Date().toISOString()}); save(); closeSheet(); if(!c.notif) scheduleNotifs(); next&&next(); };
    });
  draw();
}
function quiet(){ return Object.assign({on:true,from:"22:00",to:"07:00"},S.quiet||{}); }
function inQuiet(d,q){ const m=d.getHours()*60+d.getMinutes(); const f=hm(q.from), t=hm(q.to); return f<t ? (m>=f&&m<t) : (m>=f||m<t); }
function hm(s){ const [h,m]=String(s||"0:0").split(":").map(Number); return h*60+(m||0); }
function quietEnd(d,q){ const e=new Date(d); const t=hm(q.to); e.setHours(Math.floor(t/60),t%60,0,0); if(e<=d) e.setDate(e.getDate()+1); return e; }
/* съгласия и тихи часове върху съществуващите функции */
(function(){
  const mp=myPosition; myPosition=async function(){ if(!allowed2("loc")) return null; return mp.apply(this,arguments); };
  const rs=recoverySheet; recoverySheet=function(then){ if(!allowed2("health")) return then(1); return rs.apply(this,arguments); };
  const ai=aiScan; aiScan=async function(){ if(!allowed2("ai")) throw {code:"not_granted"}; return ai.apply(this,arguments); };
  const sn=scheduleNotifs; scheduleNotifs=async function(){
    const LN=Plug("LocalNotifications");
    if(!allowed2("notif")){ if(NATIVE&&LN){ try{ const p=await LN.getPending(); if(p&&p.notifications&&p.notifications.length) await LN.cancel({notifications:p.notifications.map(n=>({id:n.id}))}); }catch(e){} } return; }
    await sn.apply(this,arguments);
    const q=quiet(); if(!NATIVE||!LN||!q.on) return;
    try{ const p=await LN.getPending(); const move=(p.notifications||[]).filter(n=>n.schedule&&n.schedule.at&&n.id!==7700&&inQuiet(new Date(n.schedule.at),q));
      if(!move.length) return;
      await LN.cancel({notifications:move.map(n=>({id:n.id}))});
      await LN.schedule({notifications:move.map(n=>({id:n.id,title:n.title,body:n.body,channelId:"fit_drop",sound:"drop.wav",schedule:{at:quietEnd(new Date(n.schedule.at),q),allowWhileIdle:true}}))});
    }catch(e){}
  };
})();
async function exportData(){
  const data=JSON.parse(JSON.stringify(S)); if(data.ai) delete data.ai.key;
  const txt=JSON.stringify({app:"FIT",format:1,exportedAt:new Date().toISOString(),data},null,2);
  const name="FIT-danni-"+todayISO()+".json"; const blob=new Blob([txt],{type:"application/json"});
  if(DL){ try{ await DL.save({filename:name,data:blob}); return; }catch(e){} }
  try{ const f=new File([blob],name,{type:"application/json"}); if(navigator.canShare&&navigator.canShare({files:[f]})){ await navigator.share({files:[f],title:"FIT — моите данни"}); return; } }catch(e){ if(e&&e.name==="AbortError") return; }
  if(!NATIVE){ try{ const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=name; document.body.appendChild(a); a.click(); a.remove(); toast("Данни","Файлът "+name+" е изтеглен."); return; }catch(e){} }
  try{ await navigator.clipboard.writeText(txt); toast("Данни","Копирани са в клипборда — постави ги в имейл или бележка."); }catch(e){ toast("Данни","Не успях да изтегля файла на това устройство."); }
}
function privacySheet(){
  const c=Object.assign({loc:true,notif:true,health:true,ai:true},S.consent||{}); const q=quiet();
  const sz=(()=>{ try{ return Math.round(JSON.stringify(S).length/1024); }catch(e){ return 0; } })();
  sheet(`<div class="grab"></div><p class="eyebrow">Поверителност и данни</p><div class="h2">Ти решаваш</div>
    ${CONSENT_ITEMS.map(([k,n,d])=>`<button class="cs-row" type="button" data-cs="${k}" aria-pressed="${c[k]}"><span class="cs-sw" aria-hidden="true"></span><span><b>${n}</b><br><span class="muted">${d}</span></span></button>`).join("")}
    <p class="eyebrow" style="margin-top:6px">Тихи часове</p>
    <button class="cs-row" type="button" id="qOn" aria-pressed="${q.on}"><span class="cs-sw" aria-hidden="true"></span><span><b>Без известия нощем</b><br><span class="muted">Известията в този интервал идват след края му.</span></span></button>
    <div class="grid2"><label>От<input class="in" id="qFrom" type="time" value="${q.from}"></label><label>До<input class="in" id="qTo" type="time" value="${q.to}"></label></div>
    <p class="eyebrow" style="margin-top:6px">Моите данни · ${sz} KB на това устройство</p>
    <button class="btn ghost block" id="pvExp" type="button">Изтегли всичките ми данни (JSON)</button>
    <button class="btn ghost block" id="pvDel" type="button" style="color:var(--hot)">Изтрий всичко</button>
    <p class="note">Данните се пазят само на това устройство. Пулс и калории не се измерват от FIT; всичко записано е самоотчет или ръчно потвърдено.</p>
    <button class="btn block" id="pvOk" type="button">Запази</button>`, h=>{
      h.querySelectorAll("[data-cs]").forEach(b=>b.onclick=()=>{ const k=b.dataset.cs; c[k]=!c[k]; b.setAttribute("aria-pressed",c[k]); });
      $("#qOn").onclick=e=>{ q.on=!q.on; e.currentTarget.setAttribute("aria-pressed",q.on); };
      $("#pvExp").onclick=exportData;
      $("#pvDel").onclick=deleteSheet;
      $("#pvOk").onclick=()=>{ q.from=$("#qFrom").value||"22:00"; q.to=$("#qTo").value||"07:00"; S.quiet=q; S.consent=Object.assign({},c,{v:CONSENT_V,at:new Date().toISOString()}); save(); closeSheet(); scheduleNotifs(); toast("Поверителност","Настройките са запазени."); render(); };
    });
}
function deleteSheet(){
  sheet(`<div class="grab"></div><p class="eyebrow">Изтриване</p><div class="h2">Изтрий всички данни на FIT от това устройство?</div>
    <p style="margin:0">Профили, тренировки, серии, обекти и настройки. Това не може да се върне. Ако искаш копие — първо „Изтегли всичките ми данни“.</p>
    <label>Напиши <b>ИЗТРИЙ</b><input class="in" id="dlTxt" autocomplete="off"></label>
    <button class="btn hot block" id="dlGo" type="button">Изтрий завинаги</button><button class="btn ghost block" data-close type="button">Отказ</button>`, h=>{
      $("#dlGo").onclick=async()=>{ if($("#dlTxt").value.trim().toUpperCase()!=="ИЗТРИЙ") return toast("Изтриване","Напиши ИЗТРИЙ, за да потвърдиш.");
        const LN=Plug("LocalNotifications"); if(NATIVE&&LN){ try{ const p=await LN.getPending(); if(p.notifications&&p.notifications.length) await LN.cancel({notifications:p.notifications.map(n=>({id:n.id}))}); }catch(e){} }
        try{ Object.keys(localStorage).filter(k=>k.startsWith("fit_")).forEach(k=>localStorage.removeItem(k)); }catch(e){}
        S={people:[],active:null,lastTipDay:"",lastChallengeDay:""}; location.reload(); };
    });
}

/* ============ МОЯТ ПЪТ: 6 / 9 / 12 МЕСЕЦА ============ */
let pathH=12;
function pathOf(p){ p.path=p.path||{start:p.start, revisions:[]}; return p.path; }
function monthRange(today,back){ const d=new Date(today+"T12:00:00"); d.setDate(1); d.setMonth(d.getMonth()-back); const a=d.toISOString().slice(0,10); const e=new Date(d); e.setMonth(e.getMonth()+1); e.setDate(0); return [a, e.toISOString().slice(0,10)]; }
function pathCard(p){
  const path=pathOf(p), t=todayISO(); const plan=FC.planHorizons({goals:goalsOf(p),days:p.days,start:path.start,level:p.level});
  const m=Math.min(12,FC.monthIndex(path.start,t)); const H=plan.horizons[pathH];
  const ph=plan.phases.find(x=>m>=x.from&&m<=x.to)||plan.phases[plan.phases.length-1];
  const firstMonth = m<=1;
  const [a,b]= firstMonth ? [path.start,t] : monthRange(t,1);
  const rv=FC.monthlyReview({log:p.log,sessions:(p.wk&&p.wk.sessions)||[],from:a,to:b,days:p.days});
  const mName=new Date(a+"T12:00:00").toLocaleDateString("bg-BG",{month:"long"});
  return `<div class="card path-card" id="pathCard">
    <div class="row" style="justify-content:space-between;align-items:flex-start"><div><p class="eyebrow">Моят път · месец ${m} от 12</p><h2 class="h2" style="margin:0">${esc(goalName(p))}</h2></div><span class="kaizen" title="Kaizen — постоянно подобрение">改善</span></div>
    <div class="xpbar"><i style="width:${Math.round(m/12*100)}%"></i></div>
    <div class="chips" style="flex-wrap:nowrap">${[6,9,12].map(n=>`<button class="chip" type="button" data-ph="${n}" aria-pressed="${pathH===n}" style="flex:1 1 0;display:flex;justify-content:center;flex-direction:column;align-items:center;line-height:1.2;padding:8px 6px"><b>${n} месеца</b><small style="font-weight:600;opacity:.75">до ${plan.horizons[n].date.slice(5,7)}.${plan.horizons[n].date.slice(0,4)}</small></button>`).join("")}</div>
    <div class="path-tl">${H.phases.map(x=>`<div class="${m>=x.from&&m<=x.to?"on":m>x.to?"done":""}"><b>${x.from===x.to?"М"+x.from:"М"+x.from+"–"+x.to}</b><span>${esc(x.name)}</span><small>${esc(x.focus)}</small></div>`).join("")}</div>
    <div><b>Към ${pathH} месеца:</b><ul style="margin:6px 0 0;padding-left:20px">${H.process.map(x=>`<li>${esc(x)}</li>`).join("")}</ul></div>
    <p class="note" style="margin:0">Сега: <b>${esc(ph.name)}</b> — ${esc(ph.focus)}. ${esc(plan.note)}</p>
    <div class="card" style="background:var(--surface-2);gap:8px"><p class="eyebrow">${firstMonth?"Първи месец досега":"Месечен преглед · "+esc(mName)}</p>
      <div class="stats"><div class="stat"><b>${rv.adherence}%</b><span>редовност</span></div><div class="stat"><b>${rv.done}/${rv.planned}</b><span>тренировки</span></div><div class="stat"><b>${rv.sets}</b><span>серии</span></div></div>
      <p style="margin:0">${esc(rv.advice)}</p><p class="note" style="margin:0">Източник: ${esc(rv.source)}.</p></div>
    <button class="btn ghost block" id="pathGoal" type="button">Смени целта</button>
    ${path.revisions.length?`<details><summary class="muted" style="cursor:pointer">История на промените (${path.revisions.length})</summary>${path.revisions.slice().reverse().map(r=>`<div class="ex-meta" style="margin-top:8px"><b>${new Date(r.at+"T12:00:00").toLocaleDateString("bg-BG")} · месец ${r.month}</b>: ${esc(r.from.map(g=>GOALS[g]?GOALS[g].n:g).join(" + "))} → ${esc(r.to.map(g=>GOALS[g]?GOALS[g].n:g).join(" + "))}<br>${esc(r.why.join(" "))}</div>`).join("")}</details>`:""}
  </div>`;
}
function goalChangeSheet(){
  const p=P(), path=pathOf(p); let sel=goalsOf(p).slice();
  const draw=()=>{ const r=FC.revisePlan({oldGoals:goalsOf(p),newGoals:sel,start:path.start,today:todayISO(),days:p.days,level:p.level}); const same=sel.join()===goalsOf(p).join();
    sheet(`<div class="grab"></div><p class="eyebrow">Смяна на целта</p><div class="h2">Накъде сега?</div><p class="muted" style="margin:0">До 3 цели. Изминатото се запазва.</p>
      <div class="chips">${Object.entries(GOALS).map(([k,g])=>`<button class="chip" type="button" data-ng="${k}" aria-pressed="${sel.includes(k)}">${g.n}</button>`).join("")}</div>
      ${same?"":`<div class="card" style="background:var(--surface-2);gap:6px"><b>Какво се променя</b>${r.revision.why.map(x=>`<div class="ex-meta">• ${esc(x)}</div>`).join("")}</div>`}
      <button class="btn block" id="ngOk" type="button" ${same?"disabled":""}>Потвърди новия план</button><button class="btn ghost block" data-close type="button">Отказ</button>`, h=>{
        h.querySelectorAll("[data-ng]").forEach(b=>b.onclick=()=>{ const k=b.dataset.ng; if(sel.includes(k)){ if(sel.length>1) sel=sel.filter(x=>x!==k); } else { if(sel.length>=3) sel.shift(); sel.push(k); } draw(); });
        $("#ngOk").onclick=()=>{ path.revisions.push(r.revision); p.goals=sel.slice(); p.goal=sel[0]; p.mode=null; save(); closeSheet(); toast("Нов план","Пътят за 6/9/12 месеца е преизчислен."); render(); };
      }); };
  draw();
}
(function(){ const base=rPlan; rPlan=function(){ base.apply(this,arguments); const v=$("#v-plan"); const p=P(); if(!v||!p) return;
  v.insertAdjacentHTML("afterbegin",pathCard(p));
  v.querySelectorAll("[data-ph]").forEach(b=>b.onclick=()=>{ pathH=+b.dataset.ph; rPlan(); });
  const g=$("#pathGoal"); if(g) g.onclick=goalChangeSheet; }; })();
