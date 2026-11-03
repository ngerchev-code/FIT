// Тестове на храните (node tools/test_food.mjs) — сценарий D и разпознаване.
import { createRequire } from "module"; import assert from "assert/strict";
const F = createRequire(import.meta.url)("../www/food-core.js");
let n = 0; const t = (name, fn) => { fn(); n++; console.log("ok  ", name); };
const yog = { code: "3800000000000", product_name: "Кисело мляко 2%", allergens_tags: ["en:milk"], traces_tags: [], nutriscore_grade: "a", nova_group: 1,
  ingredients_text: "пастьоризирано краве мляко, живи млечнокисели култури",
  nutriments: { "energy-kcal_100g": 50, fat_100g: 2, "saturated-fat_100g": 1.3, sugars_100g: 4, salt_100g: 0.1, proteins_100g: 3.5 } };
t("D: млечна алергия → изрично предупреждение, въпреки добрата хранителна оценка", () => {
  const r = F.analyze(yog, { allergies: ["milk"] });
  assert.equal(r.allergy.level, "red"); assert.deepEqual(r.allergy.contains, ["milk"]);
  assert.equal(r.nutrition.overall, "green"); assert.equal(r.nutriScore, "A");
  assert.equal(r.processing.level, "green");
});
t("Следи / кръстосано замърсяване се отделя от съдържанието", () => {
  const p = { ingredients_text: "захар, какаова маса, какаово масло, лешници. Може да съдържа следи от фъстъци и мляко.", allergens_tags: ["en:nuts"], traces_tags: [] };
  const r = F.analyze(p, { allergies: ["peanut", "milk", "nuts"] });
  assert.deepEqual(r.allergy.contains, ["nuts"]); assert.deepEqual(r.allergy.traces.sort(), ["milk", "peanut"]);
  assert.equal(r.allergy.level, "red");
});
t("Без фалшиви алергени: какаово масло, кокосово мляко, шам фъстък, млечна киселина", () => {
  const p = { ingredients_text: "какаово масло, кокосово мляко, шам фъстък, млечна киселина (E270), тоник", allergens_tags: [], traces_tags: [] };
  const r = F.analyze(p, { allergies: ["milk", "peanut", "fish"] });
  assert.equal(r.allergy.level, "green", JSON.stringify(r.allergy));
});
t("Няма данни → сиво, не „безопасно“", () => { assert.equal(F.analyze({ product_name: "X" }, { allergies: ["milk"] }).allergy.level, "gray"); });
t("Е-кодове: не всички са вредни; E171 червено, E330 зелено, аспартам оранжево", () => {
  const a = F.additives(["en:e330", "en:e171", "en:e951"], "сол, E322");
  const lv = Object.fromEntries(a.map(x => [x.code, x.level]));
  assert.equal(lv.E171, "red"); assert.equal(lv.E330, "green"); assert.equal(lv.E951, "orange"); assert.equal(lv.E322, "green");
  assert.equal(a[0].code, "E171", "най-рисковите първи");
});
t("Хранителни нива и напитки (по-строг праг)", () => {
  const chips = F.nutrition({ fat_100g: 34, "saturated-fat_100g": 3, sugars_100g: 1, salt_100g: 1.8 });
  assert.equal(chips.overall, "red");
  const cola = F.nutrition({ sugars_100g: 10.6, fat_100g: 0, "saturated-fat_100g": 0, salt_100g: 0 }, true);
  assert.equal(cola.items.find(x => x.k === "sugars").level, "yellow");
  assert.equal(F.serving({ "energy-kcal_100g": 200, sugars_100g: 10 }, 30).kcal, 60);
});
t("Баркод: контролна цифра", () => { assert.ok(F.validBarcode("5449000000996")); assert.ok(!F.validBarcode("5449000000997")); assert.ok(F.validBarcode("96385074")); });
console.log(`\n${n} теста — всички минаха`);
