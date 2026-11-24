/* FIT livebar — докато тече тренировка, тя е основният екран:
   • ярка лента (оранжево = серия, зелено = почивка, синьо = готов) на всеки екран, с голям бутон за следващото действие;
   • при отваряне или връщане в приложението FIT отива направо в „Тренировка на живо“;
   • екранът не изгасва по време на тренировка (Screen Wake Lock), а бутоните са едри и контрастни. */
(function (root) {
  "use strict";
  const css = `
  .lb{position:fixed;left:8px;right:8px;bottom:calc(var(--tab-h, 64px) + 8px + env(safe-area-inset-bottom,0px));z-index:35;border-radius:18px;
      display:flex;align-items:center;gap:10px;padding:10px 10px 10px 14px;color:#fff;box-shadow:0 10px 30px rgba(0,0,0,.35);font-weight:800}
  .lb[data-st=set]{background:#FF6A1A}.lb[data-st=rest]{background:#0FA958}.lb[data-st=ready]{background:#2340E8}.lb[data-st=paused]{background:#5A6472}
  .lb .lb-t{flex:1;min-width:0;display:flex;flex-direction:column;line-height:1.15}
  .lb .lb-k{font-size:11px;letter-spacing:.12em;opacity:.9}.lb .lb-n{font-size:16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .lb .lb-c{font:900 22px/1 ui-monospace,monospace;min-width:64px;text-align:right}
  .lb button{border:0;border-radius:14px;min-height:56px;padding:0 16px;font:900 16px/1 system-ui,sans-serif;background:#fff;color:#111;cursor:pointer}
  .lb .lb-open{background:rgba(255,255,255,.18);color:#fff;min-width:56px;padding:0 12px}
  body.on-live .lb{display:none}
  body.has-lb:not(.on-live) .toast{bottom:calc(var(--tab-h, 64px) + 100px + env(safe-area-inset-bottom,0px))}
  body.live-on .live-main{min-height:96px!important;font-size:24px!important;font-weight:900!important;border-radius:22px!important}
  body.live-on #lvStart{background:#2340E8!important;color:#fff!important}
  body.live-on #lvEnd{background:#FF6A1A!important;color:#fff!important}
  body.live-on #lvResume{background:#0FA958!important;color:#fff!important}
  body.live-on .live-state{font-size:18px!important;padding:12px 20px!important}
  body.live-on .live-clock{font-size:44px!important}
  body.live-on .rest-ring .mono{font-size:64px!important;color:#0FA958}
  body.live-on .stepper button{min-width:64px!important;min-height:64px!important;font-size:30px!important}
  body.live-on .stepper b{font-size:28px!important}
  body.live-on.has-lb main{padding-bottom:96px}`;
  function el() { let b = document.getElementById("liveBar"); if (!b) { b = document.createElement("div"); b.id = "liveBar"; b.className = "lb"; b.setAttribute("role", "region"); b.setAttribute("aria-label", "Тренировка на живо"); document.body.appendChild(b); } return b; }

  let lock = null, timer = null;
  async function wake(on) {
    try {
      if (on && !lock && navigator.wakeLock && document.visibilityState === "visible") { lock = await navigator.wakeLock.request("screen"); lock.addEventListener("release", () => (lock = null)); }
      if (!on && lock) { await lock.release(); lock = null; }
    } catch (e) { lock = null; }
  }
  const mmss = (sec) => Math.floor(sec / 60) + ":" + String(sec % 60).padStart(2, "0");

  function paint() {
    let s = null; try { s = P() ? liveSession() : null; } catch (e) {}
    const on = !!(s && (s.state === "active" || s.state === "paused"));
    document.body.classList.toggle("live-on", on);
    document.body.classList.toggle("has-lb", on);
    wake(on);
    const b = el();
    if (!on) { b.hidden = true; return; }
    b.hidden = false;
    const FC = root.FITCore, act = FC.activeSet(s);
    const e = s.exercises.find((x) => x.id === s.activeExerciseId) || s.exercises[0];
    const done = e ? FC.completedSets(s, e.id).length : 0;
    const resting = !act && s.restUntil && Date.parse(s.restUntil) > Date.now();
    const st = s.state === "paused" ? "paused" : act ? "set" : resting ? "rest" : "ready";
    const name = e ? (String(e.machineId).startsWith("bw-") ? e.name : (e.machine || e.name)) : "";
    const kind = { set: "СЕРИЯ " + (done + 1), rest: "ПОЧИВКА", ready: "СЛЕДВА · серия " + (done + 1) + "/" + (e ? e.targetSets : 0), paused: "ПАУЗА" }[st];
    const clock = st === "rest" ? mmss(Math.max(0, Math.ceil((Date.parse(s.restUntil) - Date.now()) / 1000))) : st === "set" ? mmss(Math.max(0, Math.round((Date.now() - Date.parse(act.startedAt)) / 1000))) : "";
    const action = { set: "Край ✓", rest: "Пропусни", ready: "Старт", paused: "Продължи" }[st];
    const key = st + "|" + name + "|" + kind + "|" + action;
    if (b._key !== key) {
      b._key = key; b.dataset.st = st;
      b.innerHTML = `<span class="lb-t"><span class="lb-k">${esc(kind)}</span><span class="lb-n">${esc(name)}</span></span><span class="lb-c mono" id="lbClock"></span>
        <button type="button" id="lbAct">${esc(action)}</button><button type="button" class="lb-open" id="lbOpen" aria-label="Отвори тренировката">⤢</button>`;
      document.getElementById("lbOpen").onclick = () => show("live");
      document.getElementById("lbAct").onclick = () => {
        const s2 = liveSession(); if (!s2) return; const a2 = FC.activeSet(s2);
        if (s2.state === "paused") liveDo({ type: "RESUME_WORKOUT" });
        else if (a2) { liveDo({ type: "COMPLETE_SET", setId: a2.id, reps: a2.reps, weightKg: a2.weightKg, source: "manual" }); buzz(60); autoAdvance(); }
        else if (s2.restUntil && Date.parse(s2.restUntil) > Date.now()) liveDo({ type: "SKIP_REST" });
        else { const e2 = s2.exercises.find((x) => x.id === s2.activeExerciseId); const c = FC.completedSets(s2, e2.id); const prev = c[c.length - 1];
          liveDo({ type: "START_SET", setId: FC.uuid(), weightKg: prev ? prev.weightKg : e2.targetKg, reps: prev ? prev.reps : e2.targetReps }); buzz(30); }
        paint(); if (TAB === "live") rLive();
      };
    }
    const c = document.getElementById("lbClock"); if (c) c.textContent = clock;
    if (st === "rest" && Date.parse(s.restUntil) <= Date.now() + 400 && TAB !== "live") { buzz([120, 80, 120]); try { dropSound(); } catch (e) {} liveDo({ type: "SKIP_REST" }); }
  }

  root.FITLiveBar = {
    install() {
      const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
      // всяка промяна по тренировката обновява лентата
      const bp = root.persistLive; root.persistLive = function () { const r = bp.apply(this, arguments); setTimeout(paint, 0); return r; };
      const bs = root.show; root.show = function () { const r = bs.apply(this, arguments); paint(); return r; };
      clearInterval(timer); timer = setInterval(paint, 1000);
      // тренировката е основната функция: при отваряне/връщане — направо в нея
      const goLive = () => { try { const s = liveSession(); if (s && (s.state === "active" || s.state === "paused") && TAB !== "live" && !document.querySelector(".scrim")) show("live"); } catch (e) {} };
      document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") { lock = null; paint(); setTimeout(goLive, 200); } });
      setTimeout(() => { goLive(); paint(); }, 1500);
    },
    paint,
  };
})(window);
