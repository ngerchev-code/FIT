/* FIT food core — 14-те алергена на ЕС, хранителни стойности, Е-кодове, степен на преработка.
   Разделя: (1) личен риск от алергени, (2) хранителна стойност, (3) добавки, (4) преработка.
   Чиста логика (браузър + Node тестове). Не поставя диагнози. */
(function (root) {
  "use strict";
  // ключ във FIT → таг в Open Food Facts + думи за разпознаване в съставка (BG/EN)
  const EU14 = {
    gluten:  { n: "Глутен (жито, ръж, ечемик, овес)", off: "en:gluten", rx: /пшени|жит|ръж|ечемик|овес|овес|спелт|глутен|брашно|грис|булгур|кус-кус|wheat|rye|barley|oat|spelt|gluten/i },
    shell:   { n: "Ракообразни", off: "en:crustaceans", rx: /скарид|(^|[^а-яё])раци?([^а-яё]|$)|омар|лангуст|crustacean|shrimp|prawn|crab|lobster/i },
    egg:     { n: "Яйца", off: "en:eggs", rx: /яйц|яйч|албумин|egg|albumin/i },
    fish:    { n: "Риба", off: "en:fish", rx: /риба|рибн|сьомг|(^|[^а-яё])тон([^а-яё]|$)|аншоа|скумри|fish|salmon|tuna|anchov/i },
    peanut:  { n: "Фъстъци", off: "en:peanuts", ex: /шам[ -]фъстъ\S*/gi, rx: /фъстък|фъстъч|фъстъц|арахис|peanut|groundnut/i },
    soy:     { n: "Соя", off: "en:soybeans", rx: /соя|соев|soy|soja/i },
    milk:    { n: "Мляко / лактоза", off: "en:milk", ex: /(какаов|кокосов|бадемов|овесен|соев|оризов|слънчогледов|растителн)\S*\s+(масло|мляко|сметана)|cocoa butter|shea butter|coconut (milk|cream)|(almond|oat|soy|rice) (milk|drink)|cream of tartar|млечна киселина|lactic acid/gi, rx: /мляко|млечн|сирен|кашкавал|извара|сметан|масло \(краве\)|краве масло|суроватк|казеин|лактоз|йогурт|кисело мляко|milk|whey|casein|lactose|cream|butter|cheese|yogurt/i },
    nuts:    { n: "Ядки (бадем, лешник, орех, кашу и др.)", off: "en:nuts", ex: /кокосов\S*\s+орех|мускатов\S*\s+орех|coconut|nutmeg/gi, rx: /бадем|лешник|орех|кашу|шам фъстък|пекан|макадамия|бразилск|almond|hazelnut|walnut|cashew|pistachio|pecan|macadamia/i },
    celery:  { n: "Целина", off: "en:celery", rx: /целин|celery|celeriac/i },
    mustard: { n: "Синап / горчица", off: "en:mustard", rx: /синап|горчиц|mustard/i },
    sesame:  { n: "Сусам", off: "en:sesame-seeds", rx: /сусам|тахан|sesame|tahini/i },
    sulph:   { n: "Серен диоксид и сулфити", off: "en:sulphur-dioxide-and-sulphites", rx: /сулфит|серен диоксид|e ?22[0-8]|sulphite|sulfite|sulphur dioxide/i },
    lupin:   { n: "Лупина", off: "en:lupin", rx: /лупин|lupin/i },
    mollusc: { n: "Мекотели", off: "en:molluscs", rx: /миди|калмар|октопод|сепия|стрид|охлюв|mollus|mussel|squid|octopus|oyster|clam/i }
  };

  /* Е-кодове: кратко, на база становища на EFSA/IARC/регламенти. green = без известни опасения при обичаен прием,
     yellow = внимание при голямо количество или за чувствителни хора, orange = има сериозни дискусии/ограничения,
     red = забранена в храни в ЕС. Всички разрешени добавки в ЕС са одобрени в границите на допустимия прием. */
  const ADD = {
    E100:["Куркумин","green","Естествен оцветител."], E101:["Рибофлавин (вит. B2)","green","Витамин."], E120:["Кармин","yellow","Рядко алергични реакции."],
    E102:["Тартразин","orange","Изисква предупреждение в ЕС: може да повлияе на активността и вниманието при деца."],
    E104:["Хинолиново жълто","orange","Изисква предупреждение в ЕС за деца (активност и внимание)."],
    E110:["Сънсет жълто","orange","Изисква предупреждение в ЕС за деца (активност и внимание)."],
    E122:["Азорубин","orange","Изисква предупреждение в ЕС за деца (активност и внимание)."],
    E124:["Понсо 4R","orange","Изисква предупреждение в ЕС за деца (активност и внимание)."],
    E129:["Алура червено","orange","Изисква предупреждение в ЕС за деца (активност и внимание)."],
    E133:["Брилянтно синьо","yellow","Синтетичен оцветител; разрешен."], E140:["Хлорофил","green","Естествен оцветител."], E141:["Медни хлорофили","green","Оцветител."],
    E150a:["Карамел","green","Обикновен карамел."], E150c:["Амонячен карамел","yellow","Съдържа следи от 4-MEI; в рамките на нормите."], E150d:["Сулфитно-амонячен карамел","yellow","Съдържа следи от 4-MEI; в рамките на нормите."],
    E160a:["Бета-каротин","green","Естествен оцветител."], E160c:["Паприков екстракт","green","Естествен оцветител."], E162:["Цвеклово червено","green","Естествен оцветител."],
    E170:["Калциев карбонат","green","Минерал."], E171:["Титанов диоксид","red","Забранен в храни в ЕС от 2022 г. (EFSA не изключва генотоксичност)."],
    E200:["Сорбинова киселина","green","Консервант; добре проучен."], E202:["Калиев сорбат","green","Консервант; добре проучен."],
    E210:["Бензоена киселина","yellow","Възможна непоносимост при чувствителни хора."], E211:["Натриев бензоат","yellow","С витамин C може да образува следи от бензен; чувствителни хора."],
    E220:["Серен диоксид","orange","Сулфит — алерген по закон; може да предизвика астматични реакции."], E223:["Натриев метабисулфит","orange","Сулфит — алерген по закон."], E224:["Калиев метабисулфит","orange","Сулфит — алерген по закон."], E228:["Калиев бисулфит","orange","Сулфит — алерген по закон."],
    E249:["Калиев нитрит","orange","В преработено месо; свързва се с образуване на нитрозамини."], E250:["Натриев нитрит","orange","В преработено месо; свързва се с образуване на нитрозамини."], E251:["Натриев нитрат","orange","Ограничен прием; в преработено месо."], E252:["Калиев нитрат","orange","Ограничен прием; в преработено месо."],
    E260:["Оцетна киселина","green","Оцет."], E270:["Млечна киселина","green","Не съдържа мляко въпреки името."], E290:["Въглероден диоксид","green","Газиране."],
    E296:["Ябълчена киселина","green",""], E300:["Аскорбинова киселина (вит. C)","green","Витамин/антиоксидант."], E301:["Натриев аскорбат","green",""], E306:["Токофероли (вит. E)","green",""],
    E319:["TBHQ","yellow","Антиоксидант; ограничен допустим прием."], E320:["BHA","orange","IARC: възможно канцерогенен (група 2B); разрешен в малки количества."], E321:["BHT","yellow","Ограничен допустим прием."],
    E322:["Лецитини","green","Често от соя или слънчоглед — провери алергена."], E325:["Натриев лактат","green",""], E327:["Калциев лактат","green",""],
    E330:["Лимонена киселина","green",""], E331:["Натриеви цитрати","green",""], E332:["Калиеви цитрати","green",""], E333:["Калциеви цитрати","green",""],
    E338:["Фосфорна киселина","yellow","Голям прием на фосфати (напр. колички) — умереност."], E339:["Натриеви фосфати","yellow","Фосфати — умереност."], E340:["Калиеви фосфати","yellow","Фосфати — умереност."], E341:["Калциеви фосфати","yellow","Фосфати — умереност."],
    E385:["EDTA","yellow","Ограничен допустим прием."], E401:["Натриев алгинат","green",""], E406:["Агар","green",""], E407:["Карагенан","yellow","Дискусии за чревната лигавица; EFSA преоценява."],
    E410:["Рожков","green",""], E412:["Гуар","green",""], E414:["Гума арабика","green",""], E415:["Ксантан","green",""], E418:["Гелан","green",""],
    E420:["Сорбитол","yellow","В големи количества има слабително действие."], E421:["Манитол","yellow","В големи количества има слабително действие."], E422:["Глицерол","green",""],
    E433:["Полисорбат 80","yellow","Нови изследвания за чревната флора; разрешен."], E440:["Пектин","green",""],
    E450:["Дифосфати","yellow","Фосфати — умереност."], E451:["Трифосфати","yellow","Фосфати — умереност."], E452:["Полифосфати","yellow","Фосфати — умереност."],
    E460:["Целулоза","green",""], E466:["Карбоксиметилцелулоза","yellow","Нови изследвания за чревната флора; разрешена."],
    E471:["Моно- и диглицериди на мастни киселини","yellow","Емулгатор; маркер за силно преработена храна."], E472e:["DATEM","green",""], E476:["PGPR","green",""], E481:["Натриев стеароил лактилат","green",""],
    E500:["Сода бикарбонат","green",""], E503:["Амониев карбонат","green",""], E509:["Калциев хлорид","green",""], E551:["Силициев диоксид","green",""],
    E621:["Мононатриев глутамат","yellow","Безопасен в обичайни количества; някои хора съобщават чувствителност."], E627:["Динатриев гуанилат","green",""], E631:["Динатриев инозинат","green",""],
    E900:["Диметикон","green",""], E901:["Пчелен восък","green",""], E903:["Карнаубски восък","green",""], E920:["L-цистеин","green",""],
    E950:["Ацесулфам K","yellow","Подсладител; в рамките на допустимия прием."], E951:["Аспартам","orange","IARC 2023: възможно канцерогенен (2B), JECFA запази допустимия прием 40 мг/кг. Опасен при фенилкетонурия."],
    E952:["Цикламати","yellow","Подсладител; ограничен допустим прием."], E954:["Захарин","yellow","Подсладител."], E955:["Сукралоза","yellow","Подсладител; текущи изследвания."], E960:["Стевиол гликозиди","green","Подсладител от стевия."], E965:["Малтитол","yellow","В големи количества има слабително действие."], E967:["Ксилитол","yellow","Слабително в големи количества; токсичен за кучета."]
  };
  const LV = { green: { n: "Добре", i: "●" }, yellow: { n: "Умерено", i: "▲" }, orange: { n: "Внимание", i: "◆" }, red: { n: "Избягвай", i: "✖" }, gray: { n: "Няма данни", i: "?" } };

  function num(v) { const n = typeof v === "string" ? parseFloat(v.replace(",", ".")) : v; return Number.isFinite(n) ? n : null; }
  /* Хранителни нива на 100 г (FSA „светофар“); напитки — половината от прага. */
  function nutrition(nut, isDrink) {
    nut = nut || {};
    const f = isDrink ? 0.5 : 1;
    const bands = [
      ["fat", "Мазнини", "g", 3 * f, 17.5 * f], ["saturated-fat", "Наситени мазнини", "g", 1.5 * f, 5 * f],
      ["sugars", "Захари", "g", 5 * f, 22.5 * f], ["salt", "Сол", "g", 0.3 * f, 1.5 * f]
    ];
    const items = bands.map(([k, n, u, lo, hi]) => { const v = num(nut[k + "_100g"]);
      return { k, n, u, v, level: v == null ? "gray" : v <= lo ? "green" : v > hi ? "red" : "yellow" }; });
    const fib = num(nut["fiber_100g"]), pro = num(nut["proteins_100g"]), kcal = num(nut["energy-kcal_100g"]);
    items.push({ k: "fiber", n: "Фибри", u: "g", v: fib, level: fib == null ? "gray" : fib >= 6 ? "green" : fib >= 3 ? "yellow" : "gray", positive: true });
    items.push({ k: "proteins", n: "Протеин", u: "g", v: pro, level: pro == null ? "gray" : pro >= 10 ? "green" : pro >= 5 ? "yellow" : "gray", positive: true });
    const known = items.filter(x => !x.positive && x.level !== "gray");
    const reds = known.filter(x => x.level === "red").length, greens = known.filter(x => x.level === "green").length;
    const overall = !known.length ? "gray" : reds >= 2 ? "red" : reds === 1 ? "orange" : greens >= 3 ? "green" : "yellow";
    return { kcal, items, overall };
  }
  function serving(nut, grams) {
    if (!grams || !nut) return null; const k = grams / 100; const g = x => { const v = num(nut[x + "_100g"]); return v == null ? null : Math.round(v * k * 10) / 10; };
    return { grams, kcal: g("energy-kcal"), fat: g("fat"), sugars: g("sugars"), salt: g("salt"), proteins: g("proteins") };
  }
  function additives(tags, text) {
    const codes = new Set();
    (tags || []).forEach(t => { const m = /^en:e(\d{3,4}[a-z]?)/i.exec(t); if (m) codes.add("E" + m[1].toLowerCase().replace(/^(\d+)/, "$1")); });
    String(text || "").replace(/\bE ?-?(\d{3,4}[a-z]?)\b/gi, (_, c) => { codes.add("E" + c.toLowerCase()); });
    return [...codes].map(c => { const key = c.replace(/^E(\d+)([a-z]?)$/, (_, d, l) => "E" + d + l); const base = ADD[key] || ADD[key.replace(/[a-z]$/, "")];
      return base ? { code: key, name: base[0], level: base[1], note: base[2] } : { code: key, name: "", level: "gray", note: "Няма обобщение в FIT — провери в EFSA." }; })
      .sort((a, b) => ["red", "orange", "yellow", "gray", "green"].indexOf(a.level) - ["red", "orange", "yellow", "gray", "green"].indexOf(b.level));
  }
  /** Личен риск от алергени: съдържа (червено), следи/кръстосано замърсяване (оранжево), без данни (сиво), чисто (зелено). */
  function hit(k, text) { const a = EU14[k]; let t = String(text || ""); if (a.ex) t = t.replace(a.ex, " "); return a.rx.test(t); }
  function allergyRisk(prod, mine) {
    mine = (mine || []).filter(k => EU14[k]);
    const allT = prod.allergens_tags || [], trT = prod.traces_tags || [], ing = String(prod.ingredients_text || "");
    const contains = [], traces = [];
    mine.forEach(k => { const a = EU14[k];
      const main = ing.replace(/(може да съдържа|may contain|следи от).*$/is, ""), tr = (ing.match(/(може да съдържа|may contain|следи от).*$/is) || [""])[0];
      if (allT.includes(a.off) || (main && hit(k, main))) contains.push(k);
      else if (trT.includes(a.off) || (tr && hit(k, tr))) traces.push(k); });
    const noData = !ing && !allT.length && !trT.length;
    const level = contains.length ? "red" : traces.length ? "orange" : noData ? "gray" : mine.length ? "green" : "gray";
    const mainAll = ing.replace(/(може да съдържа|may contain|следи от).*$/is, "");
    const all = Object.keys(EU14).filter(k => allT.includes(EU14[k].off) || (mainAll && hit(k, mainAll)));
    const allTr = Object.keys(EU14).filter(k => !all.includes(k) && (trT.includes(EU14[k].off) || hit(k, (ing.match(/(може да съдържа|may contain|следи от).*$/is) || [""])[0])));
    return { level, contains, traces, all, allTraces: allTr, noData, checked: mine };
  }
  const NOVA = { 1: ["Непреработена или минимално преработена", "green"], 2: ["Кулинарна съставка", "green"], 3: ["Преработена храна", "yellow"], 4: ["Силно преработена (ултрапреработена)", "orange"] };
  function analyze(prod, user) {
    prod = prod || {}; user = user || {};
    const drink = (prod.categories_tags || []).some(t => /beverages|drinks|напитки/.test(t));
    const al = allergyRisk(prod, user.allergies);
    const nu = nutrition(prod.nutriments, drink);
    const ad = additives(prod.additives_tags, prod.ingredients_text);
    const nova = num(prod.nova_group);
    return {
      name: prod.product_name_bg || prod.product_name || "Неизвестен продукт", brand: prod.brands || "", code: prod.code || "",
      quantity: prod.quantity || "", image: prod.image_front_small_url || prod.image_url || "",
      allergy: al, nutrition: nu, serving: serving(prod.nutriments, num(prod.serving_quantity)),
      additives: ad, processing: nova ? { group: nova, n: NOVA[nova][0], level: NOVA[nova][1] } : { group: null, n: "Няма данни", level: "gray" },
      nutriScore: /^[a-e]$/.test(prod.nutriscore_grade || "") ? prod.nutriscore_grade.toUpperCase() : null,
      ingredients: prod.ingredients_text || "", provenance: prod._source || "Open Food Facts (данни от общността)", updated: prod.last_modified_t ? new Date(prod.last_modified_t * 1000).toISOString().slice(0, 10) : ""
    };
  }
  /** Проверка на баркод (EAN-13/EAN-8/UPC-A) по контролна цифра. */
  function validBarcode(c) {
    c = String(c || "").replace(/\D/g, ""); if (![8, 12, 13, 14].includes(c.length)) return false;
    const d = c.split("").map(Number), chk = d.pop(); let s = 0;
    d.reverse().forEach((x, i) => { s += x * (i % 2 === 0 ? 3 : 1); });
    return (10 - (s % 10)) % 10 === chk;
  }
  const API = { EU14, ADD, LV, NOVA, nutrition, serving, additives, allergyRisk, analyze, validBarcode, hit };
  if (typeof module !== "undefined" && module.exports) module.exports = API;
  root.FITFood = API;
})(typeof window !== "undefined" ? window : globalThis);
