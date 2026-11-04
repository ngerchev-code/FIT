/* ============ ЗДРАВНО ДОСИЕ (само на това устройство) ============ */
const HDB_NAME="fit_files";
function hdb(){ return new Promise((res,rej)=>{ try{ const r=indexedDB.open(HDB_NAME,1); r.onupgradeneeded=()=>r.result.createObjectStore("files",{keyPath:"id"}); r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); }catch(e){ rej(e); } }); }
async function hdbPut(rec){ const db=await hdb(); return new Promise((res,rej)=>{ const t=db.transaction("files","readwrite"); t.objectStore("files").put(rec); t.oncomplete=()=>res(true); t.onerror=()=>rej(t.error); }); }
async function hdbGet(id){ const db=await hdb(); return new Promise((res,rej)=>{ const q=db.transaction("files").objectStore("files").get(id); q.onsuccess=()=>res(q.result||null); q.onerror=()=>rej(q.error); }); }
async function hdbDel(id){ const db=await hdb(); return new Promise(res=>{ const t=db.transaction("files","readwrite"); t.objectStore("files").delete(id); t.oncomplete=()=>res(true); t.onerror=()=>res(false); }); }
function healthOf(p){ p.health=p.health||{records:[]}; return p.health; }
let healthOpen=null, healthAll=false, healthBusy="";
/* безопасно показване на анализи (Word → HTML): само основни тагове, без атрибути и скриптове */
function safeHTML(html){
  const ok=new Set(["P","H1","H2","H3","H4","UL","OL","LI","TABLE","THEAD","TBODY","TR","TD","TH","STRONG","EM","B","I","BR","BLOCKQUOTE"]);
  const doc=new DOMParser().parseFromString(String(html||""),"text/html");
  const walk=n=>{ [...n.childNodes].forEach(c=>{ if(c.nodeType===1){ walk(c); if(!ok.has(c.tagName)){ c.replaceWith(...c.childNodes); } else { [...c.attributes].forEach(a=>c.removeAttribute(a.name)); } } else if(c.nodeType!==3) c.remove(); }); };
  walk(doc.body); return doc.body.innerHTML;
}
async function importDossier(obj){
  if(!obj||obj.fitDossier!==1||!Array.isArray(obj.records)) throw new Error("not_dossier");
  const p=P(), h=healthOf(p); let n=0;
  for(const r of obj.records){
    const docs=[];
    for(const d of (r.docs||[])){
      const id="doc-"+r.id+"-"+docs.length;
      const bin=atob(d.b64||""); const u=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) u[i]=bin.charCodeAt(i);
      await hdbPut({id, name:d.name, type:d.type, blob:new Blob([u],{type:d.type}), html:d.html?safeHTML(d.html):""});
      docs.push({id, name:d.name, type:d.type, size:u.length, hasHtml:!!d.html});
    }
    const rec={id:r.id, kind:r.kind||"lab", date:r.date, title:r.title||"Изследвания", lab:r.lab||"", labNo:r.labNo||"", note:r.note||"",
      values:(r.values||[]).map(v=>({name:String(v.name), value:String(v.value), unit:String(v.unit||""), ref:String(v.ref||""), flag:/^[HL]$/.test(v.flag)?v.flag:"", group:String(v.group||"")})),
      docs, source:"Внесено от файл", importedAt:new Date().toISOString()};
    h.records=h.records.filter(x=>x.id!==rec.id); h.records.push(rec); n++;
  }
  h.records.sort((a,b)=>(b.date||"").localeCompare(a.date||"")); save(); return n;
}
async function addHealthFile(file){
  const p=P(), h=healthOf(p); const id="doc-"+Date.now();
  await hdbPut({id, name:file.name, type:file.type||"application/octet-stream", blob:file, html:""});
  const rec={id:"rec-"+Date.now(), kind:"doc", date:todayISO(), title:file.name.replace(/\.[^.]+$/,""), lab:"", values:[], docs:[{id, name:file.name, type:file.type, size:file.size}], source:"Добавено от теб", importedAt:new Date().toISOString()};
  h.records.unshift(rec); save(); return rec;
}
function flagged(rec){ return (rec.values||[]).filter(v=>v.flag); }
/* показател от последните изследвания по име (за връзка със скенера на храни) */
function latestFlag(rx){ const p=P(); if(!p||!allowed2("health")) return null; const h=healthOf(p); for(const r of h.records){ const v=(r.values||[]).find(x=>rx.test(x.name)); if(v) return Object.assign({date:r.date},v); } return null; }
async function openHealthDoc(docId){
  const f=await hdbGet(docId); if(!f) return toast("Досие","Файлът не е намерен на това устройство.");
  if(f.html){ sheet(`<div class="grab"></div><p class="eyebrow">${esc(f.name)}</p><div class="health-doc">${f.html}</div><button class="btn ghost block" data-close type="button">Затвори</button>`,h=>h.querySelectorAll("[data-close]").forEach(b=>b.onclick=closeSheet)); return; }
  if(/^image\//.test(f.type)){ const u=URL.createObjectURL(f.blob); sheet(`<div class="grab"></div><p class="eyebrow">${esc(f.name)}</p><img src="${u}" alt="${esc(f.name)}" style="width:100%;border-radius:12px"><button class="btn ghost block" data-close type="button">Затвори</button>`,h=>h.querySelectorAll("[data-close]").forEach(b=>b.onclick=()=>{ URL.revokeObjectURL(u); closeSheet(); })); return; }
  try{ const fl=new File([f.blob],f.name,{type:f.type}); if(navigator.canShare&&navigator.canShare({files:[fl]})){ await navigator.share({files:[fl],title:f.name}); return; } }catch(e){ if(e&&e.name==="AbortError") return; }
  if(DL){ try{ await DL.save({filename:f.name,data:f.blob}); return; }catch(e){} }
  if(!NATIVE){ const u=URL.createObjectURL(f.blob); window.open(u,"_blank","noopener"); setTimeout(()=>URL.revokeObjectURL(u),60000); return; }
  toast("Досие","Оригиналът е запазен. Стойностите са показани по-горе; за PDF използвай „Сподели към лекар“.");
}
function doctorSummary(rec){
  const f=flagged(rec);
  return `Изследвания от ${rec.date.split("-").reverse().join(".")}${rec.lab?", "+rec.lab:""}${rec.labNo?", лаб. № "+rec.labNo:""}.\n`+
    (f.length?`Извън референтните граници (по флаговете на лабораторията):\n`+f.map(v=>`• ${v.name}: ${v.value} ${v.unit} (граници ${v.ref}) ${v.flag==="H"?"↑":"↓"}`).join("\n"):"Няма стойности извън границите.")+
    `\n\nМоля за оценка и препоръки. — изпратено от FIT`;
}
function rHealth(){
  const p=P(), v=$("#v-health");
  if(!allowed2("health")){ v.innerHTML=`<p class="eyebrow">Здраве</p><h1 class="h-display">Здравно досие</h1><div class="card"><p style="margin:0">Досието е изключено в „Поверителност и данни“ (Самооценка и здравни данни).</p><button class="btn block" id="hOn" type="button">Включи</button></div>`; $("#hOn").onclick=()=>{ S.consent=Object.assign({},S.consent||{},{health:true}); save(); rHealth(); }; return; }
  const h=healthOf(p);
  v.innerHTML=`<p class="eyebrow">Здраве · само на този телефон</p><h1 class="h-display" style="margin:0">Здравно досие</h1>
    <p class="note" style="margin:0">Документите и стойностите се пазят само на това устройство и не се изпращат никъде. FIT показва флаговете на лабораторията — не поставя диагнози.</p>
    <div class="grid2"><label class="btn" style="cursor:pointer">+ Документ<input type="file" id="hFile" accept="application/pdf,image/*,.doc,.docx,.txt" hidden></label><label class="btn ghost" style="cursor:pointer">Внеси досие (.json)<input type="file" id="hImp" accept=".json,application/json,*/*" hidden></label></div>
    ${healthBusy?`<div class="card"><div class="thinking"><span class="spin"></span>${esc(healthBusy)}</div></div>`:""}
    ${!h.records.length?`<div class="card"><b>Още няма документи</b><p class="muted" style="margin:0">Добави резултати от изследвания (PDF, снимка, Word) или внеси готово досие.</p></div>`:""}
    ${h.records.map(r=>{ const f=flagged(r); const open=healthOpen===r.id; const vals=healthAll?r.values:f; const groups=[...new Set(vals.map(x=>x.group))];
      return `<div class="card health-rec">
        <button class="health-head" type="button" data-hr="${esc(r.id)}"><span><b>${esc(r.title)}</b><br><span class="muted">${esc(r.date.split("-").reverse().join("."))}${r.lab?" · "+esc(r.lab):""}</span></span>
          ${r.values.length?`<span class="lv ${f.length?"lv-orange":"lv-green"}"><b aria-hidden="true">${f.length?"◆":"●"}</b>${f.length?f.length+" извън границите":"в границите"}</span>`:`<span class="pill">${r.docs.length} файл</span>`}</button>
        ${open?`${r.values.length?`<div class="chips"><button class="chip" type="button" data-hall="0" aria-pressed="${!healthAll}">Извън границите (${f.length})</button><button class="chip" type="button" data-hall="1" aria-pressed="${healthAll}">Всички (${r.values.length})</button></div>
          ${groups.map(g=>`<p class="eyebrow" style="margin:6px 0 0">${esc(g)}</p>${vals.filter(x=>x.group===g).map(x=>`<div class="hv ${x.flag?"hv-"+x.flag:""}"><span>${esc(x.name)}</span><b class="mono">${esc(x.value)} <small>${esc(x.unit)}</small>${x.flag?` <span class="hflag">${x.flag==="H"?"↑ H":"↓ L"}</span>`:""}</b><small class="muted">${esc(x.ref)}</small></div>`).join("")}`).join("")}
          <p class="note" style="margin:0">${esc(r.note||"Резултатите се тълкуват от лекар.")} Флагове H/L — както ги е отбелязала лабораторията.</p>`:""}
          <p class="eyebrow" style="margin:6px 0 0">Документи</p>${r.docs.map(d=>`<button class="set-row" type="button" data-hd="${esc(d.id)}"><span>${/pdf/.test(d.type)?"📄":/image/.test(d.type)?"🖼️":"📝"}</span><b style="text-align:left">${esc(d.name)}</b><span class="muted">${d.hasHtml?"прочети":"отвори"}</span></button>`).join("")}
          <div class="grid2">${r.values.length?`<button class="btn ghost" type="button" data-hdoc="${esc(r.id)}">Сподели към лекар</button>`:"<span></span>"}<button class="btn ghost" type="button" data-hdel="${esc(r.id)}" style="color:var(--hot)">Изтрий</button></div>`:""}
      </div>`; }).join("")}`;
  const on=(sel,f)=>v.querySelectorAll(sel).forEach(b=>b.onclick=()=>f(b));
  on("[data-hr]",b=>{ healthOpen=healthOpen===b.dataset.hr?null:b.dataset.hr; rHealth(); });
  on("[data-hall]",b=>{ healthAll=b.dataset.hall==="1"; rHealth(); });
  on("[data-hd]",b=>openHealthDoc(b.dataset.hd));
  on("[data-hdoc]",async b=>{ const r=h.records.find(x=>x.id===b.dataset.hdoc); const txt=doctorSummary(r);
    try{ if(navigator.share){ await navigator.share({title:"Изследвания",text:txt}); return; } }catch(e){ if(e&&e.name==="AbortError") return; }
    try{ await navigator.clipboard.writeText(txt); toast("Към лекар","Обобщението е копирано — постави го в съобщение или имейл."); }catch(e){ sheet(`<div class="grab"></div><p class="eyebrow">Към лекар</p><pre style="white-space:pre-wrap;margin:0">${esc(txt)}</pre><button class="btn ghost block" data-close type="button">Затвори</button>`,hh=>hh.querySelectorAll("[data-close]").forEach(x=>x.onclick=closeSheet)); } });
  on("[data-hdel]",b=>{ const r=h.records.find(x=>x.id===b.dataset.hdel); if(!r) return;
    sheet(`<div class="grab"></div><div class="h2">Изтрий „${esc(r.title)}“?</div><p class="muted" style="margin:0">Стойностите и файловете ще бъдат изтрити от телефона.</p><button class="btn hot block" id="hdOk" type="button">Изтрий</button><button class="btn ghost block" data-close type="button">Отказ</button>`,hh=>{
      $("#hdOk").onclick=async()=>{ for(const d of r.docs) await hdbDel(d.id); h.records=h.records.filter(x=>x!==r); save(); closeSheet(); rHealth(); }; }); });
  $("#hFile").onchange=async e=>{ const f=e.target.files[0]; if(!f) return; healthBusy="Запазвам документа…"; rHealth(); try{ const r=await addHealthFile(f); healthOpen=r.id; toast("Досие","Документът е запазен на телефона."); }catch(err){ toast("Досие","Не успях да запазя файла."); } healthBusy=""; rHealth(); };
  $("#hImp").onchange=async e=>{ const f=e.target.files[0]; if(!f) return; healthBusy="Внасям досието…"; rHealth();
    try{ const n=await importDossier(JSON.parse(await f.text())); healthOpen=healthOf(p).records[0]&&healthOf(p).records[0].id; toast("Досие","Внесени: "+n+" записа."); }
    catch(err){ toast("Досие","Файлът не е досие на FIT."); } healthBusy=""; rHealth(); };
}
/* връзка със скенера на храни: показател извън границите → какво да следиш в етикета (без диагнози) */
(function(){ if(typeof foodResultHTML!=="function") return; const base=foodResultHTML; foodResultHTML=function(){ let html=base.apply(this,arguments);
  const ldl=[latestFlag(/LDL/i),latestFlag(/Общ холестерол/i)].find(x=>x&&x.flag==="H"); if(!ldl||ldl.flag!=="H") return html;
  const R=FOOD_CUR.res; const sf=R.nutrition.items.find(x=>x.k==="saturated-fat");
  const note=`<div class="card" style="background:var(--surface-2);gap:4px"><b>От досието ти (${esc(ldl.date.split("-").reverse().join("."))})</b><span class="ex-meta">${esc(ldl.name)} е над границата на лабораторията. Тук следи наситените мазнини: <b>${sf&&sf.v!=null?sf.v+" г/100 г ("+(sf.level==="green"?"ниско":sf.level==="red"?"високо":"средно")+")":"няма данни"}</b>. Конкретната цел определя лекарят.</span></div>`;
  return html.replace('<section class="food-sec" aria-label="Добавки">', note+'<section class="food-sec" aria-label="Добавки">'); }; })();
/* изтриване на всичко → и файловете на досието */
(function(){ const base=deleteSheet; deleteSheet=function(){ base.apply(this,arguments); const go=$("#dlGo"); if(!go) return; const orig=go.onclick; go.onclick=async()=>{ if($("#dlTxt").value.trim().toUpperCase()==="ИЗТРИЙ"){ try{ indexedDB.deleteDatabase(HDB_NAME); }catch(e){} } return orig(); }; }; })();
