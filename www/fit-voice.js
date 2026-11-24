/* FIT voice — „Кажи уредите“: гласово (или с текст) казваш кои уреди ще правиш или какво си направил.
   Чистата част (разпознаване на уреди и числа в българския текст, пренареждане, запис на сесия) е тествана в tools/test_voice.mjs.
   Говорът се разпознава от телефона (Android SpeechRecognizer през @capacitor-community/speech-recognition,
   в браузър — Web Speech API). Ако няма микрофон, работи и с микрофона на клавиатурата в текстовото поле. */
(function (root) {
  "use strict";

  /* ---------- речник: как хората наричат уредите ---------- */
  const ALIASES = {
    legpress: ["лег преса", "преса за крака", "легпреса", "лег прес"],
    lat: ["скрипец", "вертикален скрипец", "горен скрипец", "лат машина", "лат пулдаун", "набиране"],
    row: ["гребна машина", "гребане", "гребна", "долен скрипец", "хоризонтален скрипец"],
    cable: ["кабелна кула", "кабели", "кабел", "кросоувър", "кросовър"],
    smith: ["смит", "смит машина"],
    db: ["дъмбели", "дъмбел", "лежанка", "пейка с дъмбели"],
    pec: ["пек дек", "пекдек", "пек-дек", "бътерфлай", "пеперуда"],
    curl: ["сгъване на бедро", "сгъване", "задно бедро", "бицепс бедрен"],
    ext: ["разгъване на бедро", "разгъване", "предно бедро", "квадрицепс"],
    chest: ["машина за гърди", "преса за гърди", "гърди"],
    abs: ["римски стол", "пейка за корем", "корем", "коремни преси"],
    tread: ["бягаща пътека", "пътека", "бягане"],
    bike: ["велоергометър", "колело", "байк", "велоергометъра"],
    ellip: ["кростренажор", "елиптичен", "елипсовиден", "елиптик"],
  };
  const NUMW = {
    "един": 1, "една": 1, "едно": 1, "два": 2, "две": 2, "три": 3, "четири": 4, "пет": 5, "шест": 6, "седем": 7, "осем": 8, "девет": 9, "десет": 10,
    "единадесет": 11, "единайсет": 11, "дванадесет": 12, "дванайсет": 12, "тринадесет": 13, "тринайсет": 13, "четиринадесет": 14, "четиринайсет": 14,
    "петнадесет": 15, "петнайсет": 15, "шестнадесет": 16, "шестнайсет": 16, "осемнадесет": 18, "осемнайсет": 18, "двадесет": 20, "двайсет": 20,
    "тридесет": 30, "трийсет": 30, "четиридесет": 40, "четирийсет": 40, "петдесет": 50, "шестдесет": 60, "седемдесет": 70, "осемдесет": 80,
    "деветдесет": 90, "сто": 100, "половин": 0.5,
  };

  function norm(t) {
    let s = " " + String(t || "").toLowerCase().replace(/ѝ/g, "и").replace(/[„“"'!?;:()«»]/g, " ").replace(/(\d),(\d)/g, "$1.$2").replace(/[,]/g, " ").replace(/\s+/g, " ") + " ";
    s = s.replace(/ ([а-я]+)(?= )/g, (m, w) => (NUMW[w] != null ? " " + NUMW[w] : m));
    s = s.replace(/ (\d0) и (\d)(?= )/g, (m, a, b) => " " + (+a + +b));     // „двадесет и пет“ → 25
    s = s.replace(/ (\d+(?:\.\d+)?) и 0\.5(?= )/g, (m, a) => " " + (+a + 0.5)); // „две и половина“
    return s.replace(/\s+/g, " ");
  }
  function stemRx(phrase) {
    return norm(phrase).trim().split(" ").map((w) => {
      const e = w.replace(/[.*+?^${}()|[\]\\-]/g, "\\$&");
      if (w.length <= 3) return e;
      const st = w.length >= 6 ? w.slice(0, w.length - 2) : w.length === 5 ? w.slice(0, 4) : w;
      return st.replace(/[.*+?^${}()|[\]\\-]/g, "\\$&") + "[а-яa-z-]*";
    }).join("[ -]");
  }
  function aliasesFor(m) {
    const own = String(m.name || "").replace(/\(.*?\)/g, "").trim();
    return (ALIASES[m.id] || []).concat(own ? [own] : []).concat(m.aliases || []);
  }
  function nums(seg) {
    const o = {};
    let m;
    if ((m = /(\d+)\s*(?:x|х|по|на)\s*(\d+)(?!\.\d)(?!\s*(?:кг|кил|kg))/.exec(seg)) && +m[1] <= 10) { o.sets = +m[1]; o.reps = +m[2]; }
    if ((m = /(\d+)\s*сери/.exec(seg))) o.sets = +m[1];
    if ((m = /(\d+(?:\.\d+)?)\s*(?:кг|кила|кило|килограм|kg)/.exec(seg))) o.kg = +m[1];
    if ((m = /(\d+)\s*(?:повт|пъти|път\b)/.exec(seg))) o.reps = +m[1];
    if ((m = /(\d+)\s*мин/.exec(seg))) o.minutes = +m[1];
    if (o.sets != null) o.sets = Math.max(1, Math.min(10, o.sets));
    if (o.reps != null) o.reps = Math.max(1, Math.min(100, o.reps));
    if (o.kg != null) o.kg = Math.max(0, Math.min(500, o.kg));
    return o;
  }
  /** Текст → уредите по реда, в който са казани, с числа (серии, кг, повторения, минути), ако ги има. */
  function parseSpoken(text, machines) {
    const s = norm(text);
    const hits = [];
    (machines || []).forEach((m) => aliasesFor(m).forEach((al) => {
      const rx = new RegExp("(?:^| )(" + stemRx(al) + ")(?= |$)", "g");
      let r;
      while ((r = rx.exec(s))) { const start = r.index + (r[0].startsWith(" ") ? 1 : 0); hits.push({ id: m.id, start, end: start + r[1].length, len: r[1].length }); }
    }));
    hits.sort((a, b) => b.len - a.len || a.start - b.start);
    const taken = [];
    hits.forEach((h) => { if (!taken.some((t) => h.start < t.end && t.start < h.end)) taken.push(h); });
    taken.sort((a, b) => a.start - b.start);
    const out = [];
    taken.forEach((h, i) => {
      const seg = s.slice(h.end, i + 1 < taken.length ? taken[i + 1].start : s.length);
      const prev = out.find((o) => o.id === h.id);
      const n = nums(seg);
      if (prev) { Object.keys(n).forEach((k) => { if (prev[k] == null) prev[k] = n[k]; }); return; }
      out.push(Object.assign({ id: h.id }, n));
    });
    return out;
  }
  /** Пренарежда тренировката: казаните уреди отиват най-отпред, по реда на казване. „Само тези“ маха неначатите останали. */
  function reorder(session, ids, onlyThese, completedCount) {
    const done = completedCount || ((e) => session.sets.filter((x) => x.exerciseId === e.id && x.state === "completed").length);
    const active = session.sets.find((x) => x.state === "active");
    const left = session.exercises.slice(), first = [], toAdd = [];
    ids.forEach((id) => { const i = left.findIndex((e) => e.machineId === id); if (i >= 0) first.push(left.splice(i, 1)[0]); else if (!toAdd.includes(id)) toAdd.push(id); });
    let rest = left, removed = 0;
    if (onlyThese) { rest = left.filter((e) => done(e) > 0 || (active && active.exerciseId === e.id)); removed = left.length - rest.length; }
    return { exercises: first.concat(rest), toAdd, removed, firstId: first[0] ? first[0].id : null };
  }
  /** Записва вече направена тренировка (казана след това) като завършена сесия с потвърдени серии. */
  function loggedSession(FC, items, opts) {
    opts = opts || {};
    const per = 3 * 60 * 1000;
    const total = items.reduce((n, it) => n + (it.sets || 1), 0);
    const end = opts.end ? Date.parse(opts.end) : Date.now();
    let t = end - total * per - 60000;
    const iso = (ms) => new Date(ms).toISOString();
    let s = FC.newSession({ exercises: items.map((it) => it.exercise), kind: opts.kind || "voice", date: opts.date, at: iso(t) });
    s = FC.apply(s, { type: "START_WORKOUT", at: iso(t) });
    items.forEach((it, i) => {
      const e = s.exercises[i];
      s = FC.apply(s, { type: "SWITCH_EXERCISE", exerciseId: e.id, at: iso(t) });
      for (let k = 0; k < (it.sets || e.targetSets || 1); k++) {
        const id = FC.uuid();
        s = FC.apply(s, { type: "START_SET", setId: id, at: iso(t) });
        t += per - 60000;
        s = FC.apply(s, { type: "COMPLETE_SET", setId: id, reps: it.reps != null ? it.reps : e.targetReps, weightKg: it.kg != null ? it.kg : (e.targetKg || 0), restSec: 0, source: "voice", at: iso(t) });
        t += 60000;
      }
    });
    s = FC.apply(s, { type: "END_WORKOUT", at: iso(Math.max(t, end - 1000)) });
    s.voice = true;
    return s;
  }

  const FV = { ALIASES, norm, parseSpoken, reorder, loggedSession, nums };
  if (typeof module !== "undefined" && module.exports) { module.exports = FV; return; }
  root.FITVoice = FV;

  /* ---------- микрофон ---------- */
  async function listen() {
    const SR = root.Capacitor && root.Capacitor.Plugins && root.Capacitor.Plugins.SpeechRecognition;
    if (SR) {
      try {
        const av = await SR.available(); if (!av || !av.available) throw { code: "no_speech" };
        try { const p = await SR.checkPermissions(); if (p.speechRecognition !== "granted") { const q = await SR.requestPermissions(); if (q.speechRecognition !== "granted") throw { code: "denied" }; } } catch (e) { if (e && e.code === "denied") throw e; }
        const r = await SR.start({ language: "bg-BG", maxResults: 3, prompt: "Кажи уредите — напр. „лег преса, гребна, пътека 10 минути“", partialResults: false, popup: true });
        return (r && r.matches && r.matches[0]) || "";
      } catch (e) { if (e && e.code) throw e; throw { code: "no_speech" }; }
    }
    const W = root.SpeechRecognition || root.webkitSpeechRecognition;
    if (!W) throw { code: "no_speech" };
    return new Promise((res, rej) => {
      const r = new W(); r.lang = "bg-BG"; r.interimResults = false; r.maxAlternatives = 1;
      r.onresult = (e) => res(e.results[0][0].transcript); r.onerror = (e) => rej({ code: e.error === "not-allowed" ? "denied" : "no_speech" }); r.onend = () => res("");
      try { r.start(); } catch (e) { rej({ code: "no_speech" }); }
    });
  }
  FV.listen = listen;

  /* ---------- интеграция с приложението (вика се в края на index.html) ---------- */
  FV.install = function () {
    const G = root;
    const say = (h) => { const p = P(); p.voiceLog = (p.voiceLog || []).concat([{ at: new Date().toISOString(), text: String(h).slice(0, 300) }]).slice(-30); };
    const allMachines = () => machineList().map((m) => ({ id: m.id, name: m.name, group: m.group }));

    // упражнение за даден уред: от днешната програма, иначе първото позволено упражнение на уреда
    function exFor(id) {
      const p = P();
      const pl = planExercises().find((e) => e.machineId === id);
      const last = lastSettings()[id];
      if (pl) return Object.assign({}, pl, { targetKg: last ? last.weightKg : pl.targetKg });
      const c = pool(p).find((x) => x.eq === id);
      const m = machineList().find((x) => x.id === id) || { id, name: id, group: "" };
      if (c) {
        const [s, r] = presc(p, c.ex[2]); const q = parsePresc(s, r, c.ex[2]);
        return { machineId: id, name: c.ex[0], machine: c.eqn, group: c.ex[2], cue: c.ex[3], restSec: q.rest, targetSets: q.sets, targetReps: q.reps, targetKg: last ? last.weightKg : ((m.def && m.def.kg) || 0) };
      }
      return { machineId: id, name: m.name, machine: m.name, group: m.group, restSec: (m.def && m.def.rest) || 90, targetSets: (m.def && m.def.sets) || 3, targetReps: (m.def && m.def.reps) || 10, targetKg: last ? last.weightKg : ((m.def && m.def.kg) || 0) };
    }
    function withNums(e, it) {
      const o = Object.assign({}, e);
      if (it.sets) o.targetSets = it.sets;
      if (e.group === "cardio") { if (it.minutes) o.targetReps = it.minutes; }
      else { if (it.reps) o.targetReps = it.reps; if (it.kg != null) o.targetKg = it.kg; }
      return o;
    }
    const chipsOf = (picks) => picks.map((it) => { const m = allMachines().find((x) => x.id === it.id); const bits = [it.sets ? it.sets + " серии" : "", it.kg != null ? it.kg + " кг" : "", it.reps ? it.reps + " повт." : "", it.minutes ? it.minutes + " мин" : ""].filter(Boolean).join(" · ");
      return `<span class="chip" aria-pressed="true" style="cursor:default">${esc(m ? m.name : it.id)}${bits ? ` <b class="mono" style="margin-left:6px">${esc(bits)}</b>` : ""}</span>`; }).join("");

    /* mode: "plan" — какво ще правя сега; "done" — какво направих (дата d) */
    function voiceSheet(mode, d) {
      let text = "", only = false, remember = false;
      const day = d || todayISO();
      const dn = new Date(day + "T12:00:00").toLocaleDateString("bg-BG", { weekday: "long", day: "numeric", month: "long" });
      const draw = () => {
        const picks = parseSpoken(text, allMachines());
        sheet(`<div class="grab"></div><p class="eyebrow">${mode === "done" ? "Какво направих · " + esc(dn) : "Днес правя"}</p>
          <div class="h2">${mode === "done" ? "Кажи кои уреди използва" : "Кажи кои уреди ще правиш"}</div>
          <button class="btn hot block voice-mic" id="vcMic" type="button" style="min-height:76px;font-size:20px">🎙 Говори</button>
          <textarea class="in" id="vcTxt" rows="3" placeholder="${mode === "done" ? "напр. „лег преса 3 серии по 80 кг, гребна 3 по 12, пътека 15 минути“" : "напр. „лег преса, скрипец, пек дек и накрая пътека“"}" style="resize:vertical">${esc(text)}</textarea>
          <p class="note" style="margin:0">Може и с микрофона на клавиатурата. Числата са по желание — без тях FIT взима последните ти килограми.</p>
          ${picks.length ? `<div class="chips">${chipsOf(picks)}</div>` : (text.trim() ? `<p class="muted" style="margin:0">Не разпознах уред. Кажи името, напр. „лег преса“, „гребна“, „пътека“.</p>` : "")}
          ${mode === "plan" && liveSession() ? `<label class="row" style="gap:10px;align-items:center"><input type="checkbox" id="vcOnly" ${only ? "checked" : ""} style="width:22px;height:22px"> Само тези уреди днес (махни неначатите)</label>` : ""}
          ${mode === "done" ? `<label class="row" style="gap:10px;align-items:center"><input type="checkbox" id="vcRem" ${remember ? "checked" : ""} style="width:22px;height:22px"> Запомни ги като моя програма за ${esc(new Date(day + "T12:00:00").toLocaleDateString("bg-BG", { weekday: "long" }))}</label>` : ""}
          <button class="btn block" id="vcGo" type="button" ${picks.length ? "" : "disabled"}>${mode === "done" ? "Запиши и преизчисли" : liveSession() ? "Подреди тренировката" : "Започни с тези уреди"}</button>
          <button class="btn ghost block" data-close type="button">Затвори</button>`, (h) => {
          h.querySelectorAll("[data-close]").forEach((b) => (b.onclick = closeSheet));
          const ta = $("#vcTxt");
          ta.oninput = () => { text = ta.value; clearTimeout(ta._t); ta._t = setTimeout(() => { const pos = ta.selectionStart; draw(); const t2 = $("#vcTxt"); t2.focus(); try { t2.setSelectionRange(pos, pos); } catch (e) {} }, 700); };
          const o = $("#vcOnly"); if (o) o.onchange = () => (only = o.checked);
          const rm = $("#vcRem"); if (rm) rm.onchange = () => (remember = rm.checked);
          $("#vcMic").onclick = async () => {
            const b = $("#vcMic"); b.disabled = true; b.textContent = "🎙 Слушам…";
            try { const t = await listen(); if (t) { text = (text.trim() ? text.trim() + ", " : "") + t; } draw(); }
            catch (e) { b.disabled = false; b.textContent = "🎙 Говори"; toast("Микрофон", e.code === "denied" ? "Разреши микрофона за FIT в настройките на телефона." : "Гласът не е наличен тук — ползвай микрофона на клавиатурата в полето."); $("#vcTxt").focus(); }
          };
          $("#vcGo").onclick = () => { const pk = parseSpoken(text, allMachines()); if (!pk.length) return; say(text); mode === "done" ? applyDone(pk, day, remember) : applyPlan(pk, only); };
        });
      };
      draw();
    }
    function applyPlan(picks, only) {
      const s = liveSession();
      if (!s) {
        closeSheet();
        const ex = picks.map((it) => withNums(exFor(it.id), it));
        return recoverySheet((l) => { startLive(ex, "voice", l); toast("Започваме", "Първи: " + (ex[0].machine || ex[0].name)); });
      }
      const r = reorder(s, picks.map((p) => p.id), only, (e) => FITCore.completedSets(s, e.id).length);
      const n = JSON.parse(JSON.stringify(s));
      n.exercises = r.exercises.map((e) => { const it = picks.find((p) => p.id === e.machineId); return it ? withNums(e, it) : e; });
      n.version += 1; n.updatedAt = new Date().toISOString();
      persistLive(n);
      r.toAdd.forEach((id) => { const it = picks.find((p) => p.id === id); liveDo({ type: "ADD_EXERCISE", exerciseId: FITCore.uuid(), exercise: withNums(exFor(id), it) }); });
      // добавените също по реда на казване
      const s2 = liveSession(); const order = picks.map((p) => p.id);
      const m2 = JSON.parse(JSON.stringify(s2));
      const said = m2.exercises.filter((e) => order.includes(e.machineId)).sort((a, b) => order.indexOf(a.machineId) - order.indexOf(b.machineId));
      m2.exercises = said.concat(m2.exercises.filter((e) => !order.includes(e.machineId)));
      persistLive(m2);
      const s3 = liveSession(); const firstOpen = s3.exercises.find((e) => order.includes(e.machineId) && FITCore.completedSets(s3, e.id).length < e.targetSets);
      if (firstOpen && !FITCore.activeSet(s3) && s3.state === "active" && s3.activeExerciseId !== firstOpen.id) liveDo({ type: "SWITCH_EXERCISE", exerciseId: firstOpen.id });
      closeSheet(); show("live");
      toast("Подредено ✓", picks.length + (picks.length === 1 ? " уред" : " уреда") + " най-отпред" + (r.removed ? " · махнати " + r.removed : "") + (r.toAdd.length ? " · добавени " + r.toAdd.length : ""));
    }
    function applyDone(picks, day, remember) {
      const p = P();
      const items = picks.map((it) => { const e = withNums(exFor(it.id), it); return { exercise: e, sets: it.sets || e.targetSets, reps: e.group === "cardio" ? (it.minutes || e.targetReps) : (it.reps || e.targetReps), kg: e.group === "cardio" ? 0 : (it.kg != null ? it.kg : e.targetKg) }; });
      const endAt = day === todayISO() ? new Date().toISOString() : day + "T19:00:00.000Z";
      const s = loggedSession(FITCore, items, { date: day, end: endAt });
      const w = wk(); w.sessions.push(s); if (w.sessions.length > 80) w.sessions = w.sessions.slice(-80);
      p.log[day] = p.log[day] || {}; p.log[day].session = s.id; p.log[day].voice = true;
      // „преизчисли“: следващите цели тръгват от казаните килограми (lastByMachine), уредите се запомнят като предпочитани
      p.prefMachines = p.prefMachines || {};
      picks.forEach((it) => { const g = (exFor(it.id).group) || "other"; p.prefMachines[g] = it.id; });
      if (remember) {
        const di = dayIndexFor(p, new Date(day + "T12:00:00").getDay());
        if (di >= 0) { p.myDays = p.myDays || {}; p.myDays[di] = picks.map((it) => it.id); }
        else { p.myDays = p.myDays || {}; p.myDays.extra = picks.map((it) => it.id); }
      }
      save();
      if (day === todayISO()) { if (!p.log[day].complete) markWorkoutDone(); }
      else { p.log[day].complete = true; p.log[day].missed = null; save(); }
      closeSheet();
      const sm = FITCore.summary(s);
      sheet(`<div class="grab"></div><p class="eyebrow">Записано</p><div class="h2">Браво — ${sm.sets} серии</div>
        <div>${sm.exercises.map((x) => `<div class="ex-meta">${esc(x.name)} · ${x.sets} серии</div>`).join("")}</div>
        <p class="muted" style="margin:0">Следващите ти цели тръгват от тези килограми.${remember ? " Запомних ги като твоя програма за този ден." : " Уредите са запомнени като предпочитани за тези мускули."}</p>
        <button class="btn block" data-close type="button">Супер</button>`, (h) => h.querySelectorAll("[data-close]").forEach((b) => (b.onclick = () => { closeSheet(); render(); })));
    }
    FV.voiceSheet = voiceSheet;

    // „Моята програма“: запомнените уреди за деня заменят автоматичния избор; предпочитаните уреди са първи за мускулната група
    const baseBuild = G.buildDay;
    G.buildDay = function (p, dayIdx) {
      const r = baseBuild.apply(this, arguments);
      try {
        const mine = p.myDays && p.myDays[dayIdx];
        if (mine && mine.length) {
          const pl = pool(p); const list = [];
          mine.forEach((id) => { const c = pl.find((x) => x.eq === id && !list.includes(x)); if (c) list.push(c); });
          if (list.length) { list.sort((a, b) => (a.ex[2] === "cardio") - (b.ex[2] === "cardio")); return { split: r.split, list, mine: true }; }
        }
        const pref = p.prefMachines || {};
        if (Object.keys(pref).length) {
          const pl = pool(p);
          r.list = r.list.map((it) => { const want = pref[it.ex[2]]; if (!want || it.eq === want || r.list.some((o) => o.eq === want)) return it; return pl.find((x) => x.eq === want && x.ex[2] === it.ex[2]) || it; });
        }
      } catch (e) {}
      return r;
    };

    // бутони: в „Днес“, в „Тренировка на живо“ и в прозореца за пропусната тренировка
    const btnHTML = (id, label, sub) => `<button class="card voice-cta" id="${id}" type="button" style="display:flex;gap:12px;align-items:center;text-align:left;border:2px solid var(--hot)"><span aria-hidden="true" style="font-size:28px">🎙</span><span><b style="display:block;font-size:16px">${label}</b><span class="ex-meta">${sub}</span></span></button>`;
    const baseToday = G.rToday;
    G.rToday = function () {
      baseToday.apply(this, arguments);
      const v = $("#v-today"); if (!v || !P() || $("#vcToday")) return;
      const p = P(); const t = todayISO(); const done = p && p.log[t] && p.log[t].complete;
      v.insertAdjacentHTML("afterbegin", liveSession() ? "" : btnHTML("vcToday", done ? "Направи още? Кажи какво" : "Кажи уредите за днес", "Гласово: кои уреди ще правиш — или какво вече направи"));
      const b = $("#vcToday"); if (!b) return;
      b.onclick = () => sheet(`<div class="grab"></div><p class="eyebrow">Глас</p><div class="h2">Какво искаш да кажеш?</div>
        <button class="btn hot block" id="vcA" type="button" style="min-height:64px">Ще правя тези уреди сега</button>
        <button class="btn block" id="vcB" type="button" style="min-height:64px">Вече тренирах — ето какво направих</button>
        <button class="btn ghost block" data-close type="button">Затвори</button>`, (h) => {
        h.querySelectorAll("[data-close]").forEach((x) => (x.onclick = closeSheet));
        $("#vcA").onclick = () => voiceSheet("plan"); $("#vcB").onclick = () => voiceSheet("done");
      });
    };
    const baseLive = G.rLive;
    G.rLive = function () {
      baseLive.apply(this, arguments);
      const v = $("#v-live"); if (!v || !P() || $("#vcLive")) return;
      const s = liveSession(); if (s && FITCore.activeSet(s)) return;
      const hdr = v.firstElementChild;
      const html = btnHTML("vcLive", s ? "Кажи уредите — подреждам" : "Кажи уредите и започни", s ? "Казаните отиват най-отпред, по реда на казване" : "напр. „лег преса, гребна, пътека“");
      if (s && hdr) hdr.insertAdjacentHTML("afterend", html); else v.insertAdjacentHTML("beforeend", html);
      $("#vcLive").onclick = () => voiceSheet("plan");
    };
    const baseMissed = G.missedSheet;
    G.missedSheet = function (d) {
      baseMissed.apply(this, arguments);
      const done = document.getElementById("msDone"); if (!done || document.getElementById("vcMiss")) return;
      const b = document.createElement("button"); b.className = "btn block"; b.id = "vcMiss"; b.type = "button"; b.textContent = "🎙 Направих друго — ще кажа какво";
      b.style.cssText = "border:2px solid var(--hot)"; b.onclick = () => voiceSheet("done", d); done.after(b);
    };
  };
})(typeof window !== "undefined" ? window : globalThis);
