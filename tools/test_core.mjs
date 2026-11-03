// Тестове на ядрото (node tools/test_core.mjs) — сценарии A, B, E, F от заданието.
import { createRequire } from "module";
import assert from "assert/strict";
const require = createRequire(import.meta.url);
const C = require("../www/fit-core.js");
let n = 0; const t = (name, fn) => { fn(); n++; console.log("ok  ", name); };
const T = (m) => new Date(Date.UTC(2026, 10, 3, 10, m)).toISOString();

t("A: 3 серии, смяна на уред, без дубли при повторни/забавени събития", () => {
  let s = C.newSession({ exercises: [
    { id: "e1", machineId: "legpress", name: "Лег преса", restSec: 90, targetSets: 3, targetReps: 10, targetKg: 60 },
    { id: "e2", machineId: "lat", name: "Скрипец", restSec: 60, targetSets: 3, targetReps: 12, targetKg: 35 }] });
  s = C.apply(s, { type: "START_WORKOUT", opId: "o1", at: T(0) });
  const queue = [];
  for (let i = 1; i <= 3; i++) {
    queue.push({ type: "START_SET", opId: "s" + i, setId: "set" + i, at: T(i * 3) });
    queue.push({ type: "COMPLETE_SET", opId: "c" + i, setId: "set" + i, reps: 10, weightKg: 60 + i * 2.5, source: "manual", at: T(i * 3 + 1) });
  }
  queue.forEach(a => s = C.apply(s, a));
  assert.equal(C.completedSets(s, "e1").length, 3);
  assert.ok(s.restUntil, "таймер за почивка след серия");
  // часовникът се свързва отново и праща същата опашка пак → без дубли
  const r = C.replay(s, queue); s = r.session;
  assert.equal(r.errors.length, 0);
  assert.equal(C.completedSets(s).length, 3);
  // повторен COMPLETE без opId също е идемпотентен
  s = C.apply(s, { type: "COMPLETE_SET", setId: "set3", reps: 99, weightKg: 1 });
  assert.equal(s.sets.find(x => x.id === "set3").reps, 10);
  // смяна на уред запазва предишните серии
  s = C.apply(s, { type: "SWITCH_EXERCISE", opId: "sw", exerciseId: "e2", at: T(20) });
  assert.equal(s.activeExerciseId, "e2");
  s = C.apply(s, { type: "START_SET", opId: "s4", setId: "set4", at: T(21) });
  assert.equal(s.sets.find(x => x.id === "set4").weightKg, 35, "зарежда настройките на новия уред");
  assert.throws(() => C.apply(s, { type: "SWITCH_EXERCISE", exerciseId: "e1" }), /set_active/);
  assert.throws(() => C.apply(s, { type: "END_WORKOUT" }), /set_active/);
  s = C.apply(s, { type: "COMPLETE_SET", opId: "c4", setId: "set4", reps: 12, weightKg: 35, at: T(22) });
  s = C.apply(s, { type: "END_WORKOUT", opId: "end", at: T(30) });
  assert.equal(s.state, "completed");
  assert.equal(C.summary(s).sets, 4);
  assert.deepEqual(C.lastByMachine([s]).legpress, { weightKg: 67.5, reps: 10, at: T(10) });
  assert.throws(() => C.apply(s, { type: "COMPLETE_SET", setId: "x", reps: -1, weightKg: 0 }));
});

t("Невалидни стойности се отхвърлят, редакция на серия е ръчна", () => {
  let s = C.newSession({ exercises: [{ id: "e1", machineId: "m" }] });
  s = C.apply(s, { type: "START_WORKOUT" });
  s = C.apply(s, { type: "START_SET", setId: "a" });
  assert.throws(() => C.apply(s, { type: "COMPLETE_SET", setId: "a", reps: NaN, weightKg: 10 }), /invalid_values/);
  s = C.apply(s, { type: "COMPLETE_SET", setId: "a", reps: 8, weightKg: 20, source: "wearable" });
  s = C.apply(s, { type: "EDIT_SET", setId: "a", reps: 9 });
  const x = s.sets[0]; assert.equal(x.reps, 9); assert.equal(x.source, "manual"); assert.ok(x.edited);
  s = C.apply(s, { type: "PAUSE_WORKOUT" }); s = C.apply(s, { type: "RESUME_WORKOUT" });
  assert.equal(s.state, "active");
});

t("E: 20 минути и 2 уреда → реалистичен план", () => {
  const p = C.planQuick({ minutes: 20, machines: [{ id: "legpress", name: "Лег преса", restSec: 90 }, { id: "lat", name: "Скрипец", restSec: 90 }] });
  const secs = p.warmupMin * 60 + p.exercises.reduce((a, e) => a + e.targetSets * (45 + e.restSec), 0);
  assert.ok(secs <= 20 * 60, "вписва се във времето: " + secs);
  assert.ok(p.totalSets >= 4 && p.totalSets <= 8, "серии: " + p.totalSets);
  assert.equal(p.exercises.length, 2);
});

t("F: умора → почивка/по-леко, никога повече натоварване", () => {
  assert.equal(C.recovery({ energy: 1 }).action, "rest");
  assert.equal(C.recovery({ pain: true }).care, true);
  const light = C.recovery({ energy: 2, sleep: "ok" });
  assert.equal(light.action, "light"); assert.ok(light.load < 1);
  const ex = C.applyLoad([{ targetSets: 3, targetKg: 50 }], light.load);
  assert.deepEqual([ex[0].targetSets, ex[0].targetKg], [2, 45]);
  assert.equal(C.recovery({ energy: 5, sleep: "good" }).load, 1);
  const p = C.planQuick({ minutes: 60, load: 1.5, machines: [{ id: "a", name: "A" }] });
  assert.ok(p.exercises[0].targetSets <= 4, "няма компенсаторно претоварване");
});

t("B: пропусната тренировка — причина, алтернатива, промяна само при потвърждение", () => {
  const days = C.missedDays({ today: "2026-11-03", start: "2026-10-01", days: [1, 3, 5], log: { "2026-10-30": { complete: true } } });
  assert.deepEqual(days, ["2026-11-02"]); // Пн 2.11 пропусната, Пт 30.10 завършена
  assert.deepEqual(C.validateSkip({}), ["reason_required"]);
  assert.ok(C.validateSkip({ reason: "work", alternative: "reschedule" }).includes("time_required"));
  assert.ok(C.validateSkip({ reason: "injury", alternative: "gym" }).includes("safety_review"));
  assert.ok(!C.alternativesFor("injury").includes("gym"));
  assert.equal(C.resolveSkip({ reason: "work", alternative: "reschedule", newTime: "2026-11-04T18:00", confirmed: false }).changes, null);
  const r = C.resolveSkip({ reason: "work", alternative: "reschedule", newTime: "2026-11-04T18:00", confirmed: true });
  assert.equal(r.changes.reschedule.at, "2026-11-04T18:00");
  assert.equal(r.changes.reschedule.load, 1); assert.ok(r.changes.reschedule.replaces, "без двойно натоварване");
  assert.equal(C.resolveSkip({ reason: "private", details: "x", alternative: "rest", confirmed: true }).changes.skip.details, "");
});

console.log(`\n${n} теста — всички минаха`);
