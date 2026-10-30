import sys, urllib.parse
p=sys.argv[1]; s=open(p,encoding='utf8').read()
extra=open('/home/claude/fit-app/tools/extra2.js',encoding='utf8').read()
def R(a,b,c=1):
    global s
    assert s.count(a)==c,(p,a[:80],s.count(a)); s=s.replace(a,b)
if 'const Plug' not in s:
    R('const NATIVE = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());\n','const NATIVE = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());\nconst Plug = n => (window.Capacitor && window.Capacitor.Plugins) ? window.Capacitor.Plugins[n] : null;\n')
R('/* ---------- FIT COACH ---------- */', extra+'\n/* ---------- FIT COACH ---------- */')
# header menu button + css
R('<div class="logo" aria-label="FIT — Fitness Intelligent Team">','<button class="menu-btn" id="menuBtn" type="button" aria-label="Меню"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h10"/></svg></button>\n  <div class="logo" aria-label="FIT — Fitness Intelligent Team">')
R('.who{margin-left:auto;','''.menu-btn{width:42px;height:42px;border-radius:12px;border:1px solid var(--line);background:var(--surface-2);display:grid;place-items:center;flex:0 0 auto}
.drawer{background:var(--surface);width:min(300px,84vw);height:100%;overflow:auto;padding:calc(18px + env(safe-area-inset-top,0px)) 16px calc(18px + env(safe-area-inset-bottom,0px)) max(16px,env(safe-area-inset-left,0px));display:flex;flex-direction:column;gap:2px;border-right:1px solid var(--line)}
.drawer-i{border:0;background:none;text-align:left;padding:12px 12px;border-radius:12px;font-weight:700;font-size:15px;min-height:44px}
.drawer-i:hover,.drawer-i:focus-visible{background:var(--accent-soft)}
.who{margin-left:auto;''')
R('document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>show(b.dataset.tab));','document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>show(b.dataset.tab));\n$("#menuBtn").onclick=openDrawer;')
# scanner
R('${SAMPLE_IMG?`<button class="btn sm" id="analyze"','${aiReady()?`<button class="btn sm" id="analyze"')
if '    ${!SAMPLE_IMG ? `<p class="note">' in s:
    R('    ${!SAMPLE_IMG ? `<p class="note">','    ${!aiReady()&&NATIVE?`<button class="btn ghost block" id="aiSetup" type="button">Включи AI разпознаване</button>`:""}\n    ${!aiReady() ? `<p class="note">')
else:
    R('    ${!SAMPLE_IMG && !scanFile ? `<p class="note">','    ${!aiReady() && !scanFile ? `<p class="note">')
R('  const an=$("#analyze"); if(an) an.onclick=analyze;','  const an=$("#analyze"); if(an) an.onclick=analyze;\n  const as=$("#aiSetup"); if(as) as.onclick=aiSheet;')
R('show("scan"); if(SAMPLE_IMG) analyze();','show("scan"); if(aiReady()) analyze();')
R('  if(!SAMPLE||!scanFile) return;','  if(!aiReady()||!scanFile) return;')
R('scanRes = await SAMPLE.json(prompt,{images:[scanFile], signal:scanCtl.signal});','scanRes = await aiScan(scanFile,prompt,scanCtl.signal);')
R('e.code==="image_rejected"?"Снимката не става — опитай с друга.":"Временен проблем. Опитай отново.";','e.code==="image_rejected"?"Снимката не става — опитай с друга.":e.code==="bad_key"?"Ключът за Claude API не е валиден — провери го в менюто → AI разпознаване.":e.code==="not_configured"?"AI разпознаването не е включено — меню → AI разпознаване.":"Временен проблем. Опитай отново.";')
# weather loaded hooks
R('    WX={city:name,w,q:q&&q.current?q.current:null}; WXat=Date.now();','    WX={city:name,w,q:q&&q.current?q.current:null}; WXat=Date.now();\n    setTimeout(()=>{ if(TAB==="today") ideaPopup(); scheduleNotifs(); },0);')
# shops
def m(q): return "https://www.google.com/maps/search/?api=1&query="+urllib.parse.quote(q)
grp=lambda title,items: '  ["%s",[%s]],\n'%(title,",".join('["%s","%s","%s"]'%(n,d,m(q)) for n,d,q in items))
buzz=grp("Buzz и Sport Vision в София",[("BUZZ Serdika","бул. Ситняково 48","BUZZ Serdika София"),("BUZZ Paradise","бул. Черни връх 100","BUZZ Paradise Center София"),("BUZZ Ring Mall","Околовръстен път","BUZZ Ring Mall София"),("Sport Vision Serdika","бул. Ситняково 48","Sport Vision Serdika София"),("Sport Vision Paradise","бул. Черни връх 100","Sport Vision Paradise София"),("Sport Vision The Mall","Цариградско шосе 115","Sport Vision The Mall София")])
outl=grp("Outlet-и в София",[("Nike Factory Store","Околовръстен път 265, Младост 4","Nike Factory Store Sofia"),("Sport Vision Outlet Extra","Околовръстен път 265, Младост 4","Sport Vision Outlet Extra София"),("Asics Outlet Store","бул. Ал. Малинов 77, Младост 3","Asics Outlet Store София"),("Sofia Outlet Center","Цариградско шосе 92А — Puma и др.","Sofia Outlet Center")])
a='  ["Lifestyle",[["Nike","официален магазин","https://www.nike.com"]'
R(a, buzz+outl+'  ["Lifestyle",[["Sport Vision","онлайн магазин","https://www.sportvision.bg"],["Buzz","sneakers и streetwear","https://www.buzzsneakers.bg"],["Nike","официален магазин","https://www.nike.com"]')
R('const DRAWER','const DRAWER')
open(p,'w',encoding='utf8').write(s)
