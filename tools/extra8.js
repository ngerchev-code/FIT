/* ============ АВТОМАТИЧНО ОБНОВЯВАНЕ „ПО ВЪЗДУХА“ ============ */
const FIT_REPO_API = "https://api.github.com/repos/ngerchev-code/fit/releases/latest";
const FIT_APK = "https://github.com/ngerchev-code/fit/releases/latest/download/FIT.apk";
let BUILD=0, REL=null;
try{ const u=Plug("CapacitorUpdater"); if(u) u.notifyAppReady(); }catch(e){}
async function myBuild(){ try{ const r=await fetch("build.json",{cache:"no-store"}); if(r.ok) BUILD=(await r.json()).code||0; }catch(e){} return BUILD; }
async function nativeBuild(){ try{ const i=await Plug("App").getInfo(); return +i.build||0; }catch(e){ return 0; } }
async function latestRelease(){
  try{
    const r=await fetch(FIT_REPO_API,{cache:"no-store"}); if(!r.ok) return 0;
    const d=await r.json(); const m=/(\d+)$/.exec(d.tag_name||""); if(!m) return 0;
    const web=(d.assets||[]).find(a=>a.name==="web.zip"); const mn=/minNative:\s*(\d+)/.exec(d.body||"");
    const news=((d.body||"").split("### Какво ново")[1]||"").split("\n").filter(l=>l.startsWith("- ")).map(l=>l.slice(2).trim()).slice(0,6);
    REL={code:+m[1], web:web?web.browser_download_url:null, minNative:mn?+mn[1]:+m[1], news}; return +m[1];
  }catch(e){ return 0; }
}
function updState(){ S.upd=S.upd||{}; return S.upd; }
function applyWhenIdle(up,id,code){
  const idle=()=>TAB==="today" && !$("#sheetHost").innerHTML;
  const go=()=>{ toast("Обновяване","FIT се обновява до 1.0."+code+"…"); setTimeout(()=>up.set({id}).catch(()=>{}),1400); };
  if(idle()) return go();
  let n=0; const t=setInterval(()=>{ n++; if(idle()){ clearInterval(t); go(); } else if(n>120) clearInterval(t); },5000);
  try{ Plug("App").addListener("resume",()=>{ clearInterval(t); go(); }); }catch(e){}
}
async function checkUpdates(manual){
  if(!NATIVE){ if(manual) toast("Обновления","Тази версия се обновява сама."); return; }
  const me=BUILD||await myBuild(); const st=updState();
  // току-що обновено → „Какво ново“
  if(me && st.seen && me>st.seen){
    st.seen=me; save(); await latestRelease();
    const news=(REL&&REL.code===me&&REL.news.length)?REL.news:["Подобрения и поправки."];
    sheet(`<div class="grab"></div><p class="eyebrow">Версия 1.0.${me}</p><div class="h-display">FIT е обновен</div>
      <ul style="margin:0;padding-left:20px">${news.map(x=>`<li>${esc(x)}</li>`).join("")}</ul>
      <p class="muted" style="margin:0">Обнови се сам — данните ти са запазени.</p><button class="btn block" data-close type="button">Супер</button>`,h=>h.querySelectorAll("[data-close]").forEach(b=>b.onclick=closeSheet));
    dropSound(); return;
  }
  if(me && !st.seen){ st.seen=me; save(); }
  const rel=await latestRelease();
  if(!me||!rel||rel<=me){ if(manual) toast("Обновления","Имаш най-новата версия 1.0."+(me||"?")+"."); return; }
  const nat=await nativeBuild(); const up=Plug("CapacitorUpdater");
  if(up && REL.web && REL.minNative<=nat){
    try{
      let id = st.readyCode===rel ? st.readyId : null;
      if(!id){ const b=await up.download({url:REL.web, version:String(rel)}); id=b.id; await up.next({id}); st.readyCode=rel; st.readyId=id; save(); }
      applyWhenIdle(up,id,rel); return;
    }catch(e){ /* при грешка — предложение за APK по-долу */ }
  }
  if(!manual && st.askedApk && Date.now()-st.askedApk<864e5) return;
  st.askedApk=Date.now(); save();
  sheet(`<div class="grab"></div><p class="eyebrow">Нова версия 1.0.${rel}</p><div class="h-display">Голямо обновление на FIT</div>
    ${REL.news.length?`<ul style="margin:0;padding-left:20px">${REL.news.map(x=>`<li>${esc(x)}</li>`).join("")}</ul>`:""}
    <p class="muted" style="margin:0">Тази версия обновява и самото приложение, затова се инсталира веднъж. Данните ти остават.</p>
    <a class="btn hot block" href="${FIT_APK}" target="_blank" rel="noopener">Свали и инсталирай</a><button class="btn ghost block" data-close type="button">По-късно</button>`,h=>h.querySelectorAll("[data-close]").forEach(b=>b.onclick=closeSheet));
}
