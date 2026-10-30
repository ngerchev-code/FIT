/* ============ ВРЕМЕ, ФИТНЕСИ, ДОБАВКИ ============ */
const CITIES = [["София",42.6977,23.3219],["Пловдив",42.1354,24.7453],["Варна",43.2141,27.9147],["Бургас",42.5048,27.4626],["Русе",43.8356,25.9657],["Стара Загора",42.4258,25.6345],["Плевен",43.417,24.6067],["Шумен",43.2712,26.9361],["Велико Търново",43.0757,25.6172],["Благоевград",42.0209,23.0943],["Враца",43.2102,23.5529],["Габрово",42.8742,25.3187],["Добрич",43.5726,27.8273],["Търговище",43.2512,26.5722],["Силистра",44.1171,27.2606],["Банско",41.8383,23.4885],["Боровец",42.2668,23.6060],["Пампорово",41.6553,24.6922]];
const WMO = {0:"Ясно",1:"Предимно ясно",2:"Разкъсана облачност",3:"Облачно",45:"Мъгла",48:"Мъгла със скреж",51:"Слаб ръмеж",53:"Ръмеж",55:"Силен ръмеж",56:"Леден ръмеж",57:"Силен леден ръмеж",61:"Слаб дъжд",63:"Дъжд",65:"Силен дъжд",66:"Леден дъжд",67:"Силен леден дъжд",71:"Слаб сняг",73:"Сняг",75:"Силен сняг",77:"Снежни зърна",80:"Слаби превалявания",81:"Превалявания",82:"Силни превалявания",85:"Снеговалеж",86:"Силен снеговалеж",95:"Гръмотевична буря",96:"Буря с градушка",99:"Силна буря с градушка"};
let WX=null, WXbusy=false, WXerr="", WXat=0;
function cityOf(){ const n=(S.city)||"София"; return CITIES.find(c=>c[0]===n)||CITIES[0]; }
async function loadWeather(force){
  if(WXbusy || (!force && WX && Date.now()-WXat<30*60e3)) return;
  const [name,lat,lon]=cityOf(); WXbusy=true; WXerr="";
  try{
    const u=`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,wind_gusts_10m,uv_index,pressure_msl&hourly=temperature_2m,precipitation_probability,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,uv_index_max,sunrise,sunset,wind_speed_10m_max&timezone=Europe%2FSofia&forecast_days=7`;
    const a=`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=pm10,pm2_5,european_aqi`;
    const [w,q]=await Promise.all([fetch(u).then(r=>r.json()), fetch(a).then(r=>r.json()).catch(()=>null)]);
    if(!w||!w.current) throw new Error("no data");
    WX={city:name,w,q:q&&q.current?q.current:null}; WXat=Date.now();
  }catch(e){ WXerr = NATIVE ? "Няма връзка с прогнозата. Провери интернета и опитай пак." : "Подробното време работи в приложението FIT за Android."; }
  WXbusy=false;
  if(TAB==="world"&&worldSeg==="weather") rWorld(); else if(TAB==="today") rToday();
}
function aqiText(v){ if(v==null) return ["—",""]; if(v<=20) return ["Отличен","good"]; if(v<=40) return ["Добър","good"]; if(v<=60) return ["Умерен","accent"]; if(v<=80) return ["Лош","hot"]; return ["Много лош","hot"]; }
function trainAdvice(){
  if(!WX) return "";
  const c=WX.w.current, t=c.apparent_temperature, uv=c.uv_index||0, wind=c.wind_gusts_10m||0, code=c.weather_code, aq=WX.q?WX.q.european_aqi:null;
  const tips=[];
  if(code>=95) tips.push("Буря — тренирай вътре.");
  else if(code>=61&&code<=82) tips.push("Вали — днес залата е по-добрият избор.");
  if(t>=30) tips.push("Горещо: тренирай рано сутрин или вечер, пий 500 мл вода повече и добави електролити.");
  else if(t<=0) tips.push("Студено: загрявай 10 мин вътре, облечи се на пластове, пази дланите и ушите.");
  else if(t>=12&&t<=24&&code<61) tips.push("Отлично време за бягане или разходка навън след залата.");
  if(uv>=6) tips.push("Висок UV индекс — слънцезащита и шапка, ако си навън между 11 и 16 ч.");
  if(wind>=50) tips.push("Силни пориви на вятъра — избягвай колело и планина днес.");
  if(aq!=null&&aq>60) tips.push("Въздухът е замърсен — тренирай на закрито.");
  return tips.join(" ")||"Нормални условия — тренирай по план.";
}
function hhmm(iso){ return iso? iso.slice(11,16):""; }
function weatherMini(){
  if(!WX) return `<div class="card"><p class="eyebrow">Време · ${esc(cityOf()[0])}</p><p class="muted" style="margin:0">${WXerr?esc(WXerr):"Зареждам прогнозата…"}</p></div>`;
  const c=WX.w.current, d=WX.w.daily;
  return `<button class="card" data-go="world" id="wxMini" type="button" style="text-align:left;cursor:pointer">
    <div class="row" style="justify-content:space-between"><p class="eyebrow" style="margin:0">Време · ${esc(WX.city)}</p><span class="pill accent">${esc(WMO[c.weather_code]||"")}</span></div>
    <div class="row" style="gap:14px"><span class="mono" style="font-size:34px;font-weight:700">${Math.round(c.temperature_2m)}°</span>
    <span class="muted" style="font-size:13px">усеща се ${Math.round(c.apparent_temperature)}° · макс ${Math.round(d.temperature_2m_max[0])}° / мин ${Math.round(d.temperature_2m_min[0])}° · дъжд ${d.precipitation_probability_max[0]??0}%</span></div>
    <p style="margin:0;font-size:13px">${esc(trainAdvice())}</p></button>`;
}
function weatherHTML(){
  const sel=`<label class="f">Град<select class="in" id="wxCity">${CITIES.map(c=>`<option ${c[0]===cityOf()[0]?"selected":""}>${c[0]}</option>`).join("")}</select></label>`;
  if(!WX) return `<div class="card">${sel}<p class="muted" style="margin:0">${WXbusy?"Зареждам прогнозата…":esc(WXerr||"Зареждам прогнозата…")}</p>${WXerr?`<button class="btn ghost sm" id="wxRetry" type="button">Опитай пак</button>`:""}</div>`;
  const c=WX.w.current, d=WX.w.daily, h=WX.w.hourly; const [aq,aqc]=aqiText(WX.q?WX.q.european_aqi:null);
  const nowIdx=Math.max(0,h.time.findIndex(t=>t.slice(0,13)>=new Date().toISOString().slice(0,13)));
  const hours=h.time.slice(nowIdx,nowIdx+24).map((t,i)=>{ const j=nowIdx+i; return `<div style="flex:0 0 auto;min-width:58px;text-align:center;padding:8px 4px;border:1px solid var(--line);border-radius:12px;background:var(--surface-2)"><div class="mono" style="font-size:11px;color:var(--muted)">${hhmm(t)}</div><div class="mono" style="font-weight:700;font-size:16px">${Math.round(h.temperature_2m[j])}°</div><div style="font-size:11px;color:var(--accent);font-weight:800">${h.precipitation_probability[j]??0}%</div><div style="font-size:10px;color:var(--muted)">${Math.round(h.wind_speed_10m[j])} км/ч</div></div>`; }).join("");
  const days=d.time.map((t,i)=>`<div class="ex"><div class="num" style="width:auto;border-radius:8px;padding:0 6px">${i===0?"Днес":new Date(t+"T00:00:00").toLocaleDateString("bg-BG",{weekday:"short"})}</div><div style="min-width:0"><div class="ex-name">${esc(WMO[d.weather_code[i]]||"")}</div><div class="ex-meta">дъжд ${d.precipitation_probability_max[i]??0}% · ${d.precipitation_sum[i]??0} мм · вятър до ${Math.round(d.wind_speed_10m_max[i])} км/ч · UV ${Math.round(d.uv_index_max[i]??0)}</div></div><span class="mono" style="font-weight:700">${Math.round(d.temperature_2m_max[i])}° / ${Math.round(d.temperature_2m_min[i])}°</span></div>`).join("");
  return `<div class="card">${sel}
    <div class="row" style="justify-content:space-between;align-items:flex-end"><div><div class="mono" style="font-size:52px;font-weight:700;line-height:1">${Math.round(c.temperature_2m)}°</div><div class="muted">${esc(WMO[c.weather_code]||"")} · усеща се ${Math.round(c.apparent_temperature)}°</div></div>
    <span class="pill ${aqc}">Въздух: ${aq}</span></div>
    <div class="grid2">
      <div><b class="mono">${c.relative_humidity_2m}%</b><div class="ex-meta">влажност</div></div>
      <div><b class="mono">${Math.round(c.wind_speed_10m)} км/ч</b><div class="ex-meta">вятър, пориви ${Math.round(c.wind_gusts_10m)} км/ч</div></div>
      <div><b class="mono">${Math.round(c.uv_index??0)}</b><div class="ex-meta">UV индекс сега</div></div>
      <div><b class="mono">${Math.round(c.pressure_msl)} hPa</b><div class="ex-meta">налягане</div></div>
      <div><b class="mono">${hhmm(d.sunrise[0])} / ${hhmm(d.sunset[0])}</b><div class="ex-meta">изгрев / залез</div></div>
      <div><b class="mono">${WX.q?Math.round(WX.q.pm2_5):"—"} / ${WX.q?Math.round(WX.q.pm10):"—"}</b><div class="ex-meta">ФПЧ 2,5 / 10 µg/m³</div></div>
    </div>
    <div class="card" style="background:var(--surface-2);gap:4px"><p class="eyebrow" style="margin:0">Съвет за тренировката</p><p style="margin:0">${esc(trainAdvice())}</p></div>
  </div>
  <div class="card"><p class="eyebrow">Следващите 24 часа</p><div style="display:flex;gap:6px;overflow-x:auto;padding-bottom:4px">${hours}</div><p class="note" style="margin:0">Синьото е вероятност за валеж.</p></div>
  <div class="card"><p class="eyebrow">7 дни</p><div>${days}</div></div>
  <p class="note">Данни: Open-Meteo (на базата на националните метеорологични модели), обновяват се на всеки 30 минути.</p>`;
}

