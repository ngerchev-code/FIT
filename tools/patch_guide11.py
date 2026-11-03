import sys
X=open("/home/claude/fit-app/tools/extra11.js",encoding="utf8").read()
CSS='''.gd-head{display:flex;flex-direction:column;gap:2px}.gd-city{font-family:var(--f-display,inherit);font-weight:800;font-size:20px}
.gd-cat{border-left:4px solid var(--c)!important}
.gd-badge{width:38px;height:38px;border-radius:12px;display:grid;place-items:center;font-size:19px;box-shadow:0 2px 6px rgba(0,0,0,.18)}
.gd-item{grid-template-columns:auto minmax(0,1fr) auto;align-items:center}
.gpin{width:34px;height:34px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:var(--c);border:3px solid #fff;box-shadow:0 3px 8px rgba(0,0,0,.35);display:grid;place-items:center}
.gpin span{transform:rotate(45deg);font-size:16px;line-height:1}
.gme{width:22px;height:22px;border-radius:50%;background:#2340E8;border:3px solid #fff;box-shadow:0 0 0 0 rgba(35,64,232,.5);animation:gme 1.8s infinite}
@keyframes gme{0%{box-shadow:0 0 0 0 rgba(35,64,232,.55)}70%{box-shadow:0 0 0 18px rgba(35,64,232,0)}100%{box-shadow:0 0 0 0 rgba(35,64,232,0)}}
.gwrap .gsat{top:auto;bottom:28px;right:10px}
'''
for f in sys.argv[1:]:
    s=open(f,encoding="utf8").read()
    if "guideCatOf" in s: print(f,"вече"); continue
    a=s.index("/* ============ GUIDE — КАРТА"); b=s.index("/* ============ ТРЕНИРОВКА НА ЖИВО")
    s=s[:a]+X+"\n"+s[b:]
    s=s.replace("</style>",CSS+"</style>",1)
    open(f,"w",encoding="utf8").write(s); print(f,"ok")
