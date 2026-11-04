import sys
X=open("/home/claude/fit-app/tools/extra16.js",encoding="utf8").read()
CSS='''.health-head{display:flex;justify-content:space-between;align-items:center;gap:10px;width:100%;text-align:left;background:none;border:0;color:inherit;font:inherit;padding:0}
.hv{display:grid;grid-template-columns:minmax(0,1fr) auto;column-gap:10px;padding:8px 0;border-top:1px solid var(--line)}
.hv small.muted{grid-column:2;text-align:right;font-size:11px}
.hv b{text-align:right}.hv-H b,.hv-L b{color:#E0661B}.hflag{font-size:11px;font-weight:900;padding:1px 6px;border-radius:6px;background:#E0661B;color:#fff}
.health-doc{font-size:14px;line-height:1.5;overflow-x:auto}.health-doc table{border-collapse:collapse;width:100%;font-size:12px}.health-doc td,.health-doc th{border:1px solid var(--line);padding:4px 6px;vertical-align:top}
'''
for f in sys.argv[1:]:
    s=open(f,encoding="utf8").read()
    if "function rHealth" in s: print(f,"вече"); continue
    s=s.replace('  <section class="view" id="v-food" hidden></section>','  <section class="view" id="v-food" hidden></section>\n  <section class="view" id="v-health" hidden></section>',1)
    a='["today","scan","plan","mama","world","guide","live","food"].forEach'
    assert a in s, f; s=s.replace(a,'["today","scan","plan","mama","world","guide","live","food","health"].forEach',1)
    s=s.replace('live:rLive, food:rFood})[TAB]();','live:rLive, food:rFood, health:rHealth})[TAB]();',1)
    s=s.replace('"rLive","rFood"].forEach','"rLive","rFood","rHealth"].forEach',1)
    d='["food","Скенер на храни"],'
    assert d in s, f; s=s.replace(d,d+'["health","Здравно досие"],',1)
    s=s.replace(["self-report","AI"][0],"self-report") 
    m='/* ============ СТАРТ ============ */'
    s=s.replace(m,X+"\n"+m,1)
    s=s.replace("</style>",CSS+"</style>",1)
    s=s.replace('["health","Самооценка за възстановяване","Енергия, сън, болка преди тренировка. Само на телефона."]','["health","Самооценка и здравно досие","Енергия, сън, болка преди тренировка и документи от изследвания. Само на телефона."]',1)
    open(f,"w",encoding="utf8").write(s); print(f,"ok")
