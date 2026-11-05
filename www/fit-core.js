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
        if (valid(a.hrAvg, 30, 240)) { x.hrAvg = Math.round(a.hrAvg); x.hrSource = "wearable"; }
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


  /* ---------- Път за 6 / 9 / 12 месеца (хоризонти за планиране, не обещани резултати) ---------- */
  const GOAL_FOCUS = {
    fat: ["Движение всеки ден и 2–3 силови тренировки", "Обиколка на талията и енергия — не само кантарът", "Навик за хранене, който можеш да държиш"],
    muscle: ["Техника на основните движения", "Плавно покачване на тежестта (двойна прогресия)", "Достатъчно протеин и сън"],
    posture: ["Горен гръб, лопатки и корем във всяка тренировка", "Мобилност на гръдния отдел и таза", "Почивки от седене през деня"],
    strength: ["Основни движения с безупречна техника", "Малки стъпки в тежестта, по-малко повторения", "Пълно възстановяване между тежките дни"],
    tone: ["Кръгови тренировки и издръжливост", "Кардио 2 пъти седмично", "Повече повторения с контрол"],
    health: ["Редовност преди интензивност", "Разходки, мобилност и сън", "Енергия през деня"]
  };
  const PHASES12 = [
    { from: 1, to: 2, name: "Основа", focus: "навик, техника, леки тежести" },
    { from: 3, to: 4, name: "Натрупване", focus: "повече серии, стабилен ритъм" },
    { from: 5, to: 6, name: "Прогресия", focus: "плавно по-тежко, по-малко почивка" },
    { from: 7, to: 7, name: "Разтоварване и преглед", focus: "по-лека седмица, оценка, нови цели" },
    { from: 8, to: 10, name: "Специализация", focus: "фокус върху главната цел" },
    { from: 11, to: 12, name: "Устойчивост", focus: "затвърждаване, план за следващата година" }
  ];
  function addMonths(iso, m) { const d = new Date(iso + "T12:00:00"); d.setMonth(d.getMonth() + m); return d.toISOString().slice(0, 10); }
  function monthIndex(start, today) {
    const a = new Date(start + "T12:00:00"), b = new Date(today + "T12:00:00");
    let m = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth()) + 1;
    if (b.getDate() < a.getDate()) m -= 1;
    return Math.max(1, m);
  }
  function planHorizons(o) {
    const goals = (o.goals && o.goals.length) ? o.goals : ["health"];
    const days = o.days || 3, start = o.start;
    const markers = goals.flatMap(g => GOAL_FOCUS[g] || []).slice(0, 5);
    const sessions = m => Math.round(m * 4.3 * days * 0.8);
    const H = {};
    [6, 9, 12].forEach(m => {
      H[m] = { months: m, date: addMonths(start, m),
        process: [`Около ${sessions(m)} тренировки (${days} седмично при 80% редовност)`].concat(
          m === 6 ? ["Уверена техника на всички уреди в програмата", markers[0] || ""] :
          m === 9 ? ["Самостоятелно планиране на седмицата", markers[1] || ""] :
                    ["Тренировките са част от живота ти", markers[2] || ""]).filter(Boolean),
        phases: PHASES12.filter(p => p.from <= m) };
    });
    return { goals, start, days, level: o.level || "new", horizons: H, phases: PHASES12, markers,
      note: "Това са хоризонти за планиране, а не обещани резултати. Преглеждаме ги всеки месец." };
  }
  /** Ревизия при смяна на целта (сценарий G): изминатото се запазва, оставащите месеци се пренареждат. */
  function revisePlan(o) {
    const month = monthIndex(o.start, o.today);
    const old = o.oldGoals || [], neu = o.newGoals || [];
    const added = neu.filter(g => !old.includes(g)), removed = old.filter(g => !neu.includes(g));
    const plan = planHorizons({ goals: neu, days: o.days, start: o.start, level: o.level });
    const why = [];
    why.push(`Месец ${month}: изминалите ${month - 1} мес. остават в историята — нищо не се губи.`);
    if (added.length) why.push("Нов фокус: " + added.map(g => (GOAL_FOCUS[g] || [g])[0]).join("; ") + ".");
    if (removed.length) why.push("По-малко внимание на предишния фокус, без рязко сваляне на натоварването.");
    why.push("Първите 2 седмици след смяната са преходни — същият обем, нова насока, после плавна прогресия.");
    return { plan, revision: { at: o.today, month, from: old, to: neu, why } };
  }
  /** Месечен преглед: редовност, обем, почивка → съвет. Никога над +10% натоварване. */
  function monthlyReview(o) {
    const { log = {}, sessions = [], from, to, days = 3 } = o;
    const inRange = d => d >= from && d <= to;
    const planned = Math.max(1, Math.round(((Date.parse(to) - Date.parse(from)) / 864e5 + 1) / 7 * days));
    const done = Object.keys(log).filter(d => inRange(d) && log[d].complete).length;
    const skipped = Object.keys(log).filter(d => inRange(d) && log[d].skip);
    const rest = Object.keys(log).filter(d => inRange(d) && log[d].rest).length;
    const ss = sessions.filter(s => s.state === "completed" && inRange((s.endedAt || s.updatedAt || "").slice(0, 10)));
    const sets = ss.reduce((a, s) => a + s.sets.filter(x => x.state === "completed").length, 0);
    const vol = Math.round(ss.reduce((a, s) => a + s.sets.reduce((b, x) => b + (x.state === "completed" ? (x.weightKg || 0) * (x.reps || 0) : 0), 0), 0));
    const adherence = Math.min(100, Math.round(done / planned * 100));
    const hurt = skipped.filter(d => ["injury", "illness", "fatigue"].includes(log[d].skip.reason)).length + rest;
    let advice, load;
    if (hurt >= 3) { advice = "Много дни с умора или болка. Следващия месец: по-лека програма и повече възстановяване."; load = 0.9; }
    else if (adherence >= 80) { advice = "Отлична редовност. Следващия месец: малка прогресия (до +10%)."; load = 1.1; }
    else if (adherence >= 50) { advice = "Добра основа. Задържаме натоварването и търсим по-удобни дни или по-кратки тренировки."; load = 1; }
    else { advice = "Животът се случва. По-кратки тренировки (20–30 мин) и 1 ден по-малко седмично, ако помага."; load = 1; }
    return { planned, done, adherence, skipped: skipped.length, rest, sets, volumeKg: vol, advice, load,
      source: "Отметки и серии, потвърдени от теб (самоотчет и ръчен запис)" };
  }


  /* ---------- Алтернативно натоварване: днес не мога в залата / утре на друго място ---------- */
  const BW = {
    legs: [["Клякания", "повт.", "Тежестта на петите, коленете над пръстите"], ["Напади назад", "повт. на крак", "Изправен торс, коляното леко до пода"], ["Глутеус мост", "повт.", "Стисни седалището горе за 1 сек"], ["Качване на стол или стъпало", "повт. на крак", "Стабилен стол, цялото стъпало горе"]],
    back: [["Супермен", "повт.", "Ръце и крака леко нагоре, без рязкост"], ["Y-T-W на пода", "повт.", "Лопатките назад и надолу"], ["Гребане с хавлия на дръжка на врата", "повт.", "Само на здрава врата; лактите назад"]],
    chest: [["Лицеви опори (от колене при нужда)", "повт.", "Тялото в права линия"], ["Широки лицеви опори", "повт.", "Бавно надолу, 2 сек"]],
    shoulders: [["Pike лицеви опори", "повт.", "Таза високо, главата между ръцете"], ["Планк с докосване на рамо", "повт.", "Без люлеене на таза"]],
    arms: [["Кофички на стол", "повт.", "Лактите назад, раменете далеч от ушите"], ["Тесни лицеви опори", "повт.", "Лактите до тялото"]],
    core: [["Планк", "сек", "Корем стегнат, без провисване"], ["Мъртва буболечка", "повт.", "Кръстът опрян в пода"], ["Странично планк", "сек на страна", "Тялото в права линия"]],
    cardio: [["Jumping jacks", "сек", "Меко приземяване"], ["Бързо качване по стълби", "мин", "Темпо, при което още можеш да говориш"]],
    mobility: [["Котка-крава", "повт.", "Бавно, с дишането"], ["Отваряне на таза 90/90", "повт.", "Без болка"], ["Разтягане на гърди на рамка на врата", "сек", "Лек натиск, без болка"], ["Завъртане на гръдния отдел", "повт. на страна", "Таза остава неподвижен"], ["Детска поза", "сек", "Дълбоко дишане"]]
  };
  const ENV = { home: "У дома, без уреди", travel: "На път / в хотела", park: "В парка", walk: "Навън: бързо ходене", run: "Навън: ходене и бягане", mobility: "Разтягане и мобилност" };
  function altPlan(o) {
    o = o || {};
    let env = ENV[o.env] ? o.env : "home"; let swapped = null;
    const minutes = Math.max(10, Math.min(60, o.minutes || 30));
    const lvl = o.level === "adv" ? 2 : o.level === "mid" ? 1 : 0;
    if ((o.reason === "injury" || o.reason === "illness") && env !== "mobility") { swapped = { from: env, why: o.reason === "injury" ? "болка или травма" : "болест" }; env = "mobility"; }
    if (["walk", "run", "park"].includes(env) && o.weather && o.weather.bad) { swapped = { from: env, why: o.weather.why || "лошо време" }; env = "home"; }
    const light = o.reason === "fatigue";
    const reps = [10, 12, 15][lvl], hold = [20, 30, 45][lvl], sets = Math.max(1, [2, 3, 3][lvl] - (light ? 1 : 0));
    const mk = (g, it, i) => ({ machineId: "bw-" + g + "-" + i, name: it[0], machine: ENV[env], group: g === "mobility" ? "mobility" : g, cue: it[2],
      restSec: g === "mobility" ? 0 : 45, targetSets: g === "mobility" ? 1 : sets, targetKg: 0,
      targetReps: it[1].startsWith("сек") ? hold : it[1] === "мин" ? 3 : reps, unit: it[1] });
    let ex = [];
    if (env === "mobility") ex = BW.mobility.map((it, i) => mk("mobility", it, i));
    else if (env === "walk") ex = [{ machineId: "bw-walk", name: "Бързо ходене (може да говориш, но не и да пееш)", machine: ENV.walk, group: "cardio", restSec: 0, targetSets: 1, targetReps: Math.max(15, minutes - 5), targetKg: 0, cue: "Изправен, ръцете работят", unit: "мин" }, mk("mobility", BW.mobility[2], 2), mk("mobility", BW.mobility[3], 3)];
    else if (env === "run") ex = [{ machineId: "bw-run", name: lvl ? "Интервали: 1 мин бягане / 2 мин ходене" : "Ходене с кратки отсечки леко бягане (30 сек)", machine: ENV.run, group: "cardio", restSec: 0, targetSets: 1, targetReps: Math.max(15, minutes - 5), targetKg: 0, cue: "Започни и завърши с 5 мин ходене", unit: "мин" }, mk("mobility", BW.mobility[1], 1)];
    else {
      const want = (o.groups && o.groups.length ? o.groups : ["legs", "back", "chest", "core"]).filter(g => BW[g] && g !== "mobility");
      const order = [...new Set(want)].concat(["legs", "back", "chest", "core"].filter(g => !want.includes(g)));
      const per = 45 + 45, budget = (minutes - 4) * 60; let used = 0; const pick = {};
      for (let round = 0; round < 3 && used < budget; round++) for (const g of order) {
        const it = BW[g][(pick[g] = (pick[g] ?? -1) + 1)]; if (!it) continue;
        const cost = sets * per; if (used + cost > budget) continue; ex.push(mk(g, it, pick[g])); used += cost;
      }
      if (env === "park") ex.unshift({ machineId: "bw-park-walk", name: "Загрявка: бързо ходене до уредите", machine: ENV.park, group: "cardio", restSec: 0, targetSets: 1, targetReps: 5, targetKg: 0, cue: "Използвай пейка и ниски лостове, ако има", unit: "мин" });
    }
    return { env, title: ENV[env], minutes, exercises: ex, swapped, light,
      note: swapped ? `Сменихме на „${ENV[env]}“ заради ${swapped.why}.` : light ? "По-леко заради умората — една серия по-малко." : "Същите мускулни групи като днешната тренировка, без уреди." };
  }


  /* ---------- Home & Street Fitness: уреди и упражнения ---------- */
  const HS_EQ = { bw: "Собствена тежест", bar: "Лост за набирания", dips: "Успоредка", kb: "Гири (пудовки)", db: "Дъмбели", band: "Ластици",
    trx: "TRX / ремъци", rings: "Халки", rope: "Въже за скачане", bench: "Пейка / стол", wheel: "Колело за корем", mat: "Постелка" };
  const HS_STREET = ["bw", "bar", "dips", "bench", "rope", "rings", "trx"];
  // [име, уреди (поне един), група, ниво 0–2, единица, съвет]
  const HS_EX = [
    ["Клякания", ["bw"], "legs", 0, "повт.", "Петите на земята, коленете над пръстите"],
    ["Гоблет клек", ["kb", "db"], "legs", 0, "повт.", "Тежестта до гърдите, гърбът изправен"],
    ["Български сплит клек", ["bench"], "legs", 1, "повт. на крак", "Задният крак на пейката, торсът изправен"],
    ["Кетълбел суинг", ["kb"], "legs", 1, "повт.", "Движение от таза, не от ръцете"],
    ["Напади с дъмбели", ["db"], "legs", 0, "повт. на крак", "Дълга крачка, коляното леко до земята"],
    ["Глутеус мост с ластик", ["band"], "legs", 0, "повт.", "Ластикът над коленете, бутай коленете навън"],
    ["Скокове от клек", ["bw"], "legs", 1, "повт.", "Меко приземяване"],
    ["Пистол клек към пейка", ["bench"], "legs", 2, "повт. на крак", "Сядай контролирано на пейката"],
    ["Румънска тяга с гира или дъмбели", ["kb", "db"], "back", 0, "повт.", "Права гръб, тазът назад"],
    ["Набирания", ["bar"], "back", 1, "повт.", "Пълно провисване, брадичката над лоста"],
    ["Негативни набирания", ["bar"], "back", 0, "повт.", "Скочи горе, спускай се бавно 3–5 сек"],
    ["Австралийски набирания", ["bar", "trx", "rings"], "back", 0, "повт.", "Ниско хванато, тялото в права линия"],
    ["Висене на лоста", ["bar"], "back", 0, "сек", "Раменете активни, не провисвай в ставите"],
    ["Гребане с ластик", ["band"], "back", 0, "повт.", "Лопатките назад и надолу"],
    ["Гребане с дъмбел", ["db"], "back", 0, "повт. на ръка", "Коляно и ръка на пейка/стол"],
    ["Супермен", ["bw", "mat"], "back", 0, "повт.", "Ръце и крака леко нагоре"],
    ["Лицеви опори", ["bw"], "chest", 0, "повт.", "Тялото в права линия; от колене при нужда"],
    ["Кофички на успоредка", ["dips"], "chest", 1, "повт.", "Леко напред за гърди, раменете далеч от ушите"],
    ["Лицеви опори с ластик", ["band"], "chest", 1, "повт.", "Ластикът през гърба, в ръцете"],
    ["Преса с дъмбели", ["db"], "chest", 0, "повт.", "На пейка или на пода"],
    ["Лицеви опори с крака на пейка", ["bench"], "chest", 1, "повт.", "Повече натоварване за горните гърди"],
    ["Лицеви опори на халки", ["rings"], "chest", 2, "повт.", "Халките близо до тялото"],
    ["Pike лицеви опори", ["bw"], "shoulders", 1, "повт.", "Таза високо, главата между ръцете"],
    ["Преса над глава с ластик", ["band"], "shoulders", 0, "повт.", "Стегнат корем, без извиване в кръста"],
    ["Преса с гира над глава", ["kb"], "shoulders", 1, "повт. на ръка", "Китката права, лакътят под гирата"],
    ["Странично повдигане с дъмбели", ["db"], "shoulders", 0, "повт.", "До височината на раменете"],
    ["Face pull с ластик", ["band"], "shoulders", 0, "повт.", "Към лицето, лактите високо — за стойката"],
    ["Стойка на ръце до стена", ["bw"], "shoulders", 2, "сек", "Само ако се чувстваш уверен"],
    ["Сгъване с ластик", ["band"], "arms", 0, "повт.", "Лактите до тялото"],
    ["Сгъване с дъмбели", ["db"], "arms", 0, "повт.", "Без люлеене"],
    ["Кофички на пейка", ["bench"], "arms", 0, "повт.", "Лактите назад"],
    ["Тесни лицеви опори", ["bw"], "arms", 1, "повт.", "Лактите до тялото"],
    ["Разгъване с ластик над глава", ["band"], "arms", 0, "повт.", "Лактите сочат нагоре"],
    ["Набирания с обратен хват", ["bar"], "arms", 1, "повт.", "Дланите към теб"],
    ["Планк", ["bw", "mat"], "core", 0, "сек", "Корем стегнат, без провисване"],
    ["Повдигане на колене от вис", ["bar"], "core", 1, "повт.", "Без люлеене"],
    ["L-sit на успоредка", ["dips"], "core", 2, "сек", "Краката прави напред"],
    ["Колело за корем", ["wheel"], "core", 1, "повт.", "От колене, кръстът не провисва"],
    ["Руски туист с гира", ["kb"], "core", 0, "повт.", "Бавно, гърбът изправен"],
    ["Мъртва буболечка", ["mat", "bw"], "core", 0, "повт.", "Кръстът опрян в пода"],
    ["Pallof преса с ластик", ["band"], "core", 0, "повт. на страна", "Не позволявай на ластика да те завърти"],
    ["Въже за скачане", ["rope"], "cardio", 0, "мин", "Ниски подскоци на пръсти"],
    ["Бърпи", ["bw"], "cardio", 1, "повт.", "Темпо, при което запазваш техниката"],
    ["Катерач", ["bw"], "cardio", 0, "сек", "Таза ниско"],
    ["Jumping jacks", ["bw"], "cardio", 0, "сек", "Меко приземяване"]
  ].map(([n, eq, g, lv, unit, cue], i) => ({ id: "hs" + i, n, eq, g, lv, unit, cue }));
  function hsList(o) {
    o = o || {}; const have = new Set(["bw"].concat(o.equip || [])); const max = o.level === "adv" ? 2 : o.level === "mid" ? 1 : 1;
    return HS_EX.filter(e => e.eq.some(q => have.has(q)) && (!o.group || e.g === o.group) && (o.all || e.lv <= max));
  }
  function planHome(o) {
    o = o || {};
    const place = o.place === "street" ? "street" : "home";
    const equip = (o.equip || []).filter(q => place === "home" || HS_STREET.includes(q));
    const minutes = Math.max(10, Math.min(60, o.minutes || 30));
    const lvl = o.level === "adv" ? 2 : o.level === "mid" ? 1 : 0;
    const reps = [10, 12, 15][lvl], hold = [20, 30, 45][lvl], sets = [2, 3, 3][lvl];
    const pool = hsList({ equip, level: o.level });
    const usedEq = new Set();
    const score = e => (e.eq.includes("bw") ? 0 : 2) + (e.lv === lvl ? 1 : 0) + (e.eq.some(q => q !== "bw" && equip.includes(q) && !usedEq.has(q)) ? 1.5 : 0);   // избраните уреди, разнообразие, подходящо ниво
    const order = (o.groups && o.groups.length ? o.groups : ["legs", "back", "chest", "core", "shoulders", "arms"]);
    const budget = (minutes - 4) * 60, per = 45 + 45; let used = 0; const out = [], usedIds = new Set();
    for (let round = 0; round < 3 && used < budget; round++) for (const g of order) {
      const c = pool.filter(e => e.g === g && !usedIds.has(e.id)).sort((a, b) => score(b) - score(a))[0]; if (!c) continue;
      const cost = sets * per; if (used + cost > budget) continue; usedIds.add(c.id); used += cost; c.eq.forEach(q => usedEq.add(q));
      out.push({ machineId: "bw-" + c.id, name: c.n, machine: place === "street" ? "Street fitness" : "Home fitness", group: c.g, cue: c.cue, restSec: 45, targetSets: sets, targetKg: 0,
        targetReps: c.unit === "сек" ? hold : c.unit === "мин" ? 2 : reps, unit: c.unit, eq: c.eq.filter(q => q !== "bw" && (equip.includes(q))) });
    }
    const rope = equip.includes("rope") && budget - used >= 180;
    if (rope) out.push({ machineId: "bw-hs-rope", name: "Финал: въже за скачане", machine: place === "street" ? "Street fitness" : "Home fitness", group: "cardio", cue: "Ниски подскоци", restSec: 0, targetSets: 1, targetReps: 3, targetKg: 0, unit: "мин", eq: ["rope"] });
    const names = equip.filter(q => q !== "bw").map(q => HS_EQ[q]);
    return { env: place, title: place === "street" ? "Street fitness" : "Home fitness", minutes, exercises: out, swapped: null,
      note: names.length ? "С твоите уреди: " + names.join(", ") + "." : "Само със собствена тежест." };
  }

  /** Часовник с разминаване на часа: ако времето от устройството е на повече от 5 мин от телефона, ползваме телефона. */
  function trustAt(at, now) { const n = now ? Date.parse(now) : Date.now(); const t = Date.parse(at || ""); return Number.isFinite(t) && Math.abs(t - n) <= 300000 ? new Date(t).toISOString() : new Date(n).toISOString(); }
  const API = { uuid, newSession, apply, replay, summary, completedSets, activeSet, lastByMachine, planQuick, recovery, applyLoad,
    SKIP_REASONS, ALTERNATIVES, validateSkip, alternativesFor, missedDays, resolveSkip,
    planHorizons, revisePlan, monthlyReview, monthIndex, addMonths, GOAL_FOCUS, trustAt, altPlan, ALT_ENV: ENV, HS_EQ, HS_EX, HS_STREET, hsList, planHome };
  if (typeof module !== "undefined" && module.exports) module.exports = API;
  root.FITCore = API;
})(typeof window !== "undefined" ? window : globalThis);
