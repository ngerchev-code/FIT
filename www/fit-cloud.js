/* FIT cloud — архив в облака без акаунт, отчети за грешки (само със съгласие), политика за поверителност.
   Чистата част (код за възстановяване, криптиране) е тествана в tools/test_cloud.mjs.
   Сървърът никога не вижда кода и данните: вижда само хеш на кода и криптиран блок (AES-GCM). */
(function (root) {
  "use strict";
  const C = root.crypto;
  const ALPH = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"; // Crockford base32, без I, L, O, U
  const enc = new TextEncoder(), dec = new TextDecoder();
  const b64 = (u8) => { let s = ""; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };
  const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  const hex = (buf) => Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");

  function newCode() {
    const r = C.getRandomValues(new Uint8Array(20));
    const s = Array.from(r, (b) => ALPH[b & 31]).join("");
    return s.match(/.{5}/g).join("-");
  }
  function normCode(s) {
    const t = String(s || "").toUpperCase().replace(/O/g, "0").replace(/[IL]/g, "1").replace(/[^0-9A-Z]/g, "");
    if (t.length !== 20 || [...t].some((c) => !ALPH.includes(c))) return "";
    return t.match(/.{5}/g).join("-");
  }
  async function backupId(code) {
    const c = normCode(code); if (!c) throw { code: "bad_code" };
    return hex(await C.subtle.digest("SHA-256", enc.encode("fit-backup-id:" + c)));
  }
  async function keyFor(code, salt) {
    const base = await C.subtle.importKey("raw", enc.encode(normCode(code)), "PBKDF2", false, ["deriveKey"]);
    return C.subtle.deriveKey({ name: "PBKDF2", salt, iterations: 200000, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
  }
  async function pipe(u8, Stream) {
    const s = new Blob([u8]).stream().pipeThrough(new Stream("gzip"));
    return new Uint8Array(await new Response(s).arrayBuffer());
  }
  async function encrypt(obj, code) {
    let data = enc.encode(JSON.stringify(obj)); let z = 0;
    if (root.CompressionStream) { try { data = await pipe(data, root.CompressionStream); z = 1; } catch (e) {} }
    const salt = C.getRandomValues(new Uint8Array(16)), iv = C.getRandomValues(new Uint8Array(12));
    const ct = new Uint8Array(await C.subtle.encrypt({ name: "AES-GCM", iv }, await keyFor(code, salt), data));
    return { v: 1, z, salt: b64(salt), iv: b64(iv), ct: b64(ct) };
  }
  async function decrypt(box, code) {
    if (!box || box.v !== 1) throw { code: "bad_format" };
    let data;
    try { data = new Uint8Array(await C.subtle.decrypt({ name: "AES-GCM", iv: unb64(box.iv) }, await keyFor(code, unb64(box.salt)), unb64(box.ct))); }
    catch (e) { throw { code: "wrong_code" }; }
    if (box.z) { if (!root.DecompressionStream) throw { code: "no_gzip" }; data = await pipe(data, root.DecompressionStream); }
    return JSON.parse(dec.decode(data));
  }
  // Проверка на файл/архив, преди да заменим данните на телефона.
  function checkData(d) {
    if (!d || typeof d !== "object" || !Array.isArray(d.people)) return null;
    return { profiles: d.people.length, names: d.people.map((p) => String((p && p.name) || "").slice(0, 30)).filter(Boolean) };
  }
  function fromExport(txt) {
    let j; try { j = JSON.parse(txt); } catch (e) { return null; }
    const d = j && j.app === "FIT" && j.data ? j.data : j;
    return checkData(d) ? d : null;
  }
  // Отчет за грешка: без лични данни — само съобщение, файл/ред, стек (съкратен), версия и екран.
  function errRecord(msg, stack, src, extra) {
    const clean = (s, n) => String(s || "").replace(/sk-ant-[\w-]+/g, "sk-ant-***").replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "***@***").slice(0, n);
    return Object.assign({ t: new Date().toISOString(), m: clean(msg, 300), s: clean(stack, 900), src: clean(src, 160) }, extra || {});
  }

  const FCL = { newCode, normCode, backupId, encrypt, decrypt, checkData, fromExport, errRecord };
  if (typeof module !== "undefined" && module.exports) { module.exports = FCL; return; }
  root.FCL = FCL;

  /* ---------- устройство и дневник на грешките (работи от първата секунда) ---------- */
  const LS = (k, v) => { try { if (v === undefined) return JSON.parse(localStorage.getItem(k) || "null"); localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } };
  FCL.device = function () {
    let d = LS("fit_dev"); if (!d) { d = "d" + hex(C.getRandomValues(new Uint8Array(8)).buffer); LS("fit_dev", d); } return d;
  };
  const diag = () => LS("fit_diag") || [];
  function logErr(msg, stack, src) {
    if (/ResizeObserver loop|Script error\.?$/.test(String(msg || ""))) return;
    let b = 0, tab = ""; try { b = BUILD; tab = TAB; } catch (e) {} // let в index.html — не са свойства на window
    const L = diag(); const r = errRecord(msg, stack, src, { b, tab, ua: navigator.userAgent.slice(0, 120) });
    const last = L[L.length - 1]; if (last && last.m === r.m && last.s === r.s) { last.n = (last.n || 1) + 1; last.t = r.t; last.sent = 0; }
    else L.push(r);
    LS("fit_diag", L.slice(-30)); clearTimeout(FCL._st); FCL._st = setTimeout(() => FCL.sendDiag && FCL.sendDiag(), 5000);
  }
  root.addEventListener("error", (e) => logErr(e.message, e.error && e.error.stack, (e.filename || "").split("/").pop() + ":" + e.lineno + ":" + e.colno));
  root.addEventListener("unhandledrejection", (e) => { const r = e.reason || {}; if (r && r.code && !r.stack) return; logErr("Promise: " + (r.message || r.code || String(r)), r.stack, ""); });

  /* ---------- интеграция с приложението (вика се в края на index.html) ---------- */
  FCL.install = function () {
    const G = root; // функциите (function) са свойства на window; const/let (S, $, esc, KEY…) се четат по име
    const BK = "fit_backup";
    const bk = () => Object.assign({ on: false }, LS(BK) || {});
    const srv = () => { const u = (S && S.ai && S.ai.url) || ""; return u ? u.replace(/\/api\/scan\/?$/, "").replace(/\/+$/, "") : ""; };
    const diagOk = () => !!(S && S.consent && S.consent.diag === true);
    const when = (iso) => iso ? new Date(iso).toLocaleString("bg-BG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "никога";
    const POLICY = "https://ngerchev-code.github.io/FIT/privacy.html";

    // Съгласие за отчети — изрично, по подразбиране изключено.
    if (Array.isArray(CONSENT_ITEMS) && !CONSENT_ITEMS.some((x) => x[0] === "diag"))
      CONSENT_ITEMS.push(["diag", "Отчети за грешки", "Ако FIT се срине, кратък технически отчет без лични данни отива при разработчика. По подразбиране е изключено."]);

    FCL.sendDiag = async function () {
      const s = srv(); if (!s || !diagOk() || !navigator.onLine) return;
      const L = diag(), todo = L.filter((x) => !x.sent); if (!todo.length) return;
      try {
        const r = await fetch(s + "/api/report", { method: "POST", headers: { "content-type": "application/json", "x-fit-device": FCL.device() }, body: JSON.stringify({ build: BUILD || 0, errors: todo }) });
        if (r.ok) { todo.forEach((x) => (x.sent = 1)); LS("fit_diag", L); }
      } catch (e) {}
    };

    async function backupNow(silent) {
      const b = bk(), s = srv();
      if (!b.code) { if (!silent) G.toast("Архив", "Първо включи архива."); return false; }
      if (!s) { if (!silent) G.toast("Архив", "Нужен е FIT сървърът — меню → AI разпознаване → адрес на сървъра."); return false; }
      try {
        const data = JSON.parse(JSON.stringify(S)); if (data.ai) delete data.ai.key;
        const box = await encrypt({ app: "FIT", format: 1, at: new Date().toISOString(), data }, b.code);
        const body = JSON.stringify({ id: await backupId(b.code), box });
        if (body.length > 4_500_000) throw { code: "too_big" };
        const r = await fetch(s + "/api/backup", { method: "PUT", headers: { "content-type": "application/json", "x-fit-device": FCL.device() }, body });
        if (!r.ok) throw { code: r.status === 429 ? "rate_limited" : "upstream_error" };
        b.at = new Date().toISOString(); b.kb = Math.round(body.length / 1024); LS(BK, b);
        if (!silent) G.toast("Архив", "Копието е запазено в облака (" + b.kb + " KB, криптирано).");
        return true;
      } catch (e) {
        if (!silent) G.toast("Архив", e.code === "too_big" ? "Данните са твърде големи за архива (над 4 MB) — изтегли ги като файл." : e.code === "rate_limited" ? "Твърде много архиви днес — опитай утре." : "Няма връзка със сървъра. Ще опитам пак при следващото отваряне.");
        return false;
      }
    }
    FCL.backupNow = backupNow;

    function confirmRestore(data, code, from) {
      const info = checkData(data); if (!info) return G.toast("Възстановяване", "Файлът не е архив на FIT.");
      G.sheet(`<div class="grab"></div><p class="eyebrow">Възстановяване · ${esc(from)}</p><div class="h2">Да заменя ли данните на този телефон?</div>
        <p style="margin:0">В архива: <b>${info.profiles}</b> ${info.profiles === 1 ? "профил" : "профила"}${info.names.length ? " — " + esc(info.names.join(", ")) : ""}.</p>
        <p class="note" style="margin:0">Текущите данни на FIT на това устройство ще бъдат заменени. Личният ключ за Claude не се пази в архива.</p>
        <button class="btn block" id="rsGo" type="button">Възстанови</button><button class="btn ghost block" data-close type="button">Отказ</button>`, () => {
        $("#rsGo").onclick = () => {
          const keep = S && S.ai ? S.ai : null; if (keep && !data.ai) data.ai = keep;
          try { localStorage.setItem(KEY, JSON.stringify(data)); if (code) LS(BK, Object.assign(bk(), { code, on: true, at: new Date().toISOString() })); } catch (e) { return G.toast("Възстановяване", "Няма място в паметта на телефона."); }
          location.reload();
        };
      });
    }
    function restoreCodeSheet() {
      G.sheet(`<div class="grab"></div><p class="eyebrow">Възстановяване от облака</p><div class="h2">Въведи кода за възстановяване</div>
        <input class="in" id="rcIn" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="XXXXX-XXXXX-XXXXX-XXXXX" style="font-family:ui-monospace,monospace;letter-spacing:.06em">
        <p class="note" style="margin:0">Кодът се проверява само на телефона. Без него архивът не може да се отвори — и ние не можем да го отворим.</p>
        <button class="btn block" id="rcGo" type="button">Намери архива</button><button class="btn ghost block" data-close type="button">Отказ</button>`, () => {
        $("#rcGo").onclick = async () => {
          const code = normCode($("#rcIn").value); if (!code) return G.toast("Код", "Кодът има 20 знака — провери го.");
          const s = srv(); if (!s) return G.toast("Архив", "Първо задай адреса на FIT сървъра: меню → AI разпознаване.");
          const btn = $("#rcGo"); btn.disabled = true; btn.textContent = "Търся…";
          try {
            const r = await fetch(s + "/api/backup?id=" + (await backupId(code)), { headers: { "x-fit-device": FCL.device() } });
            if (r.status === 404) throw { code: "not_found" }; if (!r.ok) throw { code: "upstream_error" };
            const j = await decrypt((await r.json()).box, code);
            confirmRestore(j.data, code, "облак, " + when(j.at));
          } catch (e) {
            btn.disabled = false; btn.textContent = "Намери архива";
            G.toast("Възстановяване", e.code === "not_found" ? "Няма архив с този код." : e.code === "wrong_code" ? "Кодът не отваря архива." : "Няма връзка със сървъра.");
          }
        };
      });
    }
    function restoreFile() {
      const i = document.createElement("input"); i.type = "file"; i.accept = "application/json,.json,text/plain";
      i.onchange = async () => { const f = i.files && i.files[0]; if (!f) return; const d = fromExport(await f.text()); if (!d) return G.toast("Възстановяване", "Файлът не е архив на FIT."); confirmRestore(d, null, f.name); };
      i.click();
    }
    function showCode(code, first) {
      G.sheet(`<div class="grab"></div><p class="eyebrow">Код за възстановяване</p><div class="h2">${first ? "Запиши този код" : "Твоят код"}</div>
        <div class="card" style="text-align:center;font:800 20px ui-monospace,monospace;letter-spacing:.06em;user-select:all">${esc(code)}</div>
        <p style="margin:0">С него възстановяваш данните на нов телефон. <b>Пази го като парола</b> — запиши го на хартия или в мениджър на пароли. Ако го загубиш, архивът не може да се отвори.</p>
        <div class="grid2"><button class="btn ghost" id="scCopy" type="button">Копирай</button><button class="btn ghost" id="scShare" type="button">Сподели</button></div>
        <button class="btn block" id="scOk" type="button">${first ? "Записах го — архивирай" : "Готово"}</button>`, () => {
        $("#scCopy").onclick = async () => { try { await navigator.clipboard.writeText(code); G.toast("Код", "Копиран е."); } catch (e) { G.toast("Код", "Не успях — препиши го ръчно."); } };
        $("#scShare").onclick = async () => { try { await navigator.share({ title: "FIT — код за възстановяване", text: code }); } catch (e) {} };
        $("#scOk").onclick = async () => { G.closeSheet(); if (first) { await backupNow(false); } };
      });
    }
    function backupSheet() {
      const b = bk(), s = srv();
      G.sheet(`<div class="grab"></div><p class="eyebrow">Настройки</p><div class="h2">Архив и възстановяване</div>
        <p class="muted" style="margin:0">Без акаунт и без имейл. Данните се криптират на телефона с код, който знаеш само ти. Сървърът пази само криптирания блок.</p>
        ${b.code ? `<div class="card" style="gap:4px"><b>✓ Архивът е включен</b><span class="muted">Последно копие: ${when(b.at)}${b.kb ? " · " + b.kb + " KB" : ""}. Обновява се автоматично веднъж дневно.</span></div>
          <button class="btn block" id="bkNow" type="button">Архивирай сега</button>
          <div class="grid2"><button class="btn ghost" id="bkCode" type="button">Покажи кода</button><button class="btn ghost" id="bkOff" type="button" style="color:var(--hot)">Изключи</button></div>`
        : `<button class="btn block" id="bkOn" type="button">Включи архив в облака</button>`}
        ${s ? "" : `<p class="note" style="margin:0">⚠ Облачният архив изисква FIT сървъра (меню → AI разпознаване → адрес на сървъра). Без него ползвай файл.</p>`}
        <p class="eyebrow" style="margin-top:6px">Нов телефон</p>
        <button class="btn ghost block" id="bkRc" type="button">Възстанови с код от облака</button>
        <button class="btn ghost block" id="bkRf" type="button">Възстанови от файл (JSON)</button>
        <button class="btn ghost block" id="bkEx" type="button">Изтегли копие като файл</button>`, () => {
        const on = $("#bkOn"); if (on) on.onclick = () => { const code = newCode(); LS(BK, { on: true, code }); showCode(code, true); };
        const nw = $("#bkNow"); if (nw) nw.onclick = async () => { nw.disabled = true; nw.textContent = "Архивирам…"; await backupNow(false); G.closeSheet(); backupSheet(); };
        const sc = $("#bkCode"); if (sc) sc.onclick = () => showCode(b.code, false);
        const off = $("#bkOff"); if (off) off.onclick = async () => {
          if (s) { try { await fetch(s + "/api/backup?id=" + (await backupId(b.code)), { method: "DELETE", headers: { "x-fit-device": FCL.device() } }); } catch (e) {} }
          LS(BK, { on: false }); G.closeSheet(); G.toast("Архив", "Архивът е изключен и изтрит от сървъра.");
        };
        $("#bkRc").onclick = restoreCodeSheet; $("#bkRf").onclick = restoreFile; $("#bkEx").onclick = () => G.exportData();
      });
    }
    function diagSheet() {
      const L = diag();
      G.sheet(`<div class="grab"></div><p class="eyebrow">Поверителност</p><div class="h2">Отчети за грешки</div>
        <p class="muted" style="margin:0">${diagOk() ? (srv() ? "Изпращат се автоматично до разработчика." : "Включени са, но няма FIT сървър — пазят се само тук.") : "Изключени — пазят се само на този телефон. Включи ги в „Поверителност и данни“."}</p>
        ${L.length ? L.slice(-8).reverse().map((x) => `<div class="card" style="gap:2px;font-size:13px"><b>${esc(x.m)}</b><span class="muted">${when(x.t)} · версия ${x.b || "?"}${x.n ? " · ×" + x.n : ""}${x.sent ? " · изпратен" : ""}</span></div>`).join("") : `<p>Няма записани грешки. 👍</p>`}
        ${L.length ? `<div class="grid2"><button class="btn ghost" id="dgSend" type="button">Изпрати сега</button><button class="btn ghost" id="dgClr" type="button">Изчисти</button></div>` : ""}
        <button class="btn block" data-close type="button">Затвори</button>`, () => {
        const sd = $("#dgSend"); if (sd) sd.onclick = async () => { if (!diagOk()) return G.toast("Отчети", "Първо ги разреши в „Поверителност и данни“."); await FCL.sendDiag(); G.closeSheet(); diagSheet(); };
        const cl = $("#dgClr"); if (cl) cl.onclick = () => { LS("fit_diag", []); G.closeSheet(); };
      });
    }
    function policySheet() {
      G.sheet(`<div class="grab"></div><p class="eyebrow">Поверителност</p><div class="h2">Политика за поверителност</div>
        <iframe src="privacy.html" title="Политика за поверителност" style="width:100%;height:62vh;border:0;border-radius:12px;background:#fff"></iframe>
        <p class="note" style="margin:0">Публичен адрес: ${POLICY}</p><button class="btn block" data-close type="button">Затвори</button>`);
    }
    Object.assign(FCL, { backupSheet, diagSheet, policySheet, restoreCodeSheet });

    // Меню: „Архив и възстановяване“ в Настройки.
    const set = DRAWER.find((x) => x[0] === "Настройки");
    if (set && !set[1].some((x) => x[0] === "x:backup")) set[1].splice(set[1].findIndex((x) => x[0] === "x:privacy") + 1, 0, ["x:backup", "Архив и възстановяване"]);
    const od = G.openDrawer;
    G.openDrawer = function () { od.apply(this, arguments); const b = document.querySelector('[data-dr="x:backup"]'); if (b) b.onclick = () => { G.closeSheet(); backupSheet(); }; };

    // „Поверителност и данни“: архив, отчети, политика.
    const ps = G.privacySheet;
    G.privacySheet = function () {
      ps.apply(this, arguments);
      const del = document.getElementById("pvDel"); if (!del) return;
      const n = diag().length, w = document.createElement("div"); w.style.cssText = "display:grid;gap:10px";
      w.innerHTML = `<button class="btn ghost block" id="pvBk" type="button">Архив и възстановяване</button>
        <button class="btn ghost block" id="pvDg" type="button">Отчети за грешки${n ? " (" + n + ")" : ""}</button>
        <button class="btn ghost block" id="pvPol" type="button">Политика за поверителност</button>`;
      del.before(w);
      document.getElementById("pvBk").onclick = backupSheet; document.getElementById("pvDg").onclick = diagSheet; document.getElementById("pvPol").onclick = policySheet;
    };

    // Първо пускане: „Имам архив“ в екрана със съгласията.
    const sh = G.sheet;
    G.sheet = function (html, onMount) {
      const r = sh.apply(this, arguments);
      const ok = document.getElementById("csOk");
      if (ok && !document.getElementById("csRestore") && !(S && S.people && S.people.length)) {
        const b = document.createElement("button"); b.className = "btn ghost block"; b.id = "csRestore"; b.type = "button"; b.textContent = "Имам архив от друг телефон — възстанови";
        b.onclick = () => backupSheet(); ok.after(b);
        const p = document.createElement("p"); p.className = "note"; p.style.margin = "0"; p.innerHTML = 'Продължавайки, приемаш <a href="#" id="csPol">политиката за поверителност</a>.'; b.after(p);
        document.getElementById("csPol").onclick = (e) => { e.preventDefault(); policySheet(); };
      }
      return r;
    };

    // Автоматичен дневен архив и изпращане на отчетите.
    const tick = () => { const b = bk(); if (b.code && b.on !== false && (!b.at || Date.now() - Date.parse(b.at) > 20 * 3600e3)) backupNow(true); FCL.sendDiag(); };
    setTimeout(tick, 9000);
    document.addEventListener("visibilitychange", () => { if (!document.hidden) setTimeout(tick, 3000); });
  };
})(typeof window !== "undefined" ? window : globalThis);