/* ---------- ФИТНЕСИ ---------- */
const MAPS = q => "https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(q);
const GYMS = [
  {n:"Pulse Fitness & Spa", area:"13 клуба в София", tags:["Спа и сауна","Басейн в някои клубове","24/7 в някои клубове","Групови","HYROX клуб"], cards:"Основен партньор на Coolfit", web:"https://pulsefit.bg", q:"Pulse Fitness & Spa София", note:"Най-голямата премиум верига. Еднократна такса при записване."},
  {n:"Next Level Fitness", area:"няколко клуба (НДК, Младост 4 и др.)", tags:["Technogym","24/7 в някои клубове","Сауна в някои клубове","Без договор"], cards:"Провери в MultiSport", web:"https://www.nextlevelclub.bg", q:"Next Level Fitness София", note:"Добро съотношение цена/качество, удобни локации."},
  {n:"Fit Factory 24/7", area:"Стрелбище", tags:["24/7","Платформа за мъртва тяга","Дъмбели до 50 кг","Сауна"], cards:"Провери в MultiSport / Coolfit", q:"Fit Factory 24/7 София", note:"Силова зала с много свободни тежести."},
  {n:"The Red Gym", area:"Стрелбище", tags:["Паркинг","Групови","Релакс зона"], cards:"Провери в MultiSport / Coolfit", q:"The Red Gym София", note:"Голяма зала с групови занимания."},
  {n:"Movement Academy Gym 24/7", area:"Южен парк", tags:["24/7","Функционални тренировки","Подходящ при болки в гърба"], cards:"Провери в MultiSport / Coolfit", q:"Movement Academy Gym София", note:"Фокус върху правилно движение — добър старт за новаци."},
  {n:"Silver Gym", area:"Център, ул. Гладстон", tags:["Еднодневна карта","Малка уютна зала"], cards:"Провери на място", q:"Silver Gym София Гладстон", note:"Удобен в центъра, с карти за ден и седмица."},
  {n:"Smartass", area:"бул. България, БЦ Вертиго", tags:["Групови","Barre","Премиум съблекални"], cards:"Провери в MultiSport / Coolfit", q:"Smartass София", note:"Групови тренировки с модерна атмосфера."},
  {n:"Faery — фитнес за жени", area:"Петте кьошета", tags:["Само за жени","Треньор на място"], cards:"Провери на място", q:"Women fitness club Faery София", note:"Индивидуален подход и постоянен треньор."}
];
function gymsHTML(){
  const p=P(); const n=p.gymNotes||{};
  return `<div class="grid2 stack">
    <div class="card"><p class="eyebrow">MultiSport</p><b>Над 1000 обекта в България</b><p class="ex-meta" style="margin:0">Корпоративна карта от работодателя. Провери кои зали я приемат и колко посещения дават.</p><a class="btn ghost sm" href="https://benefitsystems.bg" target="_blank" rel="noopener">Търси обекти</a></div>
    <div class="card"><p class="eyebrow">Coolfit</p><b>Фитнеси, басейни, масажи, групови</b><p class="ex-meta" style="margin:0">Дигитална карта; Pulse Fitness & Spa е основният партньор. Има отстъпки в магазини и хотели.</p><a class="btn ghost sm" href="https://coolfit.bg/home" target="_blank" rel="noopener">Виж Coolfit</a></div>
  </div>
  ${GYMS.map((g,i)=>{ const my=n[i]||{}; return `<div class="card">
    <div class="row" style="justify-content:space-between;align-items:flex-start"><div style="min-width:0"><h2 class="h2">${esc(g.n)}</h2><div class="ex-meta">${esc(g.area)}</div></div><span class="pill ${g.cards.startsWith("Основен")?"good":"accent"}">${esc(g.cards)}</span></div>
    <div class="chips">${g.tags.map(t=>`<span class="pill accent">${esc(t)}</span>`).join("")}</div>
    <p style="margin:0">${esc(g.note)}</p>
    ${my.price||my.card||my.parking?`<div class="card" style="background:var(--surface-2);gap:4px"><p class="eyebrow" style="margin:0">Моите бележки</p><div class="ex-meta">${my.price?"Цена: "+esc(my.price)+" · ":""}${my.card?"Карта: "+esc(my.card)+" · ":""}${my.parking?"Паркинг: "+esc(my.parking):""}</div></div>`:""}
    <div class="row"><a class="btn sm" href="${MAPS(g.q)}" target="_blank" rel="noopener">Карта, часове и паркинг</a>${g.web?`<a class="btn ghost sm" href="${g.web}" target="_blank" rel="noopener">Сайт и цени</a>`:""}<button class="btn ghost sm" type="button" data-gnote="${i}">Бележка</button></div>
  </div>`; }).join("")}
  <p class="note">Цените и условията се променят често — провери ги на сайта или на рецепция и си запиши бележка. Пиши ни зала, която липсва.</p>`;
}
function gymNoteSheet(i){
  const p=P(); p.gymNotes=p.gymNotes||{}; const my=p.gymNotes[i]||{};
  sheet(`<div class="grab"></div><p class="eyebrow">Бележка</p><div class="h2">${esc(GYMS[i].n)}</div>
    <label class="f">Цена (напр. 60 € на месец)<input class="in" id="gn-price" value="${esc(my.price||"")}"></label>
    <label class="f">Приема карта<input class="in" id="gn-card" value="${esc(my.card||"")}" placeholder="MultiSport, Coolfit, не"></label>
    <label class="f">Паркинг<input class="in" id="gn-park" value="${esc(my.parking||"")}" placeholder="безплатен, платен, няма"></label>
    <button class="btn block" id="gn-ok" type="button">Запази</button>`,()=>{
      $("#gn-ok").onclick=()=>{ p.gymNotes[i]={price:$("#gn-price").value.trim().slice(0,40),card:$("#gn-card").value.trim().slice(0,40),parking:$("#gn-park").value.trim().slice(0,40)}; save(); closeSheet(); rWorld(); toast("Запазено","Бележката е при зала "+GYMS[i].n+"."); };
  });
}

