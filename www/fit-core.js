/* FIT core — тренировка на живо, почивка, пропусната тренировка.
   Чиста логика без зависимости (браузър + Node тестове).
   Порт на docs/workout_core.reference.ts + идемпотентност по opId, смяна на уред,
   таймер за почивка, бързо планиране, проверка за възстановяване. */
(function (root) {
  "use strict";
  const uuid = () => {
    try { if (root.crypto && root.crypto.randomUUID) return root.crypto.randomUUID(); } catch (e) {}
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === "x" ? r : (r & 3 | 8)).toString(16); });
  };
  const nowISO = () => new Date().toISOString();
  const OPS_KEEP = 400;

  function newSession(opts) {
    opts = opts || {};
    const t = opts.at || nowISO();
    const ex = (opts.exercises || []).map(e => Object.assign({
      id: uuid(), machineId: "", name: "", group: "", restSec: 90, targetSets: 3, targetReps: 10, targetKg: 0
    }, e));
    return {
      id: opts.id || uuid(), state: "planned", kind: opts.kind || "plan", date: opts.date || t.slice(0, 10),
      exercises: ex, activeExerciseId: ex[0] ? ex[0].id : null, sets: [], ops: [],
      restUntil: null, restFor: null, load: opts.load || 1,
      version: 1, createdAt: t, updatedAt: t, syncState: "local"
    };
  }

  function bump(s, at) { s.version += 1; s.updatedAt = at || nowISO(); s.syncState = "local"; return s; }
  function clone(s) { return JSON.parse(JSON.stringify(s)); }
  function activeSet(s) { return s.sets.find(x => x.state === "active"); }
  function exerciseOf(s, id) { return s.exercises.find(e => e.id === id); }

  /** Прилага действие. Връща нова сесия. Дублирано действие (същото opId) не променя нищо.
      Невалидно действие хвърля грешка с код err.code. */
  function apply(s0, a) {
    if (!a || !a.type) throw fail("bad_action");
    if (a.opId && s0.ops.includes(a.opId)) return s0;
    const s = clone(s0), at = a.at || nowISO();
    switch (a.type) {
      case "START_WORKOUT":
        if (s.state !== "planned") throw fail("not_planned");
        s.state = "active"; s.startedAt = at; break;
      case "PAUSE_WORKOUT":
        if (s.state !== "active") throw fail("not_active");
        s.state = "paused"; break;
      case "RESUME_WORKOUT":
        if (s.state !== "paused") throw fail("not_paused");
        s.state = "active"; break;
      case "END_WORKOUT":
        if (s.state !== "active" && s.state !== "paused") throw fail("not_running");
        if (activeSet(s)) throw fail("set_active");
        s.state = "completed"; s.endedAt = at; s.restUntil = null; break;
      case "CANCEL_WORKOUT":
        if (s.state === "completed" || s.state === "cancelled") throw fail("finished");
        s.sets.forEach(x => { if (x.state === "active") { x.state = "cancelled"; x.version++; } });
        s.state = "cancelled"; s.endedAt = at; s.restUntil = null; break;
      case "ADD_EXERCISE": {
        if (s.state === "completed" || s.state === "cancelled") throw fail("finished");
        const e = Object.assign({ id: a.exerciseId || uuid(), restSec: 90, targetSets: 3, targetReps: 10, targetKg: 0 }, a.exercise || {});
        if (!exerciseOf(s, e.id)) s.exercises.push(e);
        if (!s.activeExerciseId) s.activeExerciseId = e.id;
        break;
      }
      case "SWITCH_EXERCISE":
        if (s.state !== "active") throw fail("not_active");
        if (activeSet(s)) throw fail("set_active");
        if (!exerciseOf(s, a.exerciseId)) throw fail("no_exercise");
        s.activeExerciseId = a.exerciseId; break;
      case "START_SET": {
        if (s.state !== "active") throw fail("not_active");
        const ex = s.sets.find(x => x.id === a.setId);
        if (ex && ex.state !== "ready") return idem(s0, a);         // повторено събитие
        if (activeSet(s)) throw fail("set_active");
        if (!s.activeExerciseId) throw fail("no_exercise");
        const e = exerciseOf(s, s.activeExerciseId);
        if (ex) { ex.state = "active"; ex.startedAt = at; ex.version++; }
        else s.sets.push({ id: a.setId || uuid(), exerciseId: e.id, machineId: e.machineId, state: "active", startedAt: at,
          weightKg: a.weightKg != null ? a.weightKg : e.targetKg, reps: a.reps != null ? a.reps : e.targetReps, version: 1 });
        s.restUntil = null; s.restFor = null; break;
      }
      case "COMPLETE_SET": {
        const x = s.sets.find(z => z.id === a.setId);
        if (x && x.state === "completed") return idem(s0, a);       // идемпотентен повтор
        if (s.state !== "active" && s.state !== "paused") throw fail("not_running");
        if (!x || x.state !== "active") throw fail("invalid_set");
        if (!valid(a.reps, 0, 500) || !valid(a.weightKg, 0, 1000)) throw fail("invalid_values");
        x.state = "completed"; x.endedAt = at; x.reps = a.reps; x.weightKg = a.weightKg; x.source = a.source || "manual"; x.version++;
        const e = exerciseOf(s, x.exerciseId);
        const rest = a.restSec != null ? a.restSec : (e ? e.restSec : 0);
        if (rest > 0) { s.restUntil = new Date(Date.parse(at) + rest * 1000).toISOString(); s.restFor = x.exerciseId; }
        break;
      }
      case "CANCEL_SET": {
        const x = s.sets.find(z => z.id === a.setId);
        if (!x || x.state === "cancelled") return idem(s0, a);
        if (x.state === "completed") throw fail("already_completed");
        x.state = "cancelled"; x.version++; break;
      }
      case "EDIT_SET": {
        const x = s.sets.find(z => z.id === a.setId);
        if (!x || x.state !== "completed") throw fail("invalid_set");
        if (a.reps != null) { if (!valid(a.reps, 0, 500)) throw fail("invalid_values"); x.reps = a.reps; }
        if (a.weightKg != null) { if (!valid(a.weightKg, 0, 1000)) throw fail("invalid_values"); x.weightKg = a.weightKg; }
        x.source = "manual"; x.edited = true; x.version++; break;
      }
      case "SKIP_REST": s.restUntil = null; s.restFor = null; break;
      default: throw fail("unknown_action");
    }
    if (a.opId) { s.ops.push(a.opId); if (s.ops.length > OPS_KEEP) s.ops = s.ops.slice(-OPS_KEEP); }
    return bump(s, at);
  }
  function idem(s0, a) {
    if (!a.opId) return s0;
    const s = clone(s0); s.ops.push(a.opId); return s;
  }
  function valid(n, lo, hi) { return typeof n === "number" && Number.isFinite(n) && n >= lo && n <= hi; }
  function fail(code) { const e = new Error(code); e.code = code; return e; }

  /** Повторно изпращане на опашка от действия (напр. след прекъсната връзка часовник↔телефон). */
  function replay(s, actions) {
    const errors = [];
    actions.forEach(a => { try { s = apply(s, a); } catch (e) { errors.push({ opId: a.opId, code: e.code || e.message }); } });
    return { session: s, errors };
  }

  function completedSets(s, exerciseId) { return s.sets.filter(x => x.state === "completed" && (!exerciseId || x.exerciseId === exerciseId)); }
  function summary(s) {
    const done = completedSets(s);
    const vol = done.reduce((a, x) => a + (x.weightKg || 0) * (x.reps || 0), 0);
    const mins = s.startedAt ? Math.round(((Date.parse(s.endedAt || nowISO())) - Date.parse(s.startedAt)) / 60000) : 0;
    const per = s.exercises.map(e => ({ name: e.name, sets: completedSets(s, e.id).length, target: e.targetSets })).filter(x => x.sets || x.target);
    return { sets: done.length, volumeKg: Math.round(vol), minutes: mins, exercises: per };
  }
  /** Последни реални настройки по уред (от завършени серии). */
  function lastByMachine(sessions) {
    const out = {};
    sessions.forEach(s => s.sets.forEach(x => {
      if (x.state !== "completed" || !x.machineId) return;
      const prev = out[x.machineId];
      if (!prev || (x.endedAt || "") > prev.at) out[x.machineId] = { weightKg: x.weightKg, reps: x.reps, at: x.endedAt || "" };
    }));
    return out;
  }

  /** Реалистична сесия за наличното време и уреди (сценарий E). Без вина, без претоварване. */
  function planQuick(o) {
    const minutes = Math.max(10, Math.min(120, o.minutes || 30));
    const m = (o.machines || []).filter(Boolean);
    if (!m.length) return { exercises: [], note: "Избери поне един уред." };
    const warm = minutes <= 25 ? 3 : 5;
    const workSec = 45;
    const load = o.load != null ? Math.min(1, o.load) : 1;
    let left = (minutes - warm) * 60;
    const ex = m.map(x => ({ machineId: x.id, name: x.name, group: x.group || "", restSec: x.restSec || 90,
      targetReps: x.reps || 10, targetKg: x.weightKg != null ? Math.round(x.weightKg * (load < 1 ? 0.9 : 1) * 2) / 2 : 0, targetSets: 0 }));
    const maxSets = load < 1 ? 3 : 4;
    let added = true;
    while (added) {
      added = false;
      for (const e of ex) {
        const cost = workSec + e.restSec;
        if (e.targetSets < maxSets && left >= cost) { e.targetSets++; left -= cost; added = true; }
      }
    }
    ex.forEach(e => { if (!e.targetSets) e.targetSets = 1; });
    const total = ex.reduce((a, e) => a + e.targetSets, 0);
    return { exercises: ex, warmupMin: warm, totalSets: total,
      note: `${warm} мин загрявка, после ${total} серии на ${ex.length} ${ex.length === 1 ? "уред" : "уреда"}. Вписва се в ${minutes} минути.` };
  }

  /** Проверка за възстановяване преди тренировка (сценарий F). Никога не увеличава натоварването. */
  function recovery(c) {
    c = c || {};
    if (c.pain || c.ill) return { action: "rest", load: 0, care: true,
      message: c.pain ? "При болка днес е за почивка. Ако болката е силна или не минава, говори с лекар или физиотерапевт." :
        "Когато си болен, тялото има нужда от почивка. Тренираме, когато се възстановиш." };
    const e = c.energy || 3, sleep = c.sleep || "ok";
    if (e <= 1 || (e <= 2 && sleep === "bad")) return { action: "rest", load: 0, care: false,
      message: "Днес почивката е най-добрият избор. Почивката също е напредък." };
    if (e <= 2 || sleep === "bad") return { action: "light", load: 0.8, care: false,
      message: "По-лека тренировка: една серия по-малко и около 10% по-малка тежест." };
    return { action: "normal", load: 1, care: false, message: "Готов си. Тренираме по плана." };
  }
  function applyLoad(exercises, load) {
    if (load >= 1) return exercises;
    return exercises.map(e => Object.assign({}, e, { targetSets: Math.max(1, e.targetSets - 1), targetKg: Math.round(e.targetKg * 0.9 * 2) / 2 }));
  }

  /* ---------- Пропусната тренировка ---------- */
  const SKIP_REASONS = { work: "Работа / време", travel: "Пътуване", fatigue: "Умора", injury: "Болка или травма", illness: "Болест",
    motivation: "Мотивация", weather: "Времето", private: "Предпочитам да не казвам", other: "Друго" };
  const ALTERNATIVES = { rest: "Почивка", walk: "Разходка 20–30 мин", home: "Кратка тренировка у дома", mobility: "Разтягане и мобилност", gym: "Зала", reschedule: "Пренасрочи" };
  function validateSkip(d) {
    const errors = [];
    if (!d || !d.reason) errors.push("reason_required");
    if (d && d.alternative === "reschedule" && !d.newTime) errors.push("time_required");
    if (d && (d.reason === "injury" || d.reason === "illness") && d.alternative === "gym") errors.push("safety_review");
    return errors;
  }
  /** Безопасни алтернативи според причината. */
  function alternativesFor(reason) {
    if (reason === "injury" || reason === "illness") return ["rest", "mobility", "reschedule"];
    if (reason === "fatigue") return ["rest", "walk", "mobility", "reschedule"];
    if (reason === "weather") return ["home", "gym", "mobility", "reschedule"];
    return ["reschedule", "home", "walk", "rest", "gym"];
  }
  /** Дати назад (до 3 дни), които са тренировъчни, без отметка и без решение. */
  function missedDays(o) {
    const out = [];
    const today = new Date(o.today + "T12:00:00");
    for (let i = 1; i <= 3; i++) {
      const d = new Date(today.getTime() - i * 864e5);
      const iso = d.toISOString().slice(0, 10);
      if (o.start && iso < o.start) break;
      if (!o.days.includes(d.getDay())) continue;
      const l = (o.log || {})[iso] || {};
      if (l.complete || l.skip || l.missedAsked) continue;
      out.push(iso);
    }
    return out;
  }
  /** Решение → запис. Календарът се променя само при потвърждение. Натоварването никога не се удвоява. */
  function resolveSkip(d) {
    const errs = validateSkip(d);
    if (errs.length) return { ok: false, errors: errs };
    if (!d.confirmed) return { ok: true, changes: null };
    const rec = { reason: d.reason, details: d.reason === "private" ? "" : (d.details || ""), alternative: d.alternative, at: d.at || nowISO() };
    const changes = { skip: rec };
    if (d.alternative === "reschedule") changes.reschedule = { at: d.newTime, load: 1, replaces: true };
    changes.loadFactor = (d.reason === "fatigue" || d.reason === "injury" || d.reason === "illness") ? 0.8 : 1;
    return { ok: true, changes };
  }

  const API = { uuid, newSession, apply, replay, summary, completedSets, activeSet, lastByMachine, planQuick, recovery, applyLoad,
    SKIP_REASONS, ALTERNATIVES, validateSkip, alternativesFor, missedDays, resolveSkip };
  if (typeof module !== "undefined" && module.exports) module.exports = API;
  root.FITCore = API;
})(typeof window !== "undefined" ? window : globalThis);
