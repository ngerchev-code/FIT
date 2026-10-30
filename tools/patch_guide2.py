import sys
p=sys.argv[1]; s=open(p,encoding='utf8').read()
def R(a,b,c=1):
    global s
    assert s.count(a)==c,(p,a[:80],s.count(a)); s=s.replace(a,b)
ICON='<svg viewBox="0 0 24 24" width="WW" height="WW" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21.5s-5.5-4.9-5.5-9.3a5.5 5.5 0 0 1 11 0c0 4.4-5.5 9.3-5.5 9.3z"/><circle cx="12" cy="12" r="2"/><path d="M4.2 8.6A9 9 0 0 1 7 4.6M19.8 8.6A9 9 0 0 0 17 4.6"/><path d="M1.8 7.4A11.5 11.5 0 0 1 5 2.6M22.2 7.4A11.5 11.5 0 0 0 19 2.6" opacity=".55"/></svg>'
old_hdr='<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2z"/><path d="M9 4v14M15 6v14"/></svg>'
R(old_hdr, ICON.replace("WW","24"))
old_cta='<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2z"/><path d="M9 4v14M15 6v14"/></svg>'
R(old_cta, ICON.replace("WW","28"))
R('.guide-ic{width:48px;height:48px;border-radius:14px;background:var(--hot);color:#fff;display:grid;place-items:center;flex:0 0 auto}',
  '.guide-ic{width:50px;height:50px;border-radius:16px;background:var(--go);color:#fff;display:grid;place-items:center;flex:0 0 auto;position:relative}\n.guide-ic::after,.guide-btn::after{content:"";position:absolute;inset:-4px;border-radius:inherit;border:2px solid var(--go);opacity:0;animation:gpulse 2.6s ease-out infinite}\n@keyframes gpulse{0%{opacity:.7;transform:scale(.9)}70%{opacity:0;transform:scale(1.25)}100%{opacity:0}}')
R('.guide-btn{margin-left:auto;color:var(--hot)}','.guide-btn{margin-left:auto;background:var(--go);color:#fff;border-color:var(--go);position:relative;border-radius:14px}\n@media (max-width:420px){.logo-sub{display:none}}')
R(':root{\n  --wx:#FFC233; --wx-ink:#1A1300;',':root{\n  --wx:#FFC233; --wx-ink:#1A1300; --go:#12A150;')
# по-бързо зареждане: карта веднага, места после; таймаут и резервен сървър
R('''    const R=guideRadius*1000, a=`(around:${R},${me.lat},${me.lon})`;''','''    GUIDE={me,list:[],loading:true}; GUIDEbusy=false; if(TAB==="guide") rGuide(); GUIDEbusy=true;
    const R=guideRadius*1000, a=`(around:${R},${me.lat},${me.lon})`;''')
R('''    const r=await fetch("https://overpass-api.de/api/interpreter",{method:"POST",body:"data="+encodeURIComponent(q),headers:{"content-type":"application/x-www-form-urlencoded"}});
    const j=await r.json(); const seen=new Set(); const list=[];
    (j.elements||[]).forEach(e=>{ const t=e.tags||{}; const name=t["name:bg"]||t.name; const c=e.center||(e.lat?{lat:e.lat,lon:e.lon}:null); if(!name||!c) return;''','''    let j=null;
    for(const host of ["https://overpass-api.de/api/interpreter","https://overpass.kumi.systems/api/interpreter","https://overpass.private.coffee/api/interpreter"]){
      const ctl=new AbortController(); const tm=setTimeout(()=>ctl.abort(),15000);
      try{ const r=await fetch(host,{method:"POST",signal:ctl.signal,body:"data="+encodeURIComponent(q),headers:{"content-type":"application/x-www-form-urlencoded"}}); if(r.ok){ j=await r.json(); clearTimeout(tm); break; } }catch(e){}
      clearTimeout(tm);
    }
    if(!j) throw new Error("overpass");
    const seen=new Set(); const list=[];
    (j.elements||[]).forEach(e=>{ const t=e.tags||{}; const name=t["name:bg"]||t.name; const c=e.center||(e.lat?{lat:e.lat,lon:e.lon}:null); if(!name||!c) return;''')
R('''  }catch(e){ GUIDEerr="Не успях да заредя картата наоколо. Провери интернета и опитай пак."; }''','''  }catch(e){ if(GUIDE&&GUIDE.loading){ GUIDE.loading=false; GUIDE.failed=true; } else GUIDEerr="Не успях да заредя картата наоколо. Провери интернета и опитай пак."; }''')
R('''    <div class="row" style="justify-content:space-between"><span class="muted" style="font-size:13px">${GUIDE?items.length+" места в радиус "+guideRadius+" км":""}</span>''','''    <div class="row" style="justify-content:space-between"><span class="muted" style="font-size:13px">${GUIDE?(GUIDE.loading?'<span class="thinking" style="display:inline-flex"><span class="spin"></span>Зареждам места наоколо…</span>':GUIDE.failed?'Сървърът за места не отговори. <button class="btn ghost sm" id="gdRetry2" type="button">Опитай пак</button>':items.length+" места в радиус "+guideRadius+" км"):""}</span>''')
R('''  const rt=$("#gdRetry"); if(rt) rt.onclick=()=>{ MYPOS=null; loadGuide(true); rGuide(); };''','''  const rt=$("#gdRetry"); if(rt) rt.onclick=()=>{ MYPOS=null; loadGuide(true); rGuide(); };
  const rt2=$("#gdRetry2"); if(rt2) rt2.onclick=()=>{ GUIDE=null; loadGuide(true); rGuide(); };''')
open(p,'w',encoding='utf8').write(s)
