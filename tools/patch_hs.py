import sys
X=open("/home/claude/fit-app/tools/extra17.js",encoding="utf8").read()
CORE=open("/home/claude/fit-app/www/fit-core.js",encoding="utf8").read()
CSS='''.hs-hero{background:#0B5D2E;border-radius:20px;padding:18px;display:flex;flex-direction:column;gap:8px;box-shadow:0 6px 18px rgba(11,93,46,.35)}
.hs-seg{display:grid;grid-template-columns:1fr 1fr;gap:6px;background:rgba(0,0,0,.22);padding:4px;border-radius:14px;margin-top:6px}
.hs-seg button{border:0;border-radius:11px;min-height:44px;font:inherit;font-weight:800;color:#DDF7E6;background:transparent}
.hs-seg button[aria-pressed="true"]{background:#fff;color:#0B5D2E}
.hs-chip[aria-pressed="true"]{background:#0B5D2E!important;border-color:#0B5D2E!important;color:#fff!important}
.hs-go{background:#0B5D2E!important;color:#fff!important;border-color:#0B5D2E!important;min-height:56px;font-size:17px}
.hs-num{border-color:#0B5D2E!important;color:#3BBF72!important;font-size:12px}
.card.hs-cta{flex-direction:row;align-items:center;gap:14px;cursor:pointer;background:#0B5D2E!important;color:#fff!important;border-color:#0B5D2E!important;text-align:left}
.card.hs-cta .ex-meta{color:rgba(255,255,255,.85)!important}
.hs-ic{width:52px;height:52px;border-radius:16px;display:grid;place-items:center;background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.35);color:#fff;flex:0 0 auto}
.drawer-i[data-dr="hs"]{background:#0B5D2E;color:#fff;border-radius:12px;font-weight:800}
'''
for f,inline in ((sys.argv[1],False),(sys.argv[2],True)):
    s=open(f,encoding="utf8").read()
    if "function rHS" in s: print(f,"вече"); continue
    s=s.replace('  <section class="view" id="v-health" hidden></section>','  <section class="view" id="v-health" hidden></section>\n  <section class="view" id="v-hs" hidden></section>',1)
    a='"live","food","health"].forEach(v=>'
    assert a in s, f; s=s.replace(a,'"live","food","health","hs"].forEach(v=>',1)
    s=s.replace('food:rFood, health:rHealth})[TAB]();','food:rFood, health:rHealth, hs:rHS})[TAB]();',1)
    s=s.replace('"rFood","rHealth"].forEach','"rFood","rHealth","rHS"].forEach',1)
    d='  ["GUIDE",[["guide","Карта наоколо — GUIDE"]]],'
    assert d in s, f; s=s.replace(d,d+'\n  ["Home & Street",[["hs","Home & Street Fitness"]]],',1)
    m='/* ============ СТАРТ ============ */'
    s=s.replace(m,X+"\n"+m,1)
    s=s.replace("</style>",CSS+"</style>",1)
    if inline:
        i=s.index("/* FIT core"); j=s.index("})(typeof window",i); j=s.index("\n",j)
        s=s[:i]+CORE.rstrip()+s[j:]
    open(f,"w",encoding="utf8").write(s); print(f,"ok")
