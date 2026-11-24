// Тестове на „Кажи уредите“ (node tools/test_voice.mjs): разпознаване на уреди и числа, пренареждане, запис.
import assert from "assert/strict";
import { createRequire } from "module";
const req = createRequire(import.meta.url);
const V = req("../www/fit-voice.js"), FC = req("../www/fit-core.js");
const M = [["legpress","Лег преса","legs"],["lat","Скрипец вертикален","back"],["row","Гребна машина (седнал)","back"],["cable","Кабелна кула","arms"],["smith","Смит машина","legs"],["db","Дъмбели и лежанка","chest"],["pec","Пек-дек","chest"],["curl","Сгъване на бедро","legs"],["ext","Разгъване на бедро","legs"],["chest","Машина за гърди","chest"],["abs","Римски стол / пейка","core"],["tread","Бягаща пътека","cardio"],["bike","Велоергометър","cardio"],["ellip","Кростренажор","cardio"],["u1","Хак клек","legs"]].map(([id,name,group])=>({id,name,group}));
const ids = (t) => V.parseSpoken(t, M).map((x) => x.id);
let n = 0; const t = (name, fn) => { fn(); n++; console.log("ok  ", name); };

t("Уреди по реда на казване, с разговорни имена", () => {
  assert.deepEqual(ids("Днес ще правя лег преса, после гребната и накрая пътеката"), ["legpress", "row", "tread"]);
  assert.deepEqual(ids("пек дек, вертикален скрипец и колело"), ["pec", "lat", "bike"]);
  assert.deepEqual(ids("Смит машината и кростренажора"), ["smith", "ellip"]);
});
t("По-дългото име печели: „машина за гърди“ ≠ „гърди“; „задно бедро“ → сгъване", () => {
  assert.deepEqual(ids("машина за гърди и задно бедро"), ["chest", "curl"]);
  assert.deepEqual(ids("разгъване на бедро и сгъване на бедро"), ["ext", "curl"]);
});
t("Собствен уред по име („Хак клек“)", () => assert.deepEqual(ids("хак клек 4 серии"), ["u1"]));
t("Числа: серии, кг, повторения, минути — и с думи", () => {
  const r = V.parseSpoken("лег преса 3 серии по 80 кг, гребна 3 по 12, пътека 15 минути", M);
  assert.deepEqual(r[0], { id: "legpress", sets: 3, kg: 80 });
  assert.deepEqual(r[1], { id: "row", sets: 3, reps: 12 });
  assert.deepEqual(r[2], { id: "tread", minutes: 15 });
  const w = V.parseSpoken("скрипеца четири серии по десет повторения с двадесет и пет кила", M)[0];
  assert.deepEqual(w, { id: "lat", sets: 4, reps: 10, kg: 25 });
  assert.equal(V.parseSpoken("дъмбели 12,5 кг", M)[0].kg, 12.5);
});
t("Повторно казан уред не се дублира", () => assert.deepEqual(ids("лег преса, гребна, пак лег преса"), ["legpress", "row"]));
t("Без уред → празно", () => assert.deepEqual(ids("днес съм уморен"), []));
t("Пренареждане: казаните отпред; „само тези“ маха неначатите, пази започнатите", () => {
  let s = FC.newSession({ exercises: [{ machineId: "legpress" }, { machineId: "row" }, { machineId: "pec" }, { machineId: "tread" }] });
  s = FC.apply(s, { type: "START_WORKOUT" });
  const id = FC.uuid(); s = FC.apply(s, { type: "START_SET", setId: id }); s = FC.apply(s, { type: "COMPLETE_SET", setId: id, reps: 10, weightKg: 50 });
  const r = V.reorder(s, ["tread", "pec", "bike"], false);
  assert.deepEqual(r.exercises.map((e) => e.machineId), ["tread", "pec", "legpress", "row"]);
  assert.deepEqual(r.toAdd, ["bike"]);
  const o = V.reorder(s, ["tread"], true);
  assert.deepEqual(o.exercises.map((e) => e.machineId), ["tread", "legpress"]); assert.equal(o.removed, 2);
});
t("Казано след тренировка → завършена сесия с потвърдени серии; следващите цели тръгват от тях", () => {
  const items = [{ exercise: { machineId: "legpress", name: "Лег преса", targetSets: 3, targetReps: 10, targetKg: 60, restSec: 90 }, sets: 3, reps: 10, kg: 80 },
                 { exercise: { machineId: "tread", name: "Пътека", group: "cardio", targetSets: 1, targetReps: 10, restSec: 0 }, sets: 1, reps: 15, kg: 0 }];
  const s = V.loggedSession(FC, items, { date: "2026-11-24", end: "2026-11-24T19:00:00.000Z" });
  assert.equal(s.state, "completed"); const sm = FC.summary(s); assert.equal(sm.sets, 4);
  assert.ok(s.sets.every((x) => x.source === "voice" && x.state === "completed"));
  assert.equal(FC.lastByMachine([s]).legpress.weightKg, 80);
  assert.ok(Date.parse(s.startedAt) < Date.parse(s.endedAt));
});
console.log(`\n${n} теста на гласа — всички минаха`);
