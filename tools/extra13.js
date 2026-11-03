/* ============ СКЕНЕР НА ХРАНИ (food-core.js) ============ */
const FF = window.FITFood;
Object.assign(ALLERGENS, {celery:"Целина", mustard:"Синап / горчица", sesame:"Сусам", sulph:"Сулфити", lupin:"Лупина", mollusc:"Мекотели"});
let FOOD_CUR=null, FOOD_BUSY="", FOOD_ERR="", zxStop=null;
const LVC={green:"var(--go)",yellow:"#C99A06",orange:"#E0661B",red:"#D7263D",gray:"var(--muted)"};
function lvTag(l,txt){ const L=FF.LV[l]||FF.LV.gray; return `<span class="lv lv-${l}"><b aria-hidden="true">${L.i}</b>${esc(txt||L.n)}</span>`; }
function foodsOf(p){ p.foods=p.foods||[]; return p.foods; }
let ZXP=null;
function loadZX(){
  if(window.ZXing) return Promise.resolve(window.ZXing); if(ZXP) return ZXP;
  ZXP=new Promise((res,rej)=>{ const go=(src,next)=>{ const s=document.createElement("script"); s.src=src; s.onload=()=>window.ZXing?res(window.ZXing):(next?next():rej(new Error("zx"))); s.onerror=()=>next?next():rej(new Error("zx")); document.head.appendChild(s); };
    go("vendor/zxing/index.min.js",()=>go("https://cdn.jsdelivr.net/npm/@zxing/library@0.21.3/umd/index.min.js")); });
  ZXP.catch(()=>{ ZXP=null; }); return ZXP;
}
function hasBD(){ return "BarcodeDetector" in window; }
async function decodeImageFile(file){
  if(hasBD()){ try{ const bd=new BarcodeDetector({formats:["ean_13","ean_8","upc_a","upc_e"]}); const bmp=await createImageBitmap(file); const r=await bd.detect(bmp); if(r&&r[0]) return r[0].rawValue; }catch(e){} }
  const ZX=await loadZX(); const url=URL.createObjectURL(file);
  try{ const rd=new ZX.BrowserMultiFormatReader(); const r=await rd.decodeFromImageUrl(url); return r.getText(); } finally { URL.revokeObjectURL(url); }
}
function stopScan(){ try{ zxStop&&zxStop(); }catch(e){} zxStop=null; }
function scanBarcodeSheet(){
  sheet(`<div class="grab"></div><p class="eyebrow">Скенер на баркод</p><div class="h2">Насочи камерата към баркода</div>
    <div class="bc-cam"><video id="bcVid" playsinline muted autoplay></video><i class="bc-line"></i></div>
    <p class="muted" id="bcMsg" style="margin:0">Стартирам камерата…</p>
    <label class="btn ghost block" style="cursor:pointer">Снимай или избери снимка<input type="file" accept="image/*" capture="environment" id="bcFile" hidden></label>
    <button class="btn ghost block" data-close type="button">Затвори</button>`, async h=>{
      h.querySelectorAll("[data-close]").forEach(b=>b.onclick=()=>{ stopScan(); closeSheet(); });
      $("#scrim").onclick=e=>{ if(e.target.id==="scrim"){ stopScan(); closeSheet(); } };
      $("#bcFile").onchange=async e=>{ const f=e.target.files[0]; if(!f) return; stopScan(); $("#bcMsg").textContent="Разчитам снимката…"; try{ const c=await decodeImageFile(f); closeSheet(); gotBarcode(c); }catch(err){ $("#bcMsg").textContent="Не открих баркод на снимката. Опитай по-отблизо и на светло."; } };
      const v=$("#bcVid"), msg=$("#bcMsg");
      try{
        if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia) throw new Error("nocam");
        if(hasBD()){
          const st=await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment"},audio:false}); v.srcObject=st; await v.play();
          const bd=new BarcodeDetector({formats:["ean_13","ean_8","upc_a","upc_e"]}); let on=true;
          zxStop=()=>{ on=false; st.getTracks().forEach(t=>t.stop()); };
          msg.textContent="Търся баркод…";
          const loop=async()=>{ if(!on) return; try{ const r=await bd.detect(v); if(r&&r[0]&&FF.validBarcode(r[0].rawValue)){ const c=r[0].rawValue; stopScan(); closeSheet(); return gotBarcode(c); } }catch(e){} setTimeout(loop,250); }; loop();
        } else {
          const ZX=await loadZX(); const rd=new ZX.BrowserMultiFormatReader();
          zxStop=()=>{ try{ rd.reset(); }catch(e){} };
          msg.textContent="Търся баркод…";
          rd.decodeFromConstraints({video:{facingMode:"environment"}}, v, (res)=>{ if(res && FF.validBarcode(res.getText())){ const c=res.getText(); stopScan(); closeSheet(); gotBarcode(c); } });
        }
      }catch(e){ msg.textContent="Камерата не е достъпна тук. Снимай баркода или въведи цифрите ръчно."; }
    });
}
async function gotBarcode(code){
  code=String(code||"").replace(/\D/g,"");
  if(!FF.validBarcode(code)){ FOOD_ERR="Баркодът „"+code+"“ не е валиден. Провери цифрите."; show("food"); return; }
  buzz(40); FOOD_BUSY="Търся продукта "+code+"…"; FOOD_ERR=""; FOOD_CUR=null; show("food");
  try{
    const ctl=new AbortController(); const tm=setTimeout(()=>ctl.abort(),15000);
    const r=await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json?lc=bg&fields=code,product_name,product_name_bg,brands,quantity,image_front_small_url,allergens_tags,traces_tags,ingredients_text,ingredients_text_bg,nutriments,nutriscore_grade,nova_group,additives_tags,serving_quantity,categories_tags,last_modified_t`,{signal:ctl.signal}); clearTimeout(tm);
    const j=await r.json();
    if(!j||j.status!==1||!j.product){ FOOD_BUSY=""; FOOD_ERR="NOTFOUND:"+code; rFood(); return; }
    const pr=j.product; if(pr.ingredients_text_bg) pr.ingredients_text=pr.ingredients_text_bg; pr.code=pr.code||code; pr._source="Open Food Facts (данни от общността)";
    openFood(pr);
  }catch(e){ FOOD_BUSY=""; FOOD_ERR="Няма връзка с базата Open Food Facts. Опитай пак или снимай етикета."; rFood(); }
}
function openFood(pr){ FOOD_BUSY=""; FOOD_ERR=""; FOOD_CUR={prod:pr, res:FF.analyze(pr,{allergies:P().allergies||[]}), confirmed:false}; show("food"); }
async function labelPhoto(file){
  if(!aiReady()){ aiSheet(); return; }
  FOOD_BUSY="Разчитам етикета с AI…"; FOOD_ERR=""; FOOD_CUR=null; show("food");
  const prompt=`Това е снимка на етикет на храна. Препиши точно какво пише, без да измисляш. Отговори САМО с JSON:
{"product_name":"","ingredients_text":"съставът дословно, включително „може да съдържа…“","allergens":["ключове от: gluten,shell,egg,fish,peanut,soy,milk,nuts,celery,mustard,sesame,sulph,lupin,mollusc — само изрично посочени като съставки"],"traces":["същите ключове, само от „може да съдържа/следи“"],"per100":{"energy-kcal":null,"fat":null,"saturated-fat":null,"sugars":null,"salt":null,"proteins":null,"fiber":null},"additives":["E330"],"readable":true}
Ако нещо не се чете, остави null или празно. Не гадай.`;
  try{
    const r=await aiScan(file,prompt);
    const keyOff=k=>FF.EU14[k]?FF.EU14[k].off:null;
    const nut={}; Object.entries(r.per100||{}).forEach(([k,v])=>{ if(v!=null&&v!=="") nut[k+"_100g"]=v; });
    const pr={product_name:r.product_name||"Продукт от етикет", ingredients_text:r.ingredients_text||"", allergens_tags:(r.allergens||[]).map(keyOff).filter(Boolean), traces_tags:(r.traces||[]).map(keyOff).filter(Boolean),
      nutriments:nut, additives_tags:(r.additives||[]).map(c=>"en:"+String(c).toLowerCase()), _source:"Разчетено от снимка на етикета с AI — сравни с етикета"};
    openFood(pr);
  }catch(e){ FOOD_BUSY=""; FOOD_ERR=e&&e.code==="not_granted"?"AI разпознаването е изключено в „Поверителност и данни“.":"Не успях да разчета етикета. Снимай отблизо, равно и на светло."; rFood(); }
}
function manualIngredients(){
  sheet(`<div class="grab"></div><p class="eyebrow">Ръчно</p><div class="h2">Препиши състава от етикета</div>
    <label>Име<input class="in" id="miN" placeholder="напр. Протеиново барче"></label>
    <label>Състав<textarea class="in" id="miT" rows="5" placeholder="Съставки: … Може да съдържа следи от …"></textarea></label>
    <button class="btn block" id="miOk" type="button">Провери</button><button class="btn ghost block" data-close type="button">Затвори</button>`, h=>{
      $("#miOk").onclick=()=>{ const t=$("#miT").value.trim(), nm=$("#miN").value.trim(); if(!t) return toast("Състав","Препиши поне съставките."); closeSheet();
        openFood({product_name:nm||"Продукт", ingredients_text:t, allergens_tags:[], traces_tags:[], nutriments:{}, _source:"Въведено от теб"}); };
    });
}
function foodResultHTML(){
  const R=FOOD_CUR.res, A=R.allergy, p=P(); const names=ks=>ks.map(k=>FF.EU14[k].n).join(", ");
  const head = A.level==="red"?`СЪДЪРЖА: ${esc(names(A.contains))}`:A.level==="orange"?`Може да съдържа следи от: ${esc(names(A.traces))}`:
    A.level==="green"?`Не открихме твоите алергени (${esc(names(A.checked))})`:A.noData?"Няма данни за състава — провери етикета":"Не си посочил алергии";
  const sub = A.level==="red"?"Не е подходящ за теб, независимо от хранителната оценка.":A.level==="orange"?"Кръстосано замърсяване — решението е твое, при тежка алергия избягвай.":A.level==="green"?"Според данните. Съставът може да се промени — провери етикета.":"";
  return `<div class="card food-card">
    <div class="row" style="flex-wrap:nowrap;align-items:flex-start;gap:12px">${R.image?`<img src="${esc(R.image)}" alt="" width="64" height="64" style="border-radius:12px;object-fit:contain;background:#fff;flex:0 0 auto">`:""}
      <div style="min-width:0"><div class="h2" style="margin:0">${esc(R.name)}</div><div class="muted">${esc([R.brand,R.quantity].filter(Boolean).join(" · "))}</div></div></div>
    <section class="food-sec al-${A.level}" aria-label="Алергени за теб"><p class="eyebrow">1 · Алергени за теб</p>
      <div class="al-banner">${lvTag(A.level,"")}<b>${head}</b></div>${sub?`<p style="margin:0">${sub}</p>`:""}
      ${A.all.length?`<p class="ex-meta" style="margin:0">Всички алергени от ЕС-14 в състава: ${esc(names(A.all))}${A.allTraces.length?" · следи: "+esc(names(A.allTraces)):""}</p>`:""}
      ${!(p.allergies||[]).length?`<button class="btn ghost sm" id="fdAlg" type="button">Посочи моите алергии</button>`:""}</section>
    <section class="food-sec" aria-label="Хранителна стойност"><p class="eyebrow">2 · Хранителна стойност · на 100 г${R.nutrition.kcal!=null?" · "+R.nutrition.kcal+" kcal":""}</p>
      <div class="row" style="gap:8px">${lvTag(R.nutrition.overall,"Обща: "+FF.LV[R.nutrition.overall].n)}${R.nutriScore?`<span class="ns ns-${R.nutriScore}">Nutri-Score ${R.nutriScore}</span>`:""}</div>
      <div class="nut-grid">${R.nutrition.items.map(x=>`<div class="nut nut-${x.level}"><span>${esc(x.n)}</span><b class="mono">${x.v==null?"—":x.v+" "+x.u}</b><small>${x.positive?(x.level==="green"?"Високо":x.level==="yellow"?"Източник":"—"):FF.LV[x.level].i+" "+(x.level==="green"?"Ниско":x.level==="yellow"?"Средно":x.level==="red"?"Високо":"Няма данни")}</small></div>`).join("")}</div>
      ${R.serving?`<p class="ex-meta" style="margin:0">На порция ${R.serving.grams} г: ${[R.serving.kcal!=null?R.serving.kcal+" kcal":"",R.serving.proteins!=null?R.serving.proteins+" г протеин":"",R.serving.sugars!=null?R.serving.sugars+" г захари":"",R.serving.salt!=null?R.serving.salt+" г сол":""].filter(Boolean).join(" · ")}</p>`:""}</section>
    <section class="food-sec" aria-label="Добавки"><p class="eyebrow">3 · Добавки (Е-кодове) · ${R.additives.length}</p>
      ${R.additives.length?R.additives.map(a=>`<div class="add-row">${lvTag(a.level,a.code)}<div><b>${esc(a.name||a.code)}</b><div class="ex-meta">${esc(a.note)}</div></div></div>`).join(""):`<p class="muted" style="margin:0">Не са открити Е-кодове в данните.</p>`}
      <p class="note" style="margin:0">Не всички Е-кодове са вредни — много са витамини или естествени вещества. Всички разрешени в ЕС добавки са оценени от EFSA; тук е обобщение за контекст.</p></section>
    <section class="food-sec" aria-label="Преработка"><p class="eyebrow">4 · Степен на преработка (NOVA)</p>${lvTag(R.processing.level,R.processing.group?"NOVA "+R.processing.group+" · "+R.processing.n:R.processing.n)}</section>
    ${R.ingredients?`<details><summary class="muted" style="cursor:pointer">Състав</summary><p class="ex-meta">${esc(R.ingredients)}</p></details>`:""}
    <p class="note" style="margin:0">Източник: ${esc(R.provenance)}${R.updated?" · обновено "+esc(R.updated):""}${R.code?" · баркод "+esc(R.code):""}. FIT не поставя диагнози.</p>
    ${FOOD_CUR.confirmed?`<span class="pill good">Потвърдено и запазено</span>`:`<div class="grid2"><button class="btn" id="fdOk" type="button">Съвпада с етикета · запази</button><button class="btn ghost" id="fdNo" type="button">Не съвпада</button></div>`}
  </div>`;
}
function rFood(){
  const p=P(); const v=$("#v-food"); const mine=p.allergies||[]; const hist=foodsOf(p);
  const nf=FOOD_ERR.startsWith("NOTFOUND:")?FOOD_ERR.slice(9):"";
  v.innerHTML=`<p class="eyebrow">Храна · алергени · Е-кодове</p><h1 class="h-display" style="margin:0">Скенер на храни</h1>
    <div class="grid2"><button class="btn hot" id="fdScan" type="button">📷 Сканирай баркод</button><label class="btn ghost" style="cursor:pointer">🏷️ Снимай етикета<input type="file" accept="image/*" capture="environment" id="fdLabel" hidden></label></div>
    <div class="row" style="gap:8px;flex-wrap:nowrap"><input class="in mono" id="fdCode" inputmode="numeric" placeholder="или въведи баркода" style="flex:1 1 auto"><button class="btn ghost" id="fdGo" type="button">Провери</button></div>
    <button class="btn ghost sm" id="fdManual" type="button" style="align-self:flex-start">Препиши състава ръчно</button>
    ${FOOD_BUSY?`<div class="card"><div class="thinking"><span class="spin"></span>${esc(FOOD_BUSY)}</div></div>`:""}
    ${nf?`<div class="card"><b>Продуктът ${esc(nf)} не е в Open Food Facts.</b><p class="muted" style="margin:0">Снимай етикета (AI ще разчете състава) или го препиши ръчно.</p></div>`:FOOD_ERR?`<div class="card" style="border-color:var(--hot)">${esc(FOOD_ERR)}</div>`:""}
    ${FOOD_CUR?foodResultHTML():""}
    <div class="card"><p class="eyebrow">Моите алергии и непоносимости · ЕС-14</p>
      <div class="chips">${Object.keys(FF.EU14).map(k=>`<button class="chip" type="button" data-fa="${k}" aria-pressed="${mine.includes(k)}">${esc(ALLERGENS[k]||FF.EU14[k].n)}</button>`).join("")}</div>
      <p class="note" style="margin:0">Пазят се само на телефона. Използват се за предупрежденията при храни и добавки.</p></div>
    ${hist.length?`<div class="card"><p class="eyebrow">Последно проверени</p>${hist.slice(0,20).map((x,i)=>`<button class="set-row" type="button" data-fh="${i}"><span>${lvTag(x.level,"")}</span><b style="text-align:left">${esc(x.name)}</b><span class="muted">${esc(x.at.slice(5,10).split("-").reverse().join("."))}</span></button>`).join("")}</div>`:""}`;
  const on=(id,f)=>{ const el=$(id); if(el) el.onclick=f; };
  on("#fdScan",scanBarcodeSheet);
  on("#fdGo",()=>gotBarcode($("#fdCode").value));
  $("#fdCode").onkeydown=e=>{ if(e.key==="Enter") gotBarcode(e.target.value); };
  $("#fdLabel").onchange=e=>{ const f=e.target.files[0]; if(f) labelPhoto(f); };
  on("#fdManual",manualIngredients);
  on("#fdAlg",()=>$("[data-fa]").scrollIntoView({behavior:"smooth",block:"center"}));
  v.querySelectorAll("[data-fa]").forEach(b=>b.onclick=()=>{ const k=b.dataset.fa; p.allergies=(p.allergies||[]).includes(k)?p.allergies.filter(x=>x!==k):[...(p.allergies||[]),k]; save();
    if(FOOD_CUR) FOOD_CUR.res=FF.analyze(FOOD_CUR.prod,{allergies:p.allergies}); rFood(); });
  on("#fdOk",()=>{ const R=FOOD_CUR.res; hist.unshift({code:R.code,name:R.name,level:R.allergy.level==="red"||R.allergy.level==="orange"?R.allergy.level:R.nutrition.overall,at:new Date().toISOString(),source:R.provenance,confirmed:true,prod:FOOD_CUR.prod});
    p.foods=hist.slice(0,30); FOOD_CUR.confirmed=true; save(); rFood(); });
  on("#fdNo",()=>{ FOOD_CUR=null; FOOD_ERR="Благодаря! Снимай етикета или препиши състава — така ще е точно."; rFood(); });
  v.querySelectorAll("[data-fh]").forEach(b=>b.onclick=()=>{ const x=hist[+b.dataset.fh]; if(x&&x.prod){ openFood(x.prod); FOOD_CUR.confirmed=true; rFood(); window.scrollTo(0,0); } });
}
(function(){ const base=rMama; rMama=function(){ base.apply(this,arguments); const v=$("#v-mama"); if(!v) return;
  v.insertAdjacentHTML("afterbegin",`<button class="card food-cta" type="button" data-go="food"><span class="guide-ic" aria-hidden="true" style="background:#E0661B">🔎</span><span style="min-width:0;text-align:left"><b style="display:block;font-size:16px">Скенер на храни</b><span class="ex-meta">Баркод или етикет → алергени за теб, хранителна стойност, Е-кодове</span></span></button>`); }; })();
