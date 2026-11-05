// FIT — проверка на кода при всяка промяна (node tools/check.mjs). Ползва се в .github/workflows/check.yml и android.yml.
// 1) синтаксис на всеки JS файл и на скриптовете в index.html; 2) правила („тресчотка“): index.html не расте,
//    innerHTML не се увеличава, няма ключове и пароли в кода; 3) всички тестове.
import { readFileSync, readdirSync, existsSync } from "fs";
import { execFileSync } from "child_process";
import vm from "vm";
const R = (f) => readFileSync(new URL("../" + f, import.meta.url), "utf8");
let bad = 0; const ok = (m) => console.log("✓ " + m); const fail = (m) => { bad++; console.log("✗ " + m); };

// 1. Синтаксис
for (const f of readdirSync(new URL("../www", import.meta.url)).filter((f) => f.endsWith(".js"))) {
  try { new vm.Script(R("www/" + f), { filename: f }); ok("синтаксис www/" + f); } catch (e) { fail(`www/${f}: ${e.message}`); }
}
const html = R("www/index.html");
[...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].forEach((m, i) => {
  try { new vm.Script(m[1], { filename: `index.html#script${i}` }); ok(`синтаксис index.html, скрипт ${i + 1}`); } catch (e) { fail(`index.html скрипт ${i + 1}: ${e.message}`); }
});

// 2. Правила. Новите функции отиват в отделни файлове (www/*.js), не в index.html.
const LIMIT = { lines: 3150, innerHTML: 34 }; // таваните само намаляват
const lines = html.split("\n").length, ih = (html.match(/innerHTML/g) || []).length;
lines <= LIMIT.lines ? ok(`index.html: ${lines} реда (таван ${LIMIT.lines})`) : fail(`index.html расте: ${lines} реда > ${LIMIT.lines}. Сложи новото в отделен модул в www/.`);
ih <= LIMIT.innerHTML ? ok(`innerHTML: ${ih} места (таван ${LIMIT.innerHTML})`) : fail(`innerHTML се увеличава: ${ih} > ${LIMIT.innerHTML}. Ползвай textContent или esc().`);
const files = execFileSync("git", ["ls-files"], { encoding: "utf8" }).split("\n").filter((f) => /\.(js|mjs|html|json|gradle|yml|java|kt|md)$/.test(f) && !f.includes("vendor/") && !f.endsWith("package-lock.json"));
const secret = /sk-ant-api\d\d-[\w-]{20,}|-----BEGIN (RSA |EC )?PRIVATE KEY-----|AIza[0-9A-Za-z_-]{35}/;
const leaks = files.filter((f) => existsSync(f) && secret.test(readFileSync(f, "utf8")));
leaks.length ? fail("възможен таен ключ в: " + leaks.join(", ")) : ok("няма ключове за API в кода");
const jks = execFileSync("git", ["ls-files", "*.jks", "*.keystore", "*.p12"], { encoding: "utf8" }).trim().split("\n").filter(Boolean).filter((f) => f !== "android/keystore/fit-release.jks");
jks.length ? fail("нов ключ за подписване е добавен в хранилището: " + jks.join(", ") + " — пази го само в GitHub Secrets") : ok("нови ключове за подписване не са в хранилището");

// 3. Тестове
const tests = ["tools/test_core.mjs", "tools/test_food.mjs", "tools/test_cloud.mjs"];
if (existsSync("server/node_modules/@netlify/blobs")) tests.push("tools/test_server.mjs"); else console.log("· tools/test_server.mjs пропуснат (npm --prefix server install)");
for (const t of tests) {
  try { const out = execFileSync(process.execPath, [t], { encoding: "utf8" }); ok(t + " — " + (out.trim().split("\n").pop() || "")); }
  catch (e) { fail(t + "\n" + (e.stdout || "") + (e.stderr || "")); }
}
console.log(bad ? `\n${bad} проблема — поправи ги преди пускане.` : "\nВсичко е наред.");
process.exit(bad ? 1 : 0);
