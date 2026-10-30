/* ============ ЗАВЕДЕНИЯ — ЗДРАВОСЛОВНО, С РЕЗЕРВАЦИЯ В REZZO ============ */
const VENUES = [
  {n:"Vita Rama Plant-based Restaurant",area:"Център, ул. Д-р Петър Берон 9",cat:"Растително",tags:["Веган","Без глутен опции","Алергени в менюто"],q:"Vita Rama Plant-based Restaurant София"},
  {n:"Veda House",area:"Център, ул. Уилям Гладстон 2",cat:"Вегетарианско",tags:["Вегетарианско","Чайове"],q:"Veda House София"},
  {n:"SATSANGA",area:"Център, ул. Георги Бенковски 8",cat:"Вегетарианско",tags:["Веган бюфет","По тегло"],q:"SATSANGA Vegetarian Restaurant София"},
  {n:"Kring — вегетариански бюфет",area:"Център, ул. Цар Симеон 72",cat:"Вегетарианско",tags:["Бюфет по тегло","Салатен бар"],q:"Kring Restaurant София"},
  {n:"Simple Food Punkt",area:"Център, ул. Уилям Гладстон 18",cat:"Домашно",tags:["Бюфет по тегло","Ново меню всеки ден"],q:"Simple Food Punkt София"},
  {n:"BLUE TASTE POKE",area:"бул. Витоша 14",cat:"Поке и протеин",tags:["Поке","Сьомга и пиле","Голям протеин"],q:"BLUE TASTE POKE София"},
  {n:"PokeMe",area:"Манастирски ливади, ул. Пирин 79а",cat:"Поке и протеин",tags:["Поке","Доставка"],q:"PokeMe София"},
  {n:"Fresh up Batenberg",area:"Център, ул. Княз Александър I 6А",cat:"Сандвичи и смути",tags:["Здравословно","Фреш","От 6:30"],q:"Fresh up Batenberg София"},
  {n:"Healthy Corner",area:"Център, ул. Леге 10",cat:"Сандвичи и смути",tags:["Смути","Фреш"],q:"Healthy Corner Леге София"},
  {n:"Beyond Brkfst",area:"Център, ул. Петър Парчевич 50",cat:"Закуска и бранч",tags:["Яйца","Омлети","Смути"],q:"Beyond Brkfst София"},
  {n:"Izzy's Coffee and Brunch",area:"бул. Княгиня Мария Луиза 17",cat:"Закуска и бранч",tags:["Яйца","Фреш"],q:"Izzy's Coffee and Brunch София"},
  {n:"Wonderland Brunch",area:"Център, ул. Петър Парчевич 26",cat:"Закуска и бранч",tags:["Чиа пудинг","Смути"],q:"Wonderland Brunch Cake София"},
  {n:"718 Breakfast & Brunch",area:"ул. Княз Борис I 99",cat:"Закуска и бранч",tags:["Бейгъли","Кафе"],q:"718 Breakfast Brunch София"}
];
const REZZO_CITY={"София":"sofia","Пловдив":"plovdiv","Варна":"varna","Бургас":"burgas","Банско":"bansko","Велико Търново":"veliko-tarnovo","Русе":"ruse","Стара Загора":"stara-zagora"};
function rezzoCity(){ return REZZO_CITY[cityOf()[0]]||"sofia"; }
function rezzoName(n){ return "https://rezzo.bg/sofia/search?rest_name="+encodeURIComponent(n.split(" — ")[0])+"&h=all&show_all=true"; }
function rezzoAll(){ return "https://rezzo.bg/"+rezzoCity()+"/search?h=all"; }
let venueF="all";
function venuesHTML(){
  const cats=["all",...new Set(VENUES.map(v=>v.cat))];
  const list=VENUES.filter(v=>venueF==="all"||v.cat===venueF);
  return `<div class="card" style="border-color:var(--accent)"><p class="eyebrow" style="margin:0">Заведения за активни хора</p>
    <p class="muted" style="margin:0">Подбрани места с отлични отзиви от посетителите — с храна, която пасва на тренировките: протеин, зеленчуци, растителни и леки менюта. Резервираш директно през Rezzo.</p>
    <a class="btn sm" href="${rezzoAll()}" target="_blank" rel="noopener">Всички заведения в Rezzo · ${esc(cityOf()[0])}</a></div>
  <div class="chips">${cats.map(c=>`<button class="chip" type="button" data-vf="${esc(c)}" aria-pressed="${venueF===c}">${c==="all"?"Всички":esc(c)}</button>`).join("")}</div>
  ${list.map(v=>`<div class="card"><div style="min-width:0"><p class="eyebrow" style="margin:0">${esc(v.cat)}</p><h2 class="h2">${esc(v.n)}</h2><div class="ex-meta">${esc(v.area)}</div></div>
    <div class="chips">${v.tags.map(t=>`<span class="pill accent">${esc(t)}</span>`).join("")}</div>
    <div class="row"><a class="btn sm" href="${rezzoName(v.n)}" target="_blank" rel="noopener">Резервирай в Rezzo</a><button class="btn ghost sm" type="button" data-nav="${esc(v.n)}|${esc(v.q)}">Как да стигна</button><a class="btn ghost sm" href="${MAPS(v.q)}" target="_blank" rel="noopener">Меню и часове</a></div></div>`).join("")}
  <p class="note">Ако заведението не е в Rezzo, търсенето ще е празно — тогава резервирай по телефона от „Меню и часове“.</p>`;
}
function afterWorkoutVenue(){
  const pick=VENUES.filter(v=>/Поке|Растително|Вегетарианско|Домашно/.test(v.cat));
  const v=pick[new Date().getDate()%pick.length];
  setTimeout(()=>{ if($("#sheetHost").innerHTML) return; sheet(`<div class="grab"></div><p class="eyebrow">След тренировката</p>
    <div class="h-display">Време за протеин и зеленчуци</div>
    <p style="margin:0">В следващите 2 часа хапни протеин и въглехидрати. Идея: <b>${esc(v.n)}</b> — ${esc(v.area)}.</p>
    <div class="grid2"><a class="btn hot" href="${rezzoName(v.n)}" target="_blank" rel="noopener">Резервирай в Rezzo</a><button class="btn" type="button" data-nav="${esc(v.n)}|${esc(v.q)}">Как да стигна</button>
    <button class="btn ghost" type="button" data-go="mama">Сготви с MAMA</button><button class="btn ghost" data-close type="button">По-късно</button></div>`,h=>h.querySelectorAll("[data-close]").forEach(x=>x.onclick=closeSheet)); dropSound(); }, 2200);
}
