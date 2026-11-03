import sys
X=open("/home/claude/fit-app/tools/extra14.js",encoding="utf8").read()
CORE=open("/home/claude/fit-app/www/fit-core.js",encoding="utf8").read()
for f,inline in ((sys.argv[1],False),(sys.argv[2],True)):
    s=open(f,encoding="utf8").read()
    if "function onWatchAction" in s: print(f,"вече"); continue
    m='/* ============ СТАРТ ============ */'
    s=s.replace(m,X+"\n"+m,1)
    a='["x:ai","AI разпознаване"],["x:notif","Известия"],["x:privacy","Поверителност и данни"],'
    assert a in s, f
    s=s.replace(a,'["x:ai","AI разпознаване"],["x:notif","Известия"],["x:watch","Часовник (Galaxy Watch)"],["x:privacy","Поверителност и данни"],',1)
    d='    else if(k==="x:privacy") privacySheet();'
    s=s.replace(d,d+'\n    else if(k==="x:watch") watchSheet();',1)
    o='<b class="mono">${cardio?x.reps+" мин":x.weightKg+" kg × "+x.reps}</b>'
    assert o in s, f+" setrow"
    s=s.replace(o,'<b class="mono">${cardio?x.reps+" мин":x.weightKg+" kg × "+x.reps}${x.hrAvg?" · ♥"+x.hrAvg:""}</b>',1)
    s=s.replace('${x.edited?"поправено":x.source==="manual"?"ръчно":"от часовник"} ✎','${x.edited?"поправено":x.source==="manual"?"ръчно":"от часовника"} ✎',1)
    if inline:
        i=s.index("/* FIT core"); j=s.index("})(typeof window",i); j=s.index("\n",j)
        s=s[:i]+CORE.rstrip()+s[j:]
    open(f,"w",encoding="utf8").write(s); print(f,"ok")
