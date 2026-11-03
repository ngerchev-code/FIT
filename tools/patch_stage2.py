import sys
X=open("/home/claude/fit-app/tools/extra12.js",encoding="utf8").read()
CORE=open("/home/claude/fit-app/www/fit-core.js",encoding="utf8").read()
CSS='''.cs-row{display:grid;grid-template-columns:auto 1fr;gap:12px;align-items:center;text-align:left;width:100%;padding:12px;border:1px solid var(--line);border-radius:14px;background:var(--surface-2);color:inherit;font:inherit}
.cs-sw{width:44px;height:26px;border-radius:99px;background:var(--line);position:relative;transition:.2s}
.cs-sw::after{content:"";position:absolute;top:3px;left:3px;width:20px;height:20px;border-radius:50%;background:#fff;transition:.2s}
.cs-row[aria-pressed="true"] .cs-sw{background:var(--go)}.cs-row[aria-pressed="true"] .cs-sw::after{left:21px}
.ens{display:block;flex:0 0 68px;height:68px;width:68px}
.kaizen{font-size:22px;color:var(--go);font-weight:800;opacity:.85}
.path-tl{display:grid;gap:6px}
.path-tl div{display:grid;grid-template-columns:62px 1fr;column-gap:10px;padding:8px 10px;border-radius:12px;border:1px solid var(--line)}
.path-tl div small{grid-column:2;color:var(--muted)}
.path-tl div.on{border-color:var(--go);background:color-mix(in srgb,var(--go) 12%,transparent)}
.path-tl div.done{opacity:.6}
'''
for f,inline in ((sys.argv[1],False),(sys.argv[2],True)):
    s=open(f,encoding="utf8").read()
    if "function pathCard" in s: print(f,"вече"); continue
    m='/* ============ СТАРТ ============ */'
    s=s.replace(m,X+"\n"+m,1)
    s=s.replace("</style>",CSS+"</style>",1)
    a='setTimeout(()=>{ S.people=[]; onboarding(false); },300);'
    assert a in s, f+" start"
    s=s.replace(a,'setTimeout(()=>{ S.people=[]; if(S.consent) onboarding(false); else consentSheet(()=>onboarding(false)); },300);',1)
    b='} else { render(); if(!missedCheck()) dailyPopup(); }'
    assert b in s, f+" else"
    s=s.replace(b,'} else { render(); if(!S.consent) consentSheet(()=>{ if(!missedCheck()) dailyPopup(); }); else if(!missedCheck()) dailyPopup(); }',1)
    c='["x:ai","AI разпознаване"],["x:notif","Известия"],'
    assert c in s, f+" drawer"
    s=s.replace(c,'["x:ai","AI разпознаване"],["x:notif","Известия"],["x:privacy","Поверителност и данни"],',1)
    d='    else if(k==="x:notif") notifSheet();'
    assert d in s
    s=s.replace(d,d+'\n    else if(k==="x:privacy") privacySheet();',1)
    if inline:
        i=s.index("/* FIT core"); j=s.index("})(typeof window",i); j=s.index("\n",j)
        s=s[:i]+CORE.rstrip()+s[j:]
    open(f,"w",encoding="utf8").write(s); print(f,"ok")
