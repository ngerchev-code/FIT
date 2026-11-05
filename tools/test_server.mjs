// Тестове на сървъра (node tools/test_server.mjs): лимити, източник, облачен архив, отчети. Netlify Blobs е в паметта.
import assert from "assert/strict";
import { createRequire } from "module";
const FCL = createRequire(import.meta.url)("../www/fit-cloud.js");
const mem = {};
globalThis.__fitBlobs = (name) => {
  const m = (mem[name] ||= new Map());
  return {
    get: async (k, o) => (m.has(k) ? (o?.type === "json" ? JSON.parse(m.get(k).v) : m.get(k).v) : null),
    set: async (k, v) => m.set(k, { v: String(v) }),
    setJSON: async (k, v, o) => m.set(k, { v: JSON.stringify(v), meta: o?.metadata || {} }),
    getMetadata: async (k) => (m.has(k) ? { metadata: m.get(k).meta || {} } : null),
    delete: async (k) => m.delete(k),
    list: async (o) => ({ blobs: [...m.keys()].filter((k) => !o?.prefix || k.startsWith(o.prefix)).map((key) => ({ key })) }),
  };
};
process.env.ANTHROPIC_API_KEY = "test"; process.env.FIT_LIMIT_SCAN = "3"; process.env.FIT_ADMIN_KEY = "adm";
const realFetch = globalThis.fetch;
globalThis.fetch = async (u, o) => { if (String(u).startsWith("https://api.anthropic.com")) return new Response(JSON.stringify({ content: [{ text: '{"equipment":"Лег преса"}' }] }), { status: 200 }); return realFetch(u, o); };
const scan = (await import("../server/netlify/functions/scan.mjs")).default;
const backup = (await import("../server/netlify/functions/backup.mjs")).default;
const report = (await import("../server/netlify/functions/report.mjs")).default;
const DEV = "d0123456789abcdef";
const rq = (url, method, body, h = {}) => new Request("https://fit.example" + url, { method, headers: { "content-type": "application/json", origin: "https://localhost", "x-fit-device": DEV, ...h }, body: body ? JSON.stringify(body) : undefined });
const ctx = { ip: "1.2.3.4" };
let n = 0; const t = async (name, fn) => { await fn(); n++; console.log("ok  ", name); };

await t("AI: дневен лимит по устройство → 429 след лимита", async () => {
  for (let i = 0; i < 3; i++) assert.equal((await scan(rq("/api/scan", "POST", { image: "AAAA", prompt: "уред" }), ctx)).status, 200);
  const r = await scan(rq("/api/scan", "POST", { image: "AAAA", prompt: "уред" }), ctx);
  assert.equal(r.status, 429); assert.equal((await r.json()).error, "limit");
  assert.equal((await scan(rq("/api/scan", "POST", { chat: [{ role: "user", content: "ctx" }] }), ctx)).status, 200, "чатът има отделен лимит");
});
await t("AI: чужд сайт (origin) е отказан", async () => {
  assert.equal((await scan(rq("/api/scan", "POST", { image: "A", prompt: "x" }, { origin: "https://evil.example" }), ctx)).status, 403);
});
await t("Архив: качване, четене, грешен код, изтриване — сървърът вижда само криптиран блок", async () => {
  const code = FCL.newCode(); const id = await FCL.backupId(code);
  const data = { people: [{ name: "Ники", age: 40 }], health: { chol: 6.1 } };
  const box = await FCL.encrypt({ app: "FIT", data }, code);
  assert.equal((await backup(rq("/api/backup", "PUT", { id, box }), ctx)).status, 200);
  const stored = JSON.stringify([...mem["fit-backups"].values()]);
  assert.ok(!stored.includes("Ники") && !stored.includes("chol"), "без открит текст на сървъра");
  const g = await backup(rq("/api/backup?id=" + id, "GET"), ctx); assert.equal(g.status, 200);
  const back = await FCL.decrypt((await g.json()).box, code); assert.deepEqual(back.data, data);
  await assert.rejects(FCL.decrypt(box, FCL.newCode()), (e) => e.code === "wrong_code");
  assert.equal((await backup(rq("/api/backup?id=" + id, "DELETE"), ctx)).status, 200);
  assert.equal((await backup(rq("/api/backup?id=" + id, "GET"), ctx)).status, 404);
  assert.equal((await backup(rq("/api/backup", "PUT", { id: "x", box }), ctx)).status, 400, "невалиден id");
});
await t("Отчети: приемат се, съкращават се, четат се само с ключ", async () => {
  const r = await report(rq("/api/report", "POST", { build: 31, errors: [{ m: "x".repeat(999), s: "at f()", b: 31 }] }), ctx);
  assert.equal(r.status, 200);
  assert.equal((await report(rq("/api/report", "GET"), ctx)).status, 403);
  const j = await (await report(rq("/api/report?key=adm", "GET"), ctx)).json();
  assert.equal(j.count, 1); assert.equal(j.reports[0].errors[0].m.length, 300);
});
console.log(`\n${n} теста на сървъра — всички минаха`);