/* ---------- ДОБАВКИ, ВЕЩЕСТВА, АЛЕРГЕНИ ---------- */
const ALLERGENS = {milk:"Мляко / лактоза", soy:"Соя", gluten:"Глутен", egg:"Яйца", nuts:"Ядки", peanut:"Фъстъци", fish:"Риба", shell:"Ракообразни", caffeine:"Чувствителност към кофеин"};
// lvl: ok | care | danger
const SUBST = [
  {n:"Вода",when:["pre","during","post"],lvl:"ok",why:"Основата на всичко — дори 2% обезводняване намалява силата.",dose:"400–500 мл 1–2 ч преди, 150–250 мл на 15–20 мин по време.",al:[]},
  {n:"Електролити (натрий, калий, магнезий)",when:["during"],lvl:"ok",why:"При тренировка над 60 мин, жега или силно потене.",dose:"По етикета, разтворени във вода.",al:[]},
  {n:"Суроватъчен протеин (whey)",when:["post"],lvl:"ok",why:"Удобен начин да стигнеш дневния протеин.",dose:"20–40 г след тренировка или към хранене.",care:"При алергия към мляко — растителен протеин.",al:["milk"]},
  {n:"Изолат на суроватка",when:["post"],lvl:"ok",why:"Почти без лактоза — по-лесен за стомаха.",dose:"20–40 г.",al:["milk"]},
  {n:"Растителен протеин (грах, ориз)",when:["post"],lvl:"ok",why:"Без мляко — за вегетарианци и при алергия.",dose:"25–40 г.",al:[]},
  {n:"Соев протеин",when:["post"],lvl:"ok",why:"Пълноценен растителен протеин.",dose:"25–40 г.",al:["soy"]},
  {n:"Яйчен протеин",when:["post"],lvl:"ok",why:"Без мляко, пълноценен.",dose:"25–40 г.",al:["egg"]},
  {n:"Казеин",when:["post"],lvl:"ok",why:"Бавен протеин, удобен вечер.",dose:"25–40 г преди сън.",al:["milk"]},
  {n:"Креатин монохидрат",when:["daily"],lvl:"ok",why:"Най-изследваната добавка за сила и мускулна маса.",dose:"3–5 г дневно, всеки ден, по всяко време.",care:"При бъбречно заболяване — само след лекар. Пий достатъчно вода.",al:[]},
  {n:"Кофеин / кафе",when:["pre"],lvl:"care",why:"Повече енергия и фокус.",dose:"До 3 мг/кг 30–60 мин преди; общо до 400 мг на ден за здрав възрастен.",care:"Не след 16 ч (сън). Не при високо кръвно, аритмия, бременност, под 18 г.",al:["caffeine"]},
  {n:"Пре-уоркаут (комплекс)",when:["pre"],lvl:"care",why:"Кофеин + цитрулин + бета-аланин.",dose:"Половин доза първия път; следи кофеина на етикета.",care:"Изтръпване от бета-аланина е безвредно. Избягвай продукти без ясни количества („proprietary blend“).",al:["caffeine"]},
  {n:"L-цитрулин",when:["pre"],lvl:"ok",why:"Помпа и издръжливост.",dose:"6–8 г 30–60 мин преди.",al:[]},
  {n:"Бета-аланин",when:["daily"],lvl:"ok",why:"Издръжливост при серии 1–4 мин.",dose:"3,2–6,4 г дневно, разделени.",care:"Изтръпване на кожата — нормално и безвредно.",al:[]},
  {n:"Магнезий",when:["daily"],lvl:"ok",why:"Мускули, сън, срещу крампи.",dose:"200–350 мг вечер (глицинат или цитрат).",care:"Отделно с 2 ч от антибиотици (тетрациклини, хинолони).",al:[]},
  {n:"Витамин D3",when:["daily"],lvl:"care",why:"Кости, имунитет, мускули — особено есен и зима.",dose:"Обичайно 1000–2000 IU дневно; по-високо — само по изследване.",care:"Мастноразтворим — при свръхдоза се натрупва.",al:[]},
  {n:"Омега-3 (рибено масло)",when:["daily"],lvl:"ok",why:"Сърце, стави, възстановяване.",dose:"1–2 г EPA+DHA дневно с храна.",care:"При антикоагуланти — консултирай се с лекар.",al:["fish"]},
  {n:"Крил масло",when:["daily"],lvl:"ok",why:"Алтернатива на рибеното масло.",dose:"По етикета.",al:["shell"]},
  {n:"Протеинови барове",when:["post"],lvl:"ok",why:"Удобна закуска.",dose:"1 бар; гледай захарта.",al:["milk","soy","nuts","peanut","gluten"]},
  {n:"BCAA",when:["during"],lvl:"ok",why:"Излишни, ако ядеш достатъчно протеин.",dose:"По етикета.",al:[]},
  {n:"Енергийни напитки",when:["pre"],lvl:"care",why:"Много захар и кофеин.",dose:"Не повече от 1 на ден.",care:"Не ги комбинирай с пре-уоркаут или алкохол.",al:["caffeine"]},
  {n:"„Горители на мазнини“ със стимуланти",when:["pre"],lvl:"danger",why:"Често съдържат скрити стимуланти; рискове за сърцето.",care:"Не се препоръчват. Мазнините се горят с калориен дефицит и движение.",al:["caffeine"]},
  {n:"DMAA / DMHA",when:["pre"],lvl:"danger",why:"Забранени стимуланти — инсулти и инфаркти при млади хора.",care:"Опасно. Проверявай етикетите на пре-уоркаути от неясен произход.",al:[]},
  {n:"Ефедрин / ефедра",when:["pre"],lvl:"danger",why:"Сърдечни аритмии, високо кръвно.",care:"Опасно. Не използвай.",al:[]},
  {n:"Йохимбин (високи дози)",when:["pre"],lvl:"danger",why:"Тревожност, сърцебиене, скок на кръвното.",care:"Опасно. Не използвай без лекар.",al:[]},
  {n:"Кленбутерол",when:["pre"],lvl:"danger",why:"Не е разрешен за хора; увреждания на сърцето.",care:"Опасно и забранено.",al:[]},
  {n:"DNP",when:["pre"],lvl:"danger",why:"Отровно вещество, известни са смъртни случаи.",care:"Смъртно опасно. Никога.",al:[]},
  {n:"SARMs",when:["daily"],lvl:"danger",why:"Неодобрени лекарства — хормонални и чернодробни увреждания.",care:"Опасно. Не се продават законно като добавки.",al:[]},
  {n:"Анаболни стероиди",when:["daily"],lvl:"danger",why:"Сърце, черен дроб, хормони, психика.",care:"Опасно и незаконно без лекарско предписание.",al:[]}
];
const MEDS = [
  ["Лекарства за кръвно, сърце","Избягвай кофеин, пре-уоркаути и стимуланти без лекар."],
  ["Антикоагуланти (разреждащи кръвта)","Омега-3, витамин E и куркума засилват ефекта — питай лекаря."],
  ["Антибиотици (тетрациклини, хинолони)","Магнезий, калций, цинк и желязо — отделно с поне 2 ч."],
  ["Антидепресанти и лекарства за ADHD","Кофеин и стимуланти могат да вдигнат пулса и кръвното."],
  ["Обезболяващи (ибупрофен и др.)","Не ги пий редовно „за възстановяване“ — натоварват бъбреците и стомаха."],
  ["Бъбречно или чернодробно заболяване","Креатин, високопротеинов режим и добавки — само след лекар."],
  ["Диабет","Внимавай с енергийни напитки и гейнъри; следи кръвната захар около тренировка."]
];
let substF="all";
function substHTML(){
  const p=P(); p.allergies=p.allergies||[]; const A=p.allergies;
  const WH={all:"Всички",pre:"Преди",during:"По време",post:"След",daily:"Всеки ден",danger:"Опасни"};
  let list=SUBST.filter(s=> substF==="all"?true: substF==="danger"? s.lvl==="danger" : s.when.includes(substF) && s.lvl!=="danger");
  const minor=p.age<18, bp=p.limits.includes("bp");
  const LV={ok:["Безопасно","good"],care:["Внимание","accent"],danger:["ОПАСНО","hot"]};
  return `<div class="card"><p class="eyebrow">Моите алергии и чувствителности</p>
    <div class="chips">${Object.entries(ALLERGENS).map(([k,v])=>`<button class="chip" type="button" data-alg="${k}" aria-pressed="${A.includes(k)}">${v}</button>`).join("")}</div>
    <p class="note" style="margin:0">Продуктите със съставки, които си отбелязал, се маркират в червено навсякъде във FIT.</p></div>
  <div class="chips">${Object.entries(WH).map(([k,v])=>`<button class="chip" type="button" data-sf="${k}" aria-pressed="${substF===k}">${v}</button>`).join("")}</div>
  ${list.map(s=>{ const hit=s.al.filter(a=>A.includes(a)); const block=(minor&&(s.al.includes("caffeine")||/Креатин|Пре-уоркаут/.test(s.n))) || (bp&&s.al.includes("caffeine"));
    const lv = hit.length||block ? ["Не за теб","hot"] : LV[s.lvl];
    return `<div class="card" style="${s.lvl==="danger"||hit.length||block?"border-color:var(--hot)":""}">
    <div class="row" style="justify-content:space-between;align-items:flex-start"><h2 class="h2" style="min-width:0">${esc(s.n)}</h2><span class="pill ${lv[1]}">${lv[0]}</span></div>
    ${hit.length?`<p style="margin:0;color:var(--hot);font-weight:800">Съдържа: ${esc(hit.map(a=>ALLERGENS[a]).join(", "))} — ти си го отбелязал.</p>`:""}
    ${block?`<p style="margin:0;color:var(--hot);font-weight:800">${minor?"Не е за под 18 години.":"Не при високо кръвно."}</p>`:""}
    <p style="margin:0">${esc(s.why)}</p>
    ${s.dose&&s.lvl!=="danger"?`<div class="presc">${esc(s.dose)}</div>`:""}
    ${s.care?`<p class="note" style="margin:0"><b>${s.lvl==="danger"?"Предупреждение":"Внимание"}:</b> ${esc(s.care)}</p>`:""}
    <div class="ex-meta">${s.when.map(w=>WH[w]||"").join(" · ")}${s.al.length?" · алергени: "+s.al.map(a=>ALLERGENS[a]).join(", "):""}</div></div>`; }).join("")}
  <div class="card"><p class="eyebrow">Ако пиеш лекарства</p>${MEDS.map(m=>`<div class="ex"><div class="num">!</div><div style="min-width:0"><div class="ex-name">${esc(m[0])}</div><div class="ex-meta">${esc(m[1])}</div></div><span></span></div>`).join("")}
  <p class="note" style="margin:0">FIT дава обща информация, не лечение. Преди добавки при заболяване, лекарства или бременност — говори с лекар или фармацевт.</p></div>`;
}
