import sys
p=sys.argv[1]; s=open(p,encoding='utf8').read()
extra=open('/home/claude/fit-app/tools/extra.js',encoding='utf8').read()
def R(a,b,c=1):
    global s
    assert s.count(a)==c,(p,a[:70],s.count(a)); s=s.replace(a,b)
if 'const NATIVE' not in s:
    R('<script>\n/* ============ ДАННИ ============ */','<script>\nconst NATIVE = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());\n/* ============ ДАННИ ============ */')
R('/* ---------- FIT COACH ---------- */', extra+'\n/* ---------- FIT COACH ---------- */')
R('const segs=[["events","Събития"],["shops","Магазини"],["news","Новини"],["people","Хора"]];',
  'const segs=[["events","Събития"],["weather","Време"],["gyms","Фитнеси"],["subst","Добавки"],["shops","Магазини"],["news","Новини"],["people","Хора"]];')
R('''  } else if(worldSeg==="shops"){''','''  } else if(worldSeg==="weather"){
    body = weatherHTML(); if(!WX&&!WXbusy&&!WXerr) setTimeout(()=>loadWeather(),0);
  } else if(worldSeg==="gyms"){
    body = gymsHTML();
  } else if(worldSeg==="subst"){
    body = substHTML();
  } else if(worldSeg==="shops"){''')
R('''  v.querySelectorAll("[data-cat]").forEach(b=>b.onclick=()=>{ evCat=b.dataset.cat; rWorld(); });''','''  v.querySelectorAll("[data-cat]").forEach(b=>b.onclick=()=>{ evCat=b.dataset.cat; rWorld(); });
  const wc=$("#wxCity"); if(wc) wc.onchange=()=>{ S.city=wc.value; save(); WX=null; WXerr=""; rWorld(); loadWeather(true); };
  const wr=$("#wxRetry"); if(wr) wr.onclick=()=>{ WXerr=""; rWorld(); loadWeather(true); };
  v.querySelectorAll("[data-gnote]").forEach(b=>b.onclick=()=>gymNoteSheet(+b.dataset.gnote));
  v.querySelectorAll("[data-alg]").forEach(b=>b.onclick=()=>{ const p=P(); p.allergies=p.allergies||[]; const k=b.dataset.alg; p.allergies=p.allergies.includes(k)?p.allergies.filter(x=>x!==k):[...p.allergies,k]; save(); rWorld(); });
  v.querySelectorAll("[data-sf]").forEach(b=>b.onclick=()=>{ substF=b.dataset.sf; rWorld(); });''')
# today: weather mini
R('''    ${workout}
    <div class="grid2 stack">''','''    ${NATIVE||WX?weatherMini():""}
    ${workout}
    <div class="grid2 stack">''')
R('''  wireCoach();
  $("#v-today")''','''  wireCoach();
  if(NATIVE) loadWeather();
  const wm=$("#wxMini"); if(wm) wm.addEventListener("click",()=>{ worldSeg="weather"; });
  $("#v-today")''')
# supplements card: allergy note + link
R('''  </div><p class="note">Общи насоки, не лечение.''','''  </div>${(p.allergies||[]).length?`<p class="note" style="color:var(--hot);font-weight:800;margin:0">Твоите алергии: ${esc(p.allergies.map(a=>ALLERGENS[a]).join(", "))} — избери продукти без тях (Свят → Добавки).</p>`:""}<p class="note">Общи насоки, не лечение.''')
open(p,'w',encoding='utf8').write(s)
