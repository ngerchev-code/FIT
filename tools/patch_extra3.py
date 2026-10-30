import sys,base64
p=sys.argv[1]; s=open(p,encoding='utf8').read()
extra=open('/home/claude/fit-app/tools/extra3.js',encoding='utf8').read()
if 'fit-app' not in p:
    b64=base64.b64encode(open('/home/claude/fit-app/www/drop.wav','rb').read()).decode()
    extra=extra.replace('new Audio("drop.wav")','new Audio("data:audio/wav;base64,'+b64+'")')
def R(a,b,c=1):
    global s
    assert s.count(a)==c,(p,a[:80],s.count(a)); s=s.replace(a,b)
R('/* ---------- FIT COACH ---------- */', extra+'\n/* ---------- FIT COACH ---------- */')
R('const segs=[["events","Събития"],','const segs=[["events","Събития"],["pilates","Пилатес и часове"],')
R('''  } else if(worldSeg==="gyms"){''','''  } else if(worldSeg==="pilates"){
    body = pilatesHTML();
  } else if(worldSeg==="gyms"){''')
R('''  v.querySelectorAll("[data-sf]").forEach(b=>b.onclick=()=>{ substF=b.dataset.sf; rWorld(); });''','''  v.querySelectorAll("[data-sf]").forEach(b=>b.onclick=()=>{ substF=b.dataset.sf; rWorld(); });
  if(worldSeg==="pilates") wirePilates(v);''')
R('["w:events","Събития и походи"],','["w:events","Събития и походи"],["w:pilates","Пилатес и записване на часове"],')
R('''    let perm=await LN.checkPermissions(); if(perm.display!=="granted") perm=await LN.requestPermissions(); if(perm.display!=="granted") return;''','''    let perm=await LN.checkPermissions(); if(perm.display!=="granted") perm=await LN.requestPermissions(); if(perm.display!=="granted") return;
    try{ await LN.createChannel({id:"fit_drop",name:"FIT",description:"Тренировки, часове, свободни места и идеи",importance:4,sound:"drop.wav",vibration:true,visibility:1}); }catch(e){}''')
R('''    if(out.length) await LN.schedule({notifications:out});''','''    const now=new Date();
    (p.classes||[]).forEach((c,k)=>{ const at=new Date(c.at);
      const eve=new Date(at); eve.setDate(eve.getDate()-1); eve.setHours(20,0,0,0);
      if(eve>now) out.push({id:4000+k*10,title:"Утре: "+c.type,body:c.studio+" · "+fmtWhen(c.at)+". Приготви кърпа, вода и чорапи с грип.",schedule:{at:eve,allowWhileIdle:true}});
      const b2=new Date(at.getTime()-2*3600e3); if(b2>now) out.push({id:4001+k*10,title:"След 2 часа: "+c.type,body:c.studio+" — тръгни навреме.",schedule:{at:b2,allowWhileIdle:true}}); });
    (p.watches||[]).forEach((w,k)=>{ const end=new Date(w.at); let t=new Date(now.getTime()+w.every*3600e3); let n=0;
      while(t<end && n<30){ const h=t.getHours(); if(h>=8&&h<=21){ out.push({id:5000+k*50+n,title:"Провери за свободно място",body:w.type+" · "+w.studio+" · "+fmtWhen(w.at),schedule:{at:new Date(t),allowWhileIdle:true}}); n++; } t=new Date(t.getTime()+w.every*3600e3); } });
    out.forEach(n=>{ n.channelId="fit_drop"; n.sound="drop.wav"; });
    if(out.length) await LN.schedule({notifications:out});''')
R('''    <div class="h-display">${esc(id.idea)}</div>''','''    <div class="h-display">${esc(id.idea)}</div>''')
R('''      $("#idDone").onclick=()=>{ closeSheet(); addXP(15,"Активност: "+id.idea); };
    }); }, 1800);''','''      $("#idDone").onclick=()=>{ closeSheet(); addXP(15,"Активност: "+id.idea); };
    }); dropSound(); }, 1800);''')
open(p,'w',encoding='utf8').write(s)
