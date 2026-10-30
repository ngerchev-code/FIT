"""Пълна проверка на FIT в Chromium: всички екрани, менюта, бутони, прозорци.
Пуска се в два режима: уеб (без Capacitor) и „Android“ (с фалшиви плъгини)."""
import sys, json, asyncio
from playwright.async_api import async_playwright

URL = "file:///home/claude/fit-app/www/index.html"
FAKE_CAP = """
window.__calls=[];
const mk=(name)=>new Proxy({}, {get:(t,k)=>async(...a)=>{ window.__calls.push(name+'.'+String(k));
  if(k==='checkPermissions'||k==='requestPermissions') return {display:'granted',location:'granted'};
  if(k==='getPending') return {notifications:[]};
  if(k==='getCurrentPosition') return {coords:{latitude:42.6977,longitude:23.3219}};
  if(k==='canOpenUrl') return {value:false};
  if(k==='addListener') return {remove(){}};
  return {}; }});
window.Capacitor={isNativePlatform:()=>true, Plugins:new Proxy({}, {get:(t,k)=>mk(String(k))})};
"""
WX = {"current":{"temperature_2m":14,"apparent_temperature":12,"relative_humidity_2m":70,"precipitation":0,"weather_code":2,"wind_speed_10m":10,"wind_gusts_10m":20,"uv_index":2,"pressure_msl":1015},
 "hourly":{"time":[f"2026-10-31T{h:02d}:00" for h in range(24)]+[f"2026-11-01T{h:02d}:00" for h in range(24)],"temperature_2m":[12]*48,"precipitation_probability":[10]*48,"weather_code":[2]*48,"wind_speed_10m":[8]*48},
 "daily":{"time":[f"2026-11-0{i}" for i in range(1,8)],"weather_code":[2,61,3,95,0,71,45],"temperature_2m_max":[16,14,15,12,18,2,9],"temperature_2m_min":[6]*7,"precipitation_probability_max":[10,80,20,90,0,60,30],"precipitation_sum":[0,5,0,12,0,3,0],"uv_index_max":[3]*7,"sunrise":["2026-11-01T06:55"]*7,"sunset":["2026-11-01T17:10"]*7,"wind_speed_10m_max":[15,20,10,55,8,25,12]}}
AQ = {"current":{"pm10":15,"pm2_5":8,"european_aqi":30}}
OVERPASS = {"elements":[{"type":"way","center":{"lat":42.67,"lon":23.31},"tags":{"name":"Южен парк","leisure":"park"}},
 {"type":"node","lat":42.56,"lon":23.29,"tags":{"name":"Черни връх","natural":"peak","ele":"2290"}},
 {"type":"way","center":{"lat":42.64,"lon":23.43},"tags":{"name":"Панчарево","natural":"water","water":"reservoir"}},
 {"type":"node","lat":42.6,"lon":23.3,"tags":{"name":"Хижа Алеко","tourism":"alpine_hut"}}]}

