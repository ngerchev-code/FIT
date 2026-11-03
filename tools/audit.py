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
 {"type":"node","lat":42.6,"lon":23.3,"tags":{"name":"Хижа Алеко","tourism":"alpine_hut"}},
 {"type":"node","lat":42.699,"lon":23.325,"tags":{"name":"Pulse Fitness","leisure":"fitness_centre","opening_hours":"Mo-Su 07:00-23:00"}},
 {"type":"node","lat":42.694,"lon":23.318,"tags":{"leisure":"fitness_station"}},
 {"type":"way","center":{"lat":42.688,"lon":23.336},"tags":{"name":"Национален стадион „Васил Левски“","leisure":"stadium"}},
 {"type":"node","lat":42.697,"lon":23.33,"tags":{"amenity":"pharmacy","name":"Аптека Субра"}},
 {"type":"way","center":{"lat":42.693,"lon":23.31},"tags":{"amenity":"hospital","name":"УМБАЛ „Александровска“"}},
 {"type":"way","center":{"lat":42.6958,"lon":23.3328},"tags":{"name":"Храм-паметник „Св. Александър Невски“","tourism":"attraction"}},
 {"type":"node","lat":42.7,"lon":23.31,"tags":{"name":"Decathlon","shop":"sports"}},
 {"type":"node","lat":42.696,"lon":23.322,"tags":{"amenity":"drinking_water"}},
 {"type":"way","center":{"lat":42.686,"lon":23.322},"tags":{"name":"Басейн Спартак","leisure":"swimming_pool"}}]}

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
            if "overpass" in u: return await r.fulfill(json=OVERPASS)
            if "api.github.com" in u: return await r.fulfill(json={"tag_name":"v1.0.12","body":"### Какво ново\n- Тест\n\nminNative: 11","assets":[{"name":"web.zip","browser_download_url":"https://x/web.zip"}]})
            if "openfoodfacts" in u:
                if "5449000000996" in u: return await r.fulfill(json={"status":1,"product":{"code":"5449000000996","product_name":"Протеинов шейк","brands":"Тест","allergens_tags":["en:milk"],"traces_tags":["en:soybeans"],"ingredients_text":"обезмаслено мляко, суроватъчен протеин, какао, E407, E955","nutriscore_grade":"a","nova_group":4,"additives_tags":["en:e407","en:e955"],"nutriments":{"energy-kcal_100g":60,"fat_100g":0.5,"saturated-fat_100g":0.3,"sugars_100g":3,"salt_100g":0.2,"proteins_100g":10,"fiber_100g":1},"serving_quantity":330}})
                return await r.fulfill(json={"status":0})
            if "nominatim" in u: return await r.fulfill(json=[{"lat":"42.69","lon":"23.32"}])
            if u.startswith("file://"): return await r.continue_()
            return await r.abort()
        await page.route("**/*", route)
        if native: await page.add_init_script(FAKE_CAP)
        await page.goto(URL)
        await page.wait_for_timeout(800)
        # онбординг
        await page.click("#csOk")
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
        await step("live: start from today", 'show("today"); const g=document.querySelector("#liveGo"); if(g){ g.click(); } else { document.querySelector("#quickGo").click(); document.querySelector("#qGo").click(); } document.querySelector("#rcSkip").click()')
        for i in range(3):
            await step(f"live: set {i+1}", 'document.querySelector("#lvStart").click(); document.querySelector("[data-kg=\'2.5\']") && document.querySelector("[data-kg=\'2.5\']").click(); document.querySelector("#lvEnd").click(); document.querySelector("#lvSkipRest") && document.querySelector("#lvSkipRest").click()')
        await step("live: switch machine", 'document.querySelectorAll("[data-lx]")[1].click()')
        await step("live: add machine sheet", 'document.querySelector("#lvAdd").click(); document.querySelector("#amNew").click(); document.querySelector("#nmN").value="Хак клек"; document.querySelector("#nmOk").click()')
        await step("live: set on new machine", 'document.querySelector("#lvStart").click(); document.querySelector("#lvEnd").click()')
        await step("live: edit set", 'document.querySelector("[data-ed]").click(); document.querySelector("#esR").value="11"; document.querySelector("#esOk").click()')
        await step("live: pause/resume", 'document.querySelector("#lvSkipRest") && document.querySelector("#lvSkipRest").click(); document.querySelector("#lvPause").click(); document.querySelector("#lvResume").click()')
        live = await page.evaluate('(()=>{const s=liveSession(); return s?FITCore.summary(s).sets+" серии, "+s.exercises.length+" уреда, state "+s.state:"няма"})()')
        steps.append("ok   ↳ live: "+live)
        await step("live: finish", 'document.querySelector("#lvFinish").click()')
        done = await page.evaluate('(()=>{const p=P(); return (p.log[todayISO()]||{}).complete+" | сесии "+p.wk.sessions.length+" | активна "+p.wk.activeId})()')
        steps.append("ok   ↳ след край: "+done)
        await step("quick sheet", 'show("live"); document.querySelector("#lvQuick").click(); document.querySelector("[data-mn=\'20\']").click()')
        await step("recovery light", 'closeSheet(); recoverySheet(l=>window.__load=l); document.querySelector("[data-en=\'2\']").click(); document.querySelector("#rcGo").click(); document.querySelector("#rcLight").click()')
        await step("missed: reschedule", 'const p=P(); p.start="2026-01-01"; missedSheet("2026-11-02"); document.querySelector("#msRe").click(); document.querySelector("[data-rs=work]").click(); document.querySelector("#msWhen").value="2026-11-04T18:00"; document.querySelector("#msWhen").dispatchEvent(new Event("change")); document.querySelector("#msOk").click()')
        ms = await page.evaluate('JSON.stringify({skip:P().log["2026-11-02"].skip.reason, res:P().resched})')
        steps.append("ok   ↳ missed: "+ms)
        await step("missed: injury no gym", 'missedSheet("2026-10-30"); document.querySelector("#msSkip").click(); document.querySelector("[data-rs=injury]").click(); if(document.querySelector("[data-alt=gym]")) throw new Error("gym offered for injury")')
        await step("path: card + 6 months", 'show("plan"); document.querySelector("[data-ph=\'6\']").click()')
        pc = await page.evaluate('document.querySelector("#pathCard").innerText.split("\\n").slice(0,3).join(" | ")')
        steps.append("ok   ↳ path: "+pc)
        await step("path: change goal (G)", 'document.querySelector("#pathGoal").click(); document.querySelector("[data-ng=strength]").click(); document.querySelector("#ngOk").click()')
        gr = await page.evaluate('JSON.stringify({goals:P().goals, rev:P().path.revisions.length})')
        steps.append("ok   ↳ path goal: "+gr)
        await step("privacy sheet", 'openDrawer(); document.querySelector("[data-dr=\'x:privacy\']").click(); document.querySelector("[data-cs=loc]").click(); document.querySelector("#qFrom").value="23:00"; document.querySelector("#pvOk").click()')
        pv = await page.evaluate('(async()=>JSON.stringify({loc:S.consent.loc, quiet:S.quiet.from, pos: await myPosition()}))()')
        steps.append("ok   ↳ privacy: "+pv)
        await step("privacy restore", 'S.consent.loc=true; save()')
        await step("export data", 'exportData()')
        await step("delete sheet opens", 'deleteSheet(); document.querySelector("#dlTxt").value="не"; document.querySelector("#dlGo").click()')
        await step("food: open + milk allergy", 'P().allergies=["soy"]; show("food"); document.querySelector("[data-fa=milk]").click()')
        await step("food: barcode lookup", 'gotBarcode("5449000000996")'); await page.wait_for_timeout(600)
        fd = await page.evaluate('JSON.stringify({al:FOOD_CUR.res.allergy.level, contains:FOOD_CUR.res.allergy.contains, nut:FOOD_CUR.res.nutrition.overall, add:FOOD_CUR.res.additives.map(a=>a.code+":"+a.level), nova:FOOD_CUR.res.processing.group})')
        steps.append("ok   ↳ food D: "+fd)
        await step("food: confirm", 'document.querySelector("#fdOk").click()')
        await step("food: not found", 'gotBarcode("96385074")'); await page.wait_for_timeout(500)
        nf = await page.evaluate('FOOD_ERR')
        steps.append("ok   ↳ food notfound: "+nf)
        await step("food: invalid code", 'gotBarcode("123")')
        await step("food: manual ingredients", 'manualIngredients(); document.querySelector("#miT").value="брашно, захар. Може да съдържа следи от сусам."; document.querySelector("#miOk").click()')
        await step("food: history reopen", 'show("food"); document.querySelector("[data-fh]").click()')
        await step("food: mama card", 'show("mama"); document.querySelector(".food-cta").click()')
        await step("watch: start plan from watch", 'if(liveSession()) liveDo({type:"CANCEL_WORKOUT"}); onWatchAction(JSON.stringify({opId:"w1",type:"START_PLAN",at:new Date().toISOString()}))')
        await step("watch: set with HR + duplicates", '''const s=liveSession(); const q=[{opId:"w2",type:"START_SET",setId:"ws1",weightKg:40,reps:10,at:"2019-01-01T00:00:00Z"},{opId:"w3",type:"COMPLETE_SET",setId:"ws1",reps:9,weightKg:42.5,source:"wearable",hrAvg:131}]; q.concat(q).forEach(a=>onWatchAction(JSON.stringify(a)));''')
        await step("watch: switch + skip rest", 'const s=liveSession(); onWatchAction(JSON.stringify({opId:"w4",type:"SKIP_REST"})); onWatchAction(JSON.stringify({opId:"w5",type:"SWITCH_EXERCISE",exerciseId:s.exercises[1].id}))')
        ws = await page.evaluate('(()=>{ const s=liveSession(); const st=watchState(); return JSON.stringify({sets:FITCore.completedSets(s).length, hr:s.sets[0].hrAvg, src:s.sets[0].source, kg:s.sets[0].weightKg, cur:st.cur===s.exercises[1].id, acks:st.acks.length}); })()')
        steps.append("ok   ↳ watch: "+ws)
        await step("lead: auto-advance after last set", 'const s=liveSession(); const e=s.exercises.find(x=>x.id===s.activeExerciseId); const need=e.targetSets-FITCore.completedSets(s,e.id).length; for(let i=0;i<need;i++){ onWatchAction(JSON.stringify({opId:"na"+i,type:"START_SET",setId:"nas"+i,weightKg:20,reps:10})); onWatchAction(JSON.stringify({opId:"nb"+i,type:"COMPLETE_SET",setId:"nas"+i,reps:10,weightKg:20,source:"notification"})); } window.__prevEx=e.id;')
        la = await page.evaluate('(()=>{ const s=liveSession(); return JSON.stringify({moved:s.activeExerciseId!==window.__prevEx, src:s.sets.at(-1).source}); })()')
        steps.append("ok   ↳ watch lead: "+la)
        await step("watch: end from watch", 'onWatchAction(JSON.stringify({opId:"w6",type:"END_WORKOUT"})); closeSheet()')
        we = await page.evaluate('JSON.stringify({active:!!liveSession(), state:watchState().active, done:(P().log[todayISO()]||{}).complete})')
        steps.append("ok   ↳ watch end: "+we)
        await step("watch sheet", 'watchSheet()')
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
        await step("guide open", 'show("guide")'); await page.wait_for_timeout(1500)
        await step("guide filter", 'document.querySelector("[data-gf=park]").click()')
        await step("guide radius", 'const s=document.querySelector("#gdRad"); s.value="5"; s.dispatchEvent(new Event("change"))'); await page.wait_for_timeout(1200)
        await step("guide nav", 'show("guide"); const b=document.querySelector("[data-gnav]"); b&&b.click()')
        await step("guide today card", 'show("today"); document.querySelector(".guide-cta").click()')
        await step("check updates", 'BUILD=10; checkUpdates(true)'); await page.wait_for_timeout(800)
        await step("drawer version", 'openDrawer()')
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
        print("\n".join(s for s in steps if "↳" in s and ("live" in s or "missed" in s or "след" in s or "path" in s or "privacy" in s or "food" in s or "watch" in s)))
        print("грешки на страницата:", errs or "няма")
        print("console errors:", [l for l in logs if "ERR_FAILED" not in l and "net::" not in l][:10] or "няма")
        print("хоризонтален скрол:", ov)
        if native: print("плъгини:", sorted(set(calls)))
asyncio.run(main())
