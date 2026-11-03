import sys
HEAD='''<link rel="manifest" href="manifest.webmanifest">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="FIT">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="theme-color" content="#0C0F14">
'''
OLD='<p style="margin:0">Свали иконата, после в Chrome отвори менюто ⋮ и избери „Добавяне към началния екран“.</p>'
NEW='<p style="margin:0">${/iPhone|iPad|iPod/.test(navigator.userAgent)?"iPhone: отвори FIT в Safari, натисни „Сподели“ ⬆️ и избери „Добави към началния екран“.":"Android: свали FIT.apk от менюто или в Chrome отвори ⋮ и избери „Добавяне към началния екран“."}</p>'
REG='''
/* ============ PWA (iPhone и браузър) ============ */
if(!NATIVE && "serviceWorker" in navigator && location.protocol==="https:" && !/claude|anthropic/.test(location.hostname)){ try{ navigator.serviceWorker.register("sw.js"); }catch(e){} }
'''
f=sys.argv[1]; s=open(f,encoding="utf8").read()
if 'rel="manifest"' not in s:
    s=s.replace('<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">','<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'+HEAD,1)
assert OLD in s; s=s.replace(OLD,NEW,1)
m='/* ============ ANDROID ============ */'
if "PWA (iPhone" not in s: s=s.replace(m,REG+m,1)
open(f,"w",encoding="utf8").write(s); print("ok")