async def run(native):
    errs, logs = [], []
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={"width":390,"height":844}, geolocation={"latitude":42.6977,"longitude":23.3219}, permissions=["geolocation"])
        page = await ctx.new_page()
        page.on("pageerror", lambda e: errs.append("PAGEERROR: "+str(e)+" | "+(e.stack or "")[:600]))
        page.on("console", lambda m: logs.append(m.type+": "+m.text) if m.type in ("error",) else None)
        async def route(r):
            u = r.request.url
            if "api.open-meteo.com" in u: return await r.fulfill(json=WX)
            if "air-quality-api" in u: return await r.fulfill(json=AQ)
            if "overpass-api" in u: return await r.fulfill(json=OVERPASS)
            if "nominatim" in u: return await r.fulfill(json=[{"lat":"42.69","lon":"23.32"}])
            if u.startswith("file://"): return await r.continue_()
            return await r.abort()
        await page.route("**/*", route)
        if native: await page.add_init_script(FAKE_CAP)
        await page.goto(URL)
        await page.wait_for_timeout(800)
        # онбординг
        await page.fill("#o-name", "Тест")
        await page.click("#o-next"); await page.click("[data-g=muscle]"); await page.click("[data-g=posture]"); await page.click("#o-next")
        await page.click("[data-lim=knee]"); await page.click("#o-next"); await page.click("#o-next")
        await page.wait_for_timeout(2500)
        steps = []
        async def closesheets():
            for _ in range(3):
                if await page.locator("#scrim").count():
                    await page.evaluate("closeSheet()")
        async def step(name, js):
            try:
                await page.evaluate(js); await page.wait_for_timeout(350); steps.append("ok   "+name)
            except Exception as e:
                steps.append("FAIL "+name+": "+str(e)[:160])
            await closesheets()
        await closesheets()
        for t in ["today","plan","scan","mama","world"]:
            await step("tab "+t, f'show("{t}")')
        for sg in ["places","nature","events","pilates","food","weather","gyms","subst","shops","news","people"]:
            await step("seg "+sg, f'worldSeg="{sg}"; show("world")')
            await page.wait_for_timeout(300)
        # бутони
        await step("drawer", 'openDrawer()')
        await step("drawer item nature", 'openDrawer(); document.querySelector("[data-dr=\\"w:nature\\"]").click()')
        await step("ai sheet", 'aiSheet()'); await step("notif sheet", 'notifSheet()')
        await step("nav sheet", 'navSheet("LAVA LAB","LAVA LAB София")'); await page.wait_for_timeout(1500)
        await step("add place sheet", 'worldSeg="places"; show("world"); addPlaceSheet()')
        await step("class sheet book", 'classSheet("book","LAVA LAB")')
        await step("class sheet watch", 'classSheet("watch","Angel\'s Pilates")')
        await step("save class", 'classSheet("book","LAVA LAB"); document.querySelector("#cl-ok").click()')
        await step("save watch", 'classSheet("watch","LAVA LAB"); document.querySelector("#cl-ok").click()')
        await step("pilates render with data", 'worldSeg="pilates"; show("world")')
        await step("wspots free spot", 'const b=document.querySelector("[data-wspots]"); b&&b.click(); document.querySelector("#ws-v").value="7/8"; document.querySelector("#ws-ok").click()')
        await step("gotspot", 'worldSeg="pilates"; show("world"); const b=document.querySelector("[data-gotspot]"); b&&b.click()')
        await step("gym note", 'worldSeg="gyms"; show("world"); gymNoteSheet(0); document.querySelector("#gn-price").value="60 €"; document.querySelector("#gn-ok").click()')
        await step("allergy toggle", 'worldSeg="subst"; show("world"); document.querySelector("[data-alg=milk]").click()')
        await step("subst danger filter", 'substF="danger"; show("world")')
        await step("nat idea", 'worldSeg="nature"; show("world")'); await page.wait_for_timeout(1500)
        await step("nat sheet", 'showNatSheet(natCandidates())')
        await step("nat next", 'showNatSheet(natCandidates()); document.querySelector("#natNext").click()')
        await step("venues filter", 'worldSeg="food"; show("world"); document.querySelectorAll("[data-vf]")[1].click()')
        await step("after workout venue", 'afterWorkoutVenue()'); await page.wait_for_timeout(2600)
        await step("finish workout", 'show("today"); const f=document.querySelector("#finishBtn"); f&&f.click()')
        await step("check exercise", 'show("today"); const c=document.querySelector("[data-done]"); c&&c.click()')
        await step("events add", 'worldSeg="events"; show("world"); document.querySelector("#ev-name").value="Поход Мусала"; document.querySelector("#ev-date").value="2026-12-01"; document.querySelector("#ev-add").click()')
        await step("plan partner", 'show("plan")')
        await step("scan manual", 'show("scan"); document.querySelector("[data-eq=legpress]").click()')
        await step("scan add manual", 'document.querySelector("#addManual") && document.querySelector("#addManual").click()')
        await step("mode chip", 'show("scan"); document.querySelector("[data-mode=str]").click()')
        await step("who sheet", 'document.querySelector("#whoBtn").click()')
        await step("edit profile", 'onboarding(false,P())')
        await step("add person", 'onboarding(true)')
        await step("weather city", 'worldSeg="weather"; show("world"); const s=document.querySelector("#wxCity"); s.value="Варна"; s.dispatchEvent(new Event("change"))')
        await page.wait_for_timeout(800)
        await step("schedule notifs", 'scheduleNotifs()'); await page.wait_for_timeout(600)
        for q in ["Какво тренирам днес?","Какво да ям след тренировка?","Безопасен ли е кофеинът за мен?","Къде да изляза навън?","Как да запиша час за пилатес?","Какво е времето?","DMAA","здрасти как си"]:
            await step("chat: "+q, 'openChat(); chatSend('+json.dumps(q)+')')
            ans = await page.evaluate('CHAT.length?CHAT[CHAT.length-1].t:""')
            steps.append("ok   ↳ "+ans[:110])
        await step("chat go button", 'openChat(); const b=document.querySelector("[data-chatgo]"); b&&b.click()')
        await step("chat fab", 'document.querySelector("#chatFab").click()')
        # хоризонтален скрол
        overflow = await page.evaluate('document.documentElement.scrollWidth > window.innerWidth+1')
        calls = await page.evaluate('window.__calls||[]')
        await b.close()
    return steps, errs, logs, overflow, calls

async def main():
    for native in (False, True):
        steps, errs, logs, ov, calls = await run(native)
        print("=== режим", "ANDROID" if native else "УЕБ", "===")
        print("\n".join(s for s in steps if not s.startswith("ok")) or "всички стъпки ok ("+str(len(steps))+")")
        print("\n".join(s for s in steps if "↳" in s))
        print("грешки на страницата:", errs or "няма")
        print("console errors:", [l for l in logs if "ERR_FAILED" not in l and "net::" not in l][:10] or "няма")
        print("хоризонтален скрол:", ov)
        if native: print("плъгини:", sorted(set(calls)))
asyncio.run(main())
