/* ============ НАПОМНЯНЕ ЗА ОБНОВЯВАНЕ · НОВОСТИ ============ */
const FIT_RELEASES_API = "https://api.github.com/repos/ngerchev-code/FIT/releases?per_page=6";
async function updateReminders(){
  if(!NATIVE) return;
  const LN=Plug("LocalNotifications"); const st=updState(); const now=Date.now();
  try{
    const me=BUILD||await myBuild(); if(!REL||now-(st.lastCheck||0)>6*3600e3){ await latestRelease(); st.lastCheck=now; }
    if(!REL) return;
    const nat=await nativeBuild();
    // броим напомнянето за голямо обновление като „изпратено“ едва когато времето му мине
    if(st.apkFor!==REL.code){ st.apkFor=REL.code; st.apkCount=0; st.apkAt=0; }
    else if(st.apkAt && now>=st.apkAt){ st.apkCount=(st.apkCount||0)+1; st.apkAt=0; }
    const plan=FC.updatePlan({now, latest:REL.code, installed:me, minNative:REL.minNative, nativeBuild:nat, news:REL.news, state:st, consent:allowed2("notif")});
    st.pendingApk = plan.action==="apk" ? REL.code : 0; st.lastNews=REL.news||[]; save();
    if(!LN) return;
    const keepApk = plan.action==="apk" && st.apkAt && now<st.apkAt;
    await LN.cancel({notifications:[{id:7721}].concat(keepApk?[]:[{id:7720}])});
    const list=plan.notify.filter(n=>!(n.kind==="apk"&&keepApk));
    list.forEach(n=>{ if(n.kind==="apk") st.apkAt=n.at; }); save();
    if(list.length) await LN.schedule({notifications:list.map(n=>({id:n.id,title:n.title,body:n.body,channelId:"fit_drop",sound:"drop.wav",schedule:{at:new Date(n.at),allowWhileIdle:true}}))});
  }catch(e){}
}
function newsBullets(body){ return ((body||"").split("### Какво ново")[1]||"").split("\n").filter(l=>l.startsWith("- ")).map(l=>l.slice(2).trim()).slice(0,6); }
async function newsSheet(){
  const st=updState();
  const paint=(rels,err)=>sheet(`<div class="grab"></div><p class="eyebrow">Новости и версии</p><div class="h2">Какво ново във FIT</div>
    <p class="muted" style="margin:0">Твоята версия: <b>1.0.${BUILD||"?"}</b>${st.pendingApk?` · налична е <b>1.0.${st.pendingApk}</b> (иска инсталация)`:""}</p>
    ${rels?rels.map(r=>{ const code=(/(\d+)$/.exec(r.tag_name||"")||[])[1]; const b=newsBullets(r.body); return `<div class="card" style="background:var(--surface-2);gap:4px"><b>1.0.${esc(code||"")} · ${esc((r.published_at||"").slice(0,10).split("-").reverse().join("."))}${+code===+BUILD?' <span class="pill good">твоята</span>':""}</b>${b.length?`<ul style="margin:4px 0 0;padding-left:18px">${b.map(x=>`<li>${esc(x)}</li>`).join("")}</ul>`:'<span class="muted">Подобрения и поправки.</span>'}</div>`; }).join(""):`<div class="thinking"><span class="spin"></span>${err?esc(err):"Зареждам новостите…"}</div>`}
    ${st.pendingApk?`<a class="btn hot block" href="${FIT_APK}" target="_blank" rel="noopener">Свали и инсталирай 1.0.${st.pendingApk}</a>`:""}
    <button class="btn block" id="nwChk" type="button">Провери за обновление сега</button><button class="btn ghost block" data-close type="button">Затвори</button>`, h=>{
      h.querySelectorAll("[data-close]").forEach(b=>b.onclick=closeSheet);
      $("#nwChk").onclick=()=>{ closeSheet(); checkUpdates(true).then(updateReminders); };
    });
  paint(null);
  try{ const r=await fetch(FIT_RELEASES_API,{cache:"no-store"}); if(!r.ok) throw 0; const rels=(await r.json()).filter(x=>!x.draft).slice(0,6);
    const top=(/(\d+)$/.exec((rels[0]||{}).tag_name||"")||[])[1]; if(top){ st.newsSeen=+top; save(); } paint(rels); }
  catch(e){ paint(null,"Няма връзка — опитай пак по-късно."); }
}
function newsUnseen(){ const st=updState(); const top=(REL&&REL.code)||st.pendingApk||0; return top && top>(st.newsSeen||0) && top>(BUILD||0)-0 ? true : (REL&&REL.code>(st.newsSeen||0)); }
/* меню: „Версия и обновления“ → „Новости и версии“ с точка, ако има непрочетено */
(function(){ const base=openDrawer; openDrawer=function(){ base.apply(this,arguments); const b=document.querySelector('[data-dr="x:upd"]'); if(!b) return;
  b.innerHTML='Новости и версии'+(newsUnseen()?' <span class="nw-dot" aria-label="ново"></span>':''); b.onclick=()=>{ closeSheet(); newsSheet(); }; }; })();
/* банер на „Днес“, докато чака голямо обновление */
(function(){ const base=rToday; rToday=function(){ base.apply(this,arguments); const st=updState(); const v=$("#v-today"); if(!v||!NATIVE||!st.pendingApk||st.pendingApk<=(BUILD||0)||v.querySelector(".upd-banner")) return;
  v.insertAdjacentHTML("afterbegin",`<div class="card upd-banner"><b>Ново: FIT 1.0.${st.pendingApk}</b><span class="ex-meta">${esc((st.lastNews||[])[0]||"Нови функции и подобрения.")} Инсталира се веднъж — данните ти остават.</span><div class="grid2"><a class="btn hot" href="${FIT_APK}" target="_blank" rel="noopener">Инсталирай</a><button class="btn ghost" type="button" id="updNews">Какво ново</button></div></div>`);
  $("#updNews").onclick=newsSheet; }; })();
/* проверка и при връщане в приложението (над 6 часа от последната) */
if(NATIVE){
  setTimeout(()=>{ if(P()) updateReminders(); }, 15000);
  try{ const App=Plug("App"); if(App) App.addListener("resume",()=>{ const st=updState(); if(P()&&Date.now()-(st.lastCheck||0)>6*3600e3){ checkUpdates(false).then(updateReminders); } else if(P()) updateReminders(); }); }catch(e){}
}
/* уеб версия (iPhone/браузър): ако на сървъра има по-нова версия — бутон „Обнови“ */
if(!NATIVE && location.protocol==="https:" && !/claude|anthropic/.test(location.hostname)){
  let webStart=0;
  const webCheck=async()=>{ try{ const r=await fetch("build.json",{cache:"no-store"}); if(!r.ok) return; const c=(await r.json()).code||0;
    if(!webStart){ webStart=c; return; }
    if(c>webStart && !document.querySelector(".upd-web")){ document.body.insertAdjacentHTML("beforeend",`<div class="upd-web"><span>Нова версия на FIT е готова</span><button type="button" id="updWeb">Обнови</button></div>`); $("#updWeb").onclick=()=>location.reload(); } }catch(e){} };
  webCheck(); setInterval(webCheck, 30*60e3);
  document.addEventListener("visibilitychange",()=>{ if(document.visibilityState==="visible") webCheck(); });
}
