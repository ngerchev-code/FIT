import sys
X=open("/home/claude/fit-app/tools/extra13.js",encoding="utf8").read()
CORE=open("/home/claude/fit-app/www/food-core.js",encoding="utf8").read()
CSS='''.lv{display:inline-flex;align-items:center;gap:6px;font-weight:800;font-size:13px;padding:4px 10px;border-radius:999px;color:#fff;max-width:100%;line-height:1.25}
.lv b{font-size:12px}.lv-green{background:#12A150}.lv-yellow{background:#B98B00}.lv-orange{background:#E0661B}.lv-red{background:#D7263D}.lv-gray{background:#6B7380}
.food-card{gap:14px}.food-sec{display:flex;flex-direction:column;gap:8px;padding-top:12px;border-top:1px solid var(--line)}
.al-banner{display:flex;gap:10px;align-items:center;flex-wrap:wrap;font-size:17px}
.food-sec.al-red{background:color-mix(in srgb,#D7263D 12%,transparent);border:2px solid #D7263D;border-radius:14px;padding:12px}
.food-sec.al-orange{background:color-mix(in srgb,#E0661B 12%,transparent);border:2px solid #E0661B;border-radius:14px;padding:12px}
.nut-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
.nut{display:flex;flex-direction:column;gap:2px;padding:8px;border-radius:12px;background:var(--surface-2);border-left:5px solid #6B7380}
.nut span{font-size:12px;color:var(--muted);font-weight:700}.nut small{font-size:11px;font-weight:700}
.nut-green{border-left-color:#12A150}.nut-yellow{border-left-color:#B98B00}.nut-red{border-left-color:#D7263D}
.ns{font-weight:900;padding:4px 10px;border-radius:8px;color:#fff;font-size:13px}.ns-A{background:#038141}.ns-B{background:#85BB2F}.ns-C{background:#E5B800}.ns-D{background:#EE8100}.ns-E{background:#E63E11}
.add-row{display:grid;grid-template-columns:auto 1fr;gap:10px;align-items:start}
.bc-cam{position:relative;border-radius:16px;overflow:hidden;background:#000;aspect-ratio:4/3}
.bc-cam video{width:100%;height:100%;object-fit:cover}.bc-line{position:absolute;left:10%;right:10%;top:50%;height:3px;background:#FF3B30;box-shadow:0 0 12px #FF3B30}
.card.food-cta{flex-direction:row;align-items:center;gap:14px;cursor:pointer;text-align:left}
'''
for f,inline in ((sys.argv[1],False),(sys.argv[2],True)):
    s=open(f,encoding="utf8").read()
    if "function rFood" in s: print(f,"вече"); continue
    s=s.replace('  <section class="view" id="v-live" hidden></section>','  <section class="view" id="v-live" hidden></section>\n  <section class="view" id="v-food" hidden></section>',1)
    s=s.replace('["today","scan","plan","mama","world","guide","live"].forEach(v=>$("#v-"+v).hidden = v!==tab);','["today","scan","plan","mama","world","guide","live","food"].forEach(v=>$("#v-"+v).hidden = v!==tab); if(tab!=="food"&&typeof stopScan==="function") stopScan();',1)
    s=s.replace('guide:rGuide, live:rLive})[TAB]();','guide:rGuide, live:rLive, food:rFood})[TAB]();',1)
    s=s.replace('["rToday","rScan","rPlan","rMama","rWorld","rGuide","rLive"].forEach','["rToday","rScan","rPlan","rMama","rWorld","rGuide","rLive","rFood"].forEach',1)
    a='["Фитнес конзола",[["today","Днес"],["plan","Програма"],["scan","Скенер на уреди"]]],'
    assert a in s, f+" drawer"
    s=s.replace(a,'["Фитнес конзола",[["today","Днес"],["plan","Програма"],["scan","Скенер на уреди"],["food","Скенер на храни"],["live","Тренировка на живо"]]],',1)
    m='/* ============ СТАРТ ============ */'
    s=s.replace(m,X+"\n"+m,1)
    s=s.replace("</style>",CSS+"</style>",1)
    if inline:
        i=s.index("/* FIT core"); s=s[:i]+CORE.rstrip()+"\n"+s[i:]
    else:
        s=s.replace('<script src="fit-core.js"></script>','<script src="fit-core.js"></script>\n<script src="food-core.js"></script>',1)
    assert "FITFood" in s or "food-core.js" in s
    open(f,"w",encoding="utf8").write(s); print(f,"ok")
