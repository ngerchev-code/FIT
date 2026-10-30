import sys
p=sys.argv[1]; s=open(p,encoding='utf8').read()
e9=open('/home/claude/fit-app/tools/extra9.js',encoding='utf8').read()
def R(a,b,c=1):
    global s
    assert s.count(a)==c,(p,a[:80],s.count(a)); s=s.replace(a,b)
R('/* ============ СТАРТ ============ */', e9+'\n/* ============ СТАРТ ============ */')
if 'fit-app' in p:
    R('</head>','<link rel="stylesheet" href="vendor/leaflet/leaflet.css">\n<script src="vendor/leaflet/leaflet.js"></script>\n</head>')
R('  <section class="view" id="v-world" hidden></section>','  <section class="view" id="v-world" hidden></section>\n  <section class="view" id="v-guide" hidden></section>')
R('["today","scan","plan","mama","world"].forEach(v=>$("#v-"+v).hidden = v!==tab);','["today","scan","plan","mama","world","guide"].forEach(v=>$("#v-"+v).hidden = v!==tab);')
R('({today:rToday, scan:rScan, plan:rPlan, mama:rMama, world:rWorld})[TAB]();','({today:rToday, scan:rScan, plan:rPlan, mama:rMama, world:rWorld, guide:rGuide})[TAB]();')
R('["rToday","rScan","rPlan","rMama","rWorld"].forEach','["rToday","rScan","rPlan","rMama","rWorld","rGuide"].forEach')
R('const DRAWER = [\n','const DRAWER = [\n  ["GUIDE",[["guide","Карта наоколо — GUIDE"]]],\n')
# header GUIDE button
R('  <button class="who" id="whoBtn"','  <button class="menu-btn guide-btn" id="guideBtn" type="button" aria-label="GUIDE — карта наоколо"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2z"/><path d="M9 4v14M15 6v14"/></svg></button>\n  <button class="who" id="whoBtn"')
R('$("#menuBtn").onclick=openDrawer;','$("#menuBtn").onclick=openDrawer;\n$("#guideBtn").onclick=()=>show("guide");')
# Today CTA after hero
R('''    <div class="card" style="border-color:var(--accent)">
      <p class="eyebrow">Твоята посока</p>''','''    <button class="card guide-cta" type="button" data-go="guide"><span class="guide-ic" aria-hidden="true"><svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2z"/><path d="M9 4v14M15 6v14"/></svg></span><span style="min-width:0;text-align:left"><b style="display:block;font-size:16px">GUIDE — какво има наоколо</b><span class="ex-meta">Карта по GPS: фитнеси, пилатес, басейни, заведения, магазини, паркове и природа</span></span></button>
    <div class="card" style="border-color:var(--accent)">
      <p class="eyebrow">Твоята посока</p>''')
# CSS: weather + guide
R('.who{margin-left:auto;','''.wx{background:var(--wx);color:var(--wx-ink);border-color:transparent}
.wx .eyebrow,.wx .muted,.wx .ex-meta,.wx .note{color:var(--wx-ink);opacity:.82}
.wx .pill{background:rgba(0,0,0,.12);color:var(--wx-ink)}
.wx select.in{background:rgba(255,255,255,.65);color:#1A1300;border-color:transparent}
.wx .card{background:rgba(255,255,255,.4);border-color:transparent;color:var(--wx-ink)}
.guide-cta{flex-direction:row;align-items:center;gap:14px;cursor:pointer;background:var(--ink);color:var(--surface);border-color:var(--ink)}
.guide-cta .ex-meta{color:color-mix(in srgb,var(--surface) 75%,transparent)}
.guide-ic{width:48px;height:48px;border-radius:14px;background:var(--hot);color:#fff;display:grid;place-items:center;flex:0 0 auto}
.guide-btn{margin-left:auto;color:var(--hot)}
.guide-btn + .who{margin-left:8px}
.leaflet-popup-content{font-family:var(--f-body)}
.who{margin-left:auto;''')
R(':root{\n  --bg:#ECEEF2;',':root{\n  --wx:#FFC233; --wx-ink:#1A1300;\n  --bg:#ECEEF2;')
R('<button class="card" data-go="world" id="wxMini" type="button" style="text-align:left;cursor:pointer">','<button class="card wx" data-go="world" id="wxMini" type="button" style="text-align:left;cursor:pointer">')
R('''  if(!WX) return `<div class="card"><p class="eyebrow">Време · ${esc(cityOf()[0])}</p>''','''  if(!WX) return `<div class="card wx"><p class="eyebrow">Време · ${esc(cityOf()[0])}</p>''')
R('''  if(!WX) return `<div class="card">${sel}''','''  if(!WX) return `<div class="card wx">${sel}''')
R('''  return `<div class="card">${sel}
    <div class="row" style="justify-content:space-between;align-items:flex-end">''','''  return `<div class="card wx">${sel}
    <div class="row" style="justify-content:space-between;align-items:flex-end">''')
open(p,'w',encoding='utf8').write(s)
