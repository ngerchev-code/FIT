import sys
OLD_T='L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",{maxZoom:19,subdomains:"abcd",attribution:"© OpenStreetMap, © CARTO"}).addTo(guideMap);'
NEW_T='''(function(){ const SRC=[
    ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",{maxZoom:19,attribution:"© Esri, © OpenStreetMap"}],
    ["https://tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:"© OpenStreetMap"}],
    ["https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",{maxZoom:17,subdomains:"abc",attribution:"© OpenStreetMap, © OpenTopoMap"}]];
    let i=0, bad=0, lay=null; const m=guideMap;
    const put=()=>{ if(lay) m.removeLayer(lay); bad=0; lay=L.tileLayer(SRC[i][0],SRC[i][1]).addTo(m);
      lay.on("tileerror",()=>{ if(++bad>=4 && i<SRC.length-1){ i++; put(); } }); };
    put(); })();'''
OLD_H='<div id="gmap" style="height:min(56vh,460px);'
NEW_H='<div class="gwrap" id="gwrap"><button class="gfs" id="gdFull" type="button" aria-label="Карта на цял екран">⤢ Цял екран</button><div id="gmap" style="height:max(420px,calc(100vh - 230px));'
CSS='''.gwrap{position:relative}.gwrap .gfs{position:absolute;top:10px;right:10px;z-index:1000;background:#fff;color:#10141B;border:0;border-radius:12px;padding:8px 12px;font-weight:800;font-size:13px;box-shadow:0 2px 10px rgba(0,0,0,.25)}
.gwrap.full{position:fixed;inset:0;z-index:9999;background:#000}.gwrap.full #gmap{height:100vh!important;border-radius:0!important;border:0!important}
'''
for f in sys.argv[1:]:
    s=open(f,encoding="utf8").read()
    if "id=\"gwrap\"" in s: print(f,"вече"); continue
    assert OLD_H in s, f
    s=s.replace(OLD_H,NEW_H)
    # затваряме обвивката след #gmap: първия </div> след map-съдържанието е на реда — намираме края на gmap елемента
    i=s.index('id="gwrap"'); j=s.index('<div class="row" style="justify-content:space-between"><span class="muted" style="font-size:13px">${GUIDE?',i)
    s=s[:j]+'</div>\n    '+s[j:]
    if OLD_T in s: s=s.replace(OLD_T,NEW_T)
    hook='const rt=$("#gdRetry");'
    s=s.replace(hook,'''{ const fb=$("#gdFull"), w=$("#gwrap"); if(fb) fb.onclick=()=>{ const on=!w.classList.contains("full"); w.classList.toggle("full",on); fb.textContent=on?"✕ Затвори":"⤢ Цял екран"; setTimeout(()=>{ try{ guideMap&&guideMap.invalidateSize(); }catch(e){} },150); }; }
  '''+hook,1)
    s=s.replace("</style>",CSS+"</style>",1)
    open(f,"w",encoding="utf8").write(s); print(f,"ok", OLD_T in open(f).read())
