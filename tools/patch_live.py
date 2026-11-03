import sys,re
X=open("/home/claude/fit-app/tools/extra10.js",encoding="utf8").read()
CORE=open("/home/claude/fit-app/www/fit-core.js",encoding="utf8").read()
CSS='''.live-clock{font-size:34px;font-weight:800;letter-spacing:-.02em}
.live-state{color:#fff;font-weight:900;font-size:13px;letter-spacing:.08em;padding:8px 14px;border-radius:999px}
.live-card{gap:14px}
.live-main{min-height:64px;font-size:18px;border-radius:16px}
.stepper{display:grid;grid-template-columns:64px 1fr 64px;align-items:center;gap:8px}
.stepper span{grid-column:1/-1;font-weight:800;color:var(--muted);font-size:13px;text-transform:uppercase;letter-spacing:.06em}
body.on-live #chatFab{display:none}
.stepper button{height:58px;border-radius:14px;border:1px solid var(--line);background:var(--surface-2);color:var(--ink);font-size:28px;font-weight:800}
.stepper b{font-size:24px;text-align:center}
.rest-ring{display:grid;place-items:center;align-self:center;width:170px;height:170px;border-radius:50%;border:10px solid var(--go);margin:4px auto}
.rest-ring div{font-size:40px;font-weight:800}.rest-ring span{margin-top:-34px;color:var(--muted);font-weight:700}
.set-row{display:grid;grid-template-columns:auto 1fr auto;gap:10px;width:100%;text-align:left;padding:12px 0;border:0;border-top:1px solid var(--line);background:none;color:inherit;font:inherit}
.set-row b{text-align:right}
'''
for f,inline in ((sys.argv[1],False),(sys.argv[2],True)):
    s=open(f,encoding="utf8").read()
    if "function rLive" in s: print(f,"вече"); continue
    s=s.replace('<section class="view" id="v-guide" hidden></section>','<section class="view" id="v-guide" hidden></section>\n  <section class="view" id="v-live" hidden></section>',1)
    s=s.replace('["today","scan","plan","mama","world","guide"].forEach(v=>$("#v-"+v).hidden = v!==tab);','["today","scan","plan","mama","world","guide","live"].forEach(v=>$("#v-"+v).hidden = v!==tab);',1)
    s=s.replace('  TAB=tab;\n','  TAB=tab; document.body.classList.toggle("on-live",tab==="live");\n',1)
    s=s.replace('guide:rGuide})[TAB]();','guide:rGuide, live:rLive})[TAB]();',1)
    s=s.replace('["rToday","rScan","rPlan","rMama","rWorld","rGuide"].forEach','["rToday","rScan","rPlan","rMama","rWorld","rGuide","rLive"].forEach',1)
    old='${p.log[t]?.complete?`<span class="pill good">Завършена днес</span>`:`<button class="btn hot block" id="finishBtn" type="button">Завърших тренировката</button>`}'
    assert old in s, f+" finish"
    s=s.replace(old,'<div id="reschedNote"></div>${p.log[t]?.complete?`<span class="pill good">Завършена днес</span>`:`<div id="liveHost" style="display:flex;flex-direction:column;gap:8px"></div><button class="btn ghost block" id="finishBtn" type="button">Завърших я без запис на серии</button>`}',1)
    old2='<button class="btn ghost" data-go="plan" type="button">Виж седмицата</button></div>`;'
    assert old2 in s, f+" rest"
    s=s.replace(old2,'<button class="btn ghost" data-go="plan" type="button">Виж седмицата</button><div id="restHost"></div></div>`;',1)
    # пренасрочена тренировка в почивен ден
    old3='const p=P(), L=lvl(p), w=weekNo(p), dow=new Date().getDay(), di=dayIndexFor(p,dow);'
    assert old3 in s, f+" di"
    s=s.replace(old3,'const p=P(), L=lvl(p), w=weekNo(p), dow=new Date().getDay(); let di=dayIndexFor(p,dow); { const rs=(typeof reschedToday==="function")&&reschedToday(); if(di<0&&rs) di=dayIndexFor(p,new Date(rs.from+"T12:00:00").getDay()); }',1)
    s=s.replace('} else { render(); dailyPopup(); }','} else { render(); if(!missedCheck()) dailyPopup(); }',1)
    m='/* ============ СТАРТ ============ */'
    s=s.replace(m,X+"\n"+m,1)
    s=s.replace("</style>",CSS+"</style>",1)
    if inline:
        s=s.replace("<script>\nconst NATIVE","<script>\n"+CORE+"\n</script>\n<script>\nconst NATIVE",1) if "<script>\nconst NATIVE" in s else s
    else:
        s=s.replace("<script>\nconst NATIVE",'<script src="fit-core.js"></script>\n<script>\nconst NATIVE',1)
    assert "FITCore" in s and ("fit-core.js" in s or "newSession" in s), f+" core"
    open(f,"w",encoding="utf8").write(s); print(f,"ok")
