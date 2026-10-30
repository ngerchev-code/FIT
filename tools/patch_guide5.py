import sys,re
CARD='''.card.guide-cta{flex-direction:row;align-items:center;gap:14px;cursor:pointer;background:#12A150!important;color:#fff!important;border-color:#12A150!important;text-align:left}
.card.guide-cta .ex-name,.card.guide-cta b,.card.guide-cta strong{color:#fff!important}
.card.guide-cta .ex-meta{color:rgba(255,255,255,.88)!important}
.card.guide-cta .guide-ic{background:rgba(255,255,255,.2)!important;border-color:rgba(255,255,255,.45)!important;color:#fff!important;box-shadow:none!important}
'''
for f in sys.argv[1:]:
    s=open(f,encoding="utf8").read()
    s=re.sub(r'\n  <button class="menu-btn guide-btn" id="guideBtn"[^\n]*</button>','',s,1)
    s=s.replace('$("#guideBtn").onclick=()=>show("guide");','')
    s=s.replace('@media (max-width:420px){.logo-sub{display:none}}','')
    s=re.sub(r'\.card\.guide-cta\{[^}]*\}\n\.card\.guide-cta \.ex-meta\{[^}]*\}\n',CARD,s,1)
    assert 'id="guideBtn"' not in s and "#12A150!important" in s, f
    open(f,"w",encoding="utf8").write(s); print(f,"ok")
