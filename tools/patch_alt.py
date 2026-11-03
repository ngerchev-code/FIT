import sys
X=open("/home/claude/fit-app/tools/extra15.js",encoding="utf8").read()
CORE=open("/home/claude/fit-app/www/fit-core.js",encoding="utf8").read()
for f,inline in ((sys.argv[1],False),(sys.argv[2],True)):
    s=open(f,encoding="utf8").read()
    if "function cantTodaySheet" in s: print(f,"вече"); continue
    m='/* ============ СТАРТ ============ */'
    s=s.replace(m,X+"\n"+m,1)
    a='<div class="stepper"><span>${cardio?"Минути":"Повторения"}</span>'
    assert a in s, f+" reps"
    s=s.replace(a,'<div class="stepper"><span>${e.unit&&/сек/.test(e.unit)?"Секунди":(cardio||e.unit==="мин")?"Минути":"Повторения"}</span>',1)
    b='${!cardio&&!mob?`<div class="stepper"><span>Тежест</span>'
    assert b in s, f+" kg"
    s=s.replace(b,'${!cardio&&!mob&&!String(e.machineId).startsWith("bw-")?`<div class="stepper"><span>Тежест</span>',1)
    c='без двойно натоварване.");\n        render(); });'
    assert c in s, f+" missed"
    s=s.replace(c,'без двойно натоварване.");\n        render(); if(["home","walk","mobility"].includes(st.alternative)) setTimeout(()=>offerAltNow(st.alternative),400); });',1)
    if inline:
        i=s.index("/* FIT core"); j=s.index("})(typeof window",i); j=s.index("\n",j)
        s=s[:i]+CORE.rstrip()+s[j:]
    open(f,"w",encoding="utf8").write(s); print(f,"ok")
