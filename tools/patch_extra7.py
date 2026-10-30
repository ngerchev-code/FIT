import sys
p=sys.argv[1]; s=open(p,encoding='utf8').read()
e7=open('/home/claude/fit-app/tools/extra7.js',encoding='utf8').read()
def R(a,b,c=1):
    global s
    assert s.count(a)==c,(p,a[:80],s.count(a)); s=s.replace(a,b)
R('/* ============ СТАРТ ============ */', e7+'\n/* ============ СТАРТ ============ */')
R('<div id="sheetHost"></div>','<button class="chat-fab" id="chatFab" type="button" aria-label="Попитай FIT"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/><path d="M8.5 11h.01M12 11h.01M15.5 11h.01"/></svg></button>\n<div id="sheetHost"></div>')
R('.who{margin-left:auto;','.chat-fab{position:fixed;z-index:26;right:calc(16px + env(safe-area-inset-right,0px));bottom:calc(var(--tab-h) + 18px + env(safe-area-inset-bottom,0px));width:54px;height:54px;border-radius:18px;border:0;background:var(--hot);color:#fff;display:grid;place-items:center;box-shadow:0 8px 22px color-mix(in srgb,var(--hot) 45%,transparent)}\n.who{margin-left:auto;')
R('$("#menuBtn").onclick=openDrawer;','$("#menuBtn").onclick=openDrawer;\n$("#chatFab").onclick=()=>{ if(P()) openChat(); };')
# natShown само когато прозорецът наистина се покаже
R('  p.log[t]=p.log[t]||{}; p.log[t].natShown=1; save();\n  natPick=0; showNatSheet(cands);','  natPick=0; if(showNatSheet(cands)!==false){ p.log[t]=p.log[t]||{}; p.log[t].natShown=1; save(); }')
R('  if($("#sheetHost").innerHTML && !$("#natSheet")) return;','  if($("#sheetHost").innerHTML && !$("#natSheet")) return false;')
# сигурни връзки
R('["Култура",[["Култура.бг","изкуство и общество","https://kultura.bg"],["Капитал Light","култура и стил","https://www.capital.bg/light"]]]','["Култура",[["Култура в София","Столична община","https://kultura.sofia.bg"],["Капитал Light","култура и стил","https://www.capital.bg/light"],["БТА — събитията днес","календар","https://www.bta.bg/bg/today"]]]')
R('["Уелнес",[["Puls.bg","здраве и спорт","https://www.puls.bg"],["Zdrave.net","медицински новини","https://www.zdrave.net"]]]','["Уелнес",[["Puls.bg","здраве и спорт","https://www.puls.bg"],["Coolfit блог","спорт и уелнес","https://coolfit.bg/home"]]]')
open(p,'w',encoding='utf8').write(s)
