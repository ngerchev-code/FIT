// Тестове на облачния архив и отчетите (node tools/test_cloud.mjs).
import assert from "assert/strict";
import { createRequire } from "module";
const F = createRequire(import.meta.url)("../www/fit-cloud.js");
let n = 0; const t = async (name, fn) => { await fn(); n++; console.log("ok  ", name); };

await t("Код: 20 знака, 100 бита, без объркващи букви; нормализиране при препис", async () => {
  const c = F.newCode(); assert.match(c, /^[0-9A-HJKMNP-TV-Z]{5}(-[0-9A-HJKMNP-TV-Z]{5}){3}$/);
  assert.notEqual(c, F.newCode());
  assert.equal(F.normCode(c.toLowerCase().replace(/-/g, " ")), c);
  assert.equal(F.normCode("0OOOO-IIIII-LLLLL-22222"), "00000-11111-11111-22222");
  assert.equal(F.normCode("ABC"), ""); assert.equal(F.normCode("UUUUU-UUUUU-UUUUU-UUUUU"), "");
});
await t("Id на архива зависи само от кода и не съдържа кода", async () => {
  const c = F.newCode(); const a = await F.backupId(c), b = await F.backupId(c.toLowerCase());
  assert.equal(a, b); assert.match(a, /^[0-9a-f]{64}$/); assert.notEqual(a, await F.backupId(F.newCode()));
});
await t("Криптиране AES-GCM: обратимо с кода, отказ с друг код, всеки път различен шифър", async () => {
  const c = F.newCode(); const d = { people: [{ name: "Тест", log: { "2026-11-05": { sets: 12 } } }] };
  const x = await F.encrypt(d, c), y = await F.encrypt(d, c);
  assert.notEqual(x.ct, y.ct); assert.deepEqual(await F.decrypt(x, c), d);
  await assert.rejects(F.decrypt(x, F.newCode()), (e) => e.code === "wrong_code");
  const bad = { ...x, ct: x.ct.slice(0, -4) + "AAAA" }; await assert.rejects(F.decrypt(bad, c), (e) => e.code === "wrong_code");
});
await t("Възстановяване от файл: приема експорта на FIT и чист S, отказва чужд JSON", async () => {
  const S = { people: [{ name: "Ани" }], active: 0 };
  assert.deepEqual(F.fromExport(JSON.stringify({ app: "FIT", format: 1, data: S })), S);
  assert.deepEqual(F.fromExport(JSON.stringify(S)), S);
  assert.equal(F.fromExport('{"foo":1}'), null); assert.equal(F.fromExport("не е json"), null);
  assert.deepEqual(F.checkData(S), { profiles: 1, names: ["Ани"] });
});
await t("Отчет за грешка: без ключове и имейли, съкратен", async () => {
  const r = F.errRecord("ключ sk-ant-api03-SECRET от ivan@mail.bg", "x".repeat(5000), "index.html:10:5");
  assert.ok(!r.m.includes("SECRET") && !r.m.includes("ivan@")); assert.equal(r.s.length, 900);
});
console.log(`\n${n} теста на облака — всички минаха`);
