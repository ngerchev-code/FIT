import sys
p=sys.argv[1]; s=open(p,encoding='utf8').read()
e5=open('/home/claude/fit-app/tools/extra5.js',encoding='utf8').read(); e6=open('/home/claude/fit-app/tools/extra6.js',encoding='utf8').read()
def R(a,b,c=1):
    global s
    assert s.count(a)==c,(p,a[:80],s.count(a)); s=s.replace(a,b)
R('/* ---------- FIT COACH ---------- */', e5+'\n'+e6+'\n/* ---------- FIT COACH ---------- */')
R('const segs=[["places","Мои обекти"],','const segs=[["places","Мои обекти"],["nature","Навън около мен"],')
R('["pilates","Пилатес и часове"],','["pilates","Пилатес и часове"],["food","Заведения"],')
R('''  } else if(worldSeg==="places"){''','''  } else if(worldSeg==="nature"){
    body = natureHTML(); if(!NAT&&!NATbusy&&!NATerr) setTimeout(()=>loadNature().then(()=>{ if(TAB==="world"&&worldSeg==="nature") rWorld(); }),0);
  } else if(worldSeg==="food"){
    body = venuesHTML();
  } else if(worldSeg==="places"){''')
R('''  if(worldSeg==="places") wirePlaces(v);''','''  if(worldSeg==="places") wirePlaces(v);
  if(worldSeg==="nature") wireNature(v);
  v.querySelectorAll("[data-vf]").forEach(b=>b.onclick=()=>{ venueF=b.dataset.vf; rWorld(); });''')
R('["Лайфстайл",[["w:places","Мои обекти"],','["Лайфстайл",[["w:places","Мои обекти"],["w:nature","Навън около мен — паркове, гори, море, планина"],')
R('["w:pilates","Пилатес и записване на часове"],','["w:pilates","Пилатес и записване на часове"],["w:food","Заведения и резервации в Rezzo"],')
R('setTimeout(()=>{ if(TAB==="today") ideaPopup(); scheduleNotifs(); },0);','setTimeout(()=>{ if(TAB==="today"){ if(NATIVE) natPopup(); else ideaPopup(); } scheduleNotifs(); },0);')
R('''      let title="Идея за активност", body=IDEAS_OUT[(day.getDate())%IDEAS_OUT.length];''','''      let title="Идея за активност", body=IDEAS_OUT[(day.getDate())%IDEAS_OUT.length];
      const natC=(typeof natCandidates==="function")?natCandidates().filter(x=>natFit(x,null).ok):[];''')
R('''title=id.bad?"Форсмажор: "+id.why:"Хубаво време навън"; body=id.idea+(id.bad?" — на закрито.":" — излез навън."); } }''','''title=id.bad?"Форсмажор: "+id.why:"Хубаво време навън"; body=id.idea+(id.bad?" — на закрито.":" — излез навън."); if(!id.bad&&natC.length){ const x=natC[i%natC.length]; body=x.name+" ("+distText(x.km).km+" км) — "+natFit(x,null).act; } } }''')
R('const fb=$("#finishBtn"); if(fb) fb.onclick=()=>{ markWorkoutDone(); rToday(); };','const fb=$("#finishBtn"); if(fb) fb.onclick=()=>{ markWorkoutDone(); rToday(); afterWorkoutVenue(); };')
R('document.addEventListener("click",e=>{ const g=e.target.closest("[data-go]"); if(g) show(g.dataset.go);','document.addEventListener("click",e=>{ const g=e.target.closest("[data-go]"); if(g){ if($("#sheetHost").innerHTML) closeSheet(); show(g.dataset.go); }')
open(p,'w',encoding='utf8').write(s)
