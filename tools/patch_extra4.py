import sys
p=sys.argv[1]; s=open(p,encoding='utf8').read()
extra=open('/home/claude/fit-app/tools/extra4.js',encoding='utf8').read()
def R(a,b,c=1):
    global s
    assert s.count(a)==c,(p,a[:80],s.count(a)); s=s.replace(a,b)
R('/* ---------- FIT COACH ---------- */', extra+'\n/* ---------- FIT COACH ---------- */')
R('.who{margin-left:auto;','.macros-lite{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin-bottom:6px}\n.macros-lite div{background:var(--surface-2);border:1px solid var(--line);border-radius:10px;padding:8px;text-align:center}\n.macros-lite b{display:block;font-size:16px}.macros-lite span{font-size:10px;font-weight:800;color:var(--muted);text-transform:uppercase}\n.who{margin-left:auto;')
R('const segs=[["events","Събития"],','const segs=[["places","Мои обекти"],["events","Събития"],')
R('''  } else if(worldSeg==="pilates"){''','''  } else if(worldSeg==="places"){
    body = placesHTML();
  } else if(worldSeg==="pilates"){''')
R('''  if(worldSeg==="pilates") wirePilates(v);''','''  if(worldSeg==="pilates") wirePilates(v);
  if(worldSeg==="places") wirePlaces(v);''')
R('["Лайфстайл",[["w:weather","Време и прогноза"],','["Лайфстайл",[["w:places","Мои обекти"],["w:weather","Време и прогноза"],')
R('<a class="btn sm" href="${MAPS(g.q)}" target="_blank" rel="noopener">Карта, часове и паркинг</a>','<button class="btn sm" type="button" data-nav="${esc(g.n)}|${esc(g.q)}">Как да стигна</button><a class="btn ghost sm" href="${MAPS(g.q)}" target="_blank" rel="noopener">Часове и паркинг</a>')
R('<a class="btn sm" href="${MAPS(s.q)}" target="_blank" rel="noopener">Карта, телефон и часове</a>','<button class="btn sm" type="button" data-nav="${esc(s.n)}|${esc(s.q)}">Как да стигна</button><a class="btn ghost sm" href="${MAPS(s.q)}" target="_blank" rel="noopener">Телефон и часове</a>')
R('''${SHOPS.map(([h,ls])=>`<div class="card"><p class="eyebrow">${h}</p><div class="links">${ls.map(l=>`<a class="lk" href="${l[2]}" target="_blank" rel="noopener">${esc(l[0])}<small>${esc(l[1])}</small></a>`).join("")}</div></div>`).join("")}''',
'''${SHOPS.map(([h,ls])=>`<div class="card"><p class="eyebrow">${h}</p><div class="links">${ls.map(l=>l[2].includes("google.com/maps")?`<button class="lk" type="button" style="text-align:left" data-nav="${esc(l[0])}|${esc(decodeURIComponent(l[2].split("query=")[1]||l[0]))}">${esc(l[0])}<small>${esc(l[1])} · как да стигна</small></button>`:`<a class="lk" href="${l[2]}" target="_blank" rel="noopener">${esc(l[0])}<small>${esc(l[1])}</small></a>`).join("")}</div></div>`).join("")}''')
R('document.addEventListener("click",e=>{ const g=e.target.closest("[data-go]"); if(g) show(g.dataset.go); });','document.addEventListener("click",e=>{ const g=e.target.closest("[data-go]"); if(g) show(g.dataset.go); const nv=e.target.closest("[data-nav]"); if(nv){ const [n,q]=nv.dataset.nav.split("|"); navSheet(n,q); } });')
open(p,'w',encoding='utf8').write(s)
