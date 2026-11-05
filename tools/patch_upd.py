import sys
X=open("/home/claude/fit-app/tools/extra18.js",encoding="utf8").read()
CORE=open("/home/claude/fit-app/www/fit-core.js",encoding="utf8").read()
CSS='''.nw-dot{display:inline-block;width:9px;height:9px;border-radius:50%;background:#FF7756;margin-left:6px;vertical-align:middle}
.card.upd-banner{gap:8px;border:2px solid var(--accent)!important}
.upd-web{position:fixed;left:12px;right:12px;bottom:calc(84px + env(safe-area-inset-bottom));z-index:60;display:flex;justify-content:space-between;align-items:center;gap:10px;background:#12A150;color:#fff;border-radius:14px;padding:10px 12px;font-weight:800;box-shadow:0 6px 18px rgba(0,0,0,.3)}
.upd-web button{border:0;border-radius:10px;background:#fff;color:#0B5D2E;font:inherit;font-weight:900;padding:8px 14px}
'''
for f,inline in ((sys.argv[1],False),(sys.argv[2],True)):
    s=open(f,encoding="utf8").read()
    if "function updateReminders" in s: print(f,"вече"); continue
    s=s.replace('["x:upd","Версия и обновления"]','["x:upd","Новости и версии"]',1)
    s=s.replace('    else if(k==="x:upd") checkUpdates(true);','    else if(k==="x:upd") newsSheet();',1)
    m='/* ============ СТАРТ ============ */'
    s=s.replace(m,X+"\n"+m,1)
    s=s.replace("</style>",CSS+"</style>",1)
    if inline:
        i=s.index("/* FIT core"); j=s.index("})(typeof window",i); j=s.index("\n",j)
        s=s[:i]+CORE.rstrip()+s[j:]
    open(f,"w",encoding="utf8").write(s); print(f,"ok")
