// FIT — обща защита на сървъра: CORS, източник, дневни лимити по устройство и IP.
import { getStore } from "@netlify/blobs";

// Хранилище: Netlify Blobs; в тестовете (tools/test_server.mjs) — подменено в паметта.
export const blobs = (name) => (globalThis.__fitBlobs ? globalThis.__fitBlobs(name) : getStore(name));

export const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, PUT, DELETE, OPTIONS",
  "access-control-allow-headers": "content-type, x-fit-device",
};
export const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { ...CORS, "content-type": "application/json" } });

// Приложението (Capacitor), уеб версията (GitHub Pages) и локални тестове.
const ORIGINS = (process.env.FIT_ORIGINS || "capacitor://localhost,https://localhost,http://localhost,https://ngerchev-code.github.io,null").split(",").map((s) => s.trim());
export function originOk(req) {
  const o = req.headers.get("origin");
  return !o || ORIGINS.includes(o) || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o);
}
export function device(req) {
  const d = req.headers.get("x-fit-device") || "";
  return /^d[0-9a-f]{16}$/.test(d) ? d : "";
}
export function ip(req, context) {
  return (context && context.ip) || req.headers.get("x-nf-client-connection-ip") || req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "?";
}

// Дневни лимити (по UTC ден). Числата се сменят с променливи в Netlify.
export const LIMITS = {
  scan: +(process.env.FIT_LIMIT_SCAN || 40),
  chat: +(process.env.FIT_LIMIT_CHAT || 80),
  backup: +(process.env.FIT_LIMIT_BACKUP || 20),
  report: +(process.env.FIT_LIMIT_REPORT || 50),
  ip: +(process.env.FIT_LIMIT_IP || 400),
};
export async function take(kind, dev, addr) {
  const day = new Date().toISOString().slice(0, 10);
  const store = blobs("fit-limits");
  const keys = [[`${day}/${kind}/${dev || "nodev"}`, dev ? LIMITS[kind] : Math.ceil(LIMITS[kind] / 4)], [`${day}/ip/${addr}`, LIMITS.ip]];
  for (const [k, max] of keys) {
    const n = +((await store.get(k)) || 0);
    if (n >= max) return { ok: false, left: 0 };
  }
  for (const [k] of keys) {
    const n = +((await store.get(k)) || 0);
    await store.set(k, String(n + 1));
  }
  return { ok: true };
}
