import sys,re
for f in sys.argv[1:]:
    s=open(f,encoding="utf8").read()
    i=s.index('/* ============ GUIDE'); j=s.index('if(!me){ GUIDEerr=',i)
    k=s.rindex('const me=await myPosition();',i,j)
    s=s[:k]+'let me=await myPosition();'+s[k+len('const me=await myPosition();'):]
    e=s.index('return; }',s.index('if(!me){ GUIDEerr=',i))+len('return; }')
    s=s[:s.index('if(!me){ GUIDEerr=',i)]+'if(!me){ me={lat:42.6977,lon:23.3219,approx:true}; }'+s[e:]
    old='<span class="muted" style="font-size:13px">${GUIDE?(GUIDE.loading?'
    s=s.replace(old,'<span class="muted" style="font-size:13px">${GUIDE&&GUIDE.me&&GUIDE.me.approx?\'<b style="color:var(--go)">Център на София</b> (GPS не е наличен) · \':\'\'}${GUIDE?(GUIDE.loading?',1)
    if "vendor/leaflet" not in s and "cdnjs.cloudflare.com/ajax/libs/leaflet" not in s:
        s=s.replace("</head>",'<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css">\n<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"></script>\n</head>',1)
    open(f,"w",encoding="utf8").write(s); print(f,"ok","approx" in s)
