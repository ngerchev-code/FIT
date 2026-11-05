// FIT — отчети за грешки (само ако потребителят е разрешил). Пазят се 90 дни в Netlify Blobs; четат се с ключ.
import { blobs, CORS, json, originOk, device, ip, take } from "../lib/guard.mjs";

const cut = (s, n) => String(s || "").slice(0, n);

export default async (req, context) => {
  if (req.method === "OPTIONS") return new Response("", { status: 204, headers: CORS });
  const store = blobs("fit-reports");
  // Преглед за разработчика: GET /api/report?key=<FIT_ADMIN_KEY>[&day=YYYY-MM-DD]
  if (req.method === "GET") {
    const u = new URL(req.url); const admin = process.env.FIT_ADMIN_KEY;
    if (!admin || u.searchParams.get("key") !== admin) return json(403, { error: "forbidden" });
    const day = u.searchParams.get("day") || new Date().toISOString().slice(0, 10);
    const { blobs } = await store.list({ prefix: day + "/" });
    const out = [];
    for (const b of blobs.slice(0, 200)) out.push(await store.get(b.key, { type: "json" }));
    return json(200, { day, count: out.length, reports: out });
  }
  if (req.method !== "POST") return json(405, { error: "method" });
  if (!originOk(req)) return json(403, { error: "origin" });
  if (+(req.headers.get("content-length") || 0) > 60_000) return json(413, { error: "too big" });
  const dev = device(req);
  const lim = await take("report", dev, ip(req, context));
  if (!lim.ok) return json(429, { error: "limit" });
  let body; try { body = await req.json(); } catch { return json(400, { error: "bad json" }); }
  const errors = (Array.isArray(body?.errors) ? body.errors : []).slice(0, 30).map((e) => ({
    t: cut(e.t, 30), m: cut(e.m, 300), s: cut(e.s, 900), src: cut(e.src, 160), b: +e.b || 0, tab: cut(e.tab, 30), ua: cut(e.ua, 120), n: +e.n || 1,
  }));
  if (!errors.length) return json(400, { error: "empty" });
  const now = new Date();
  await store.setJSON(`${now.toISOString().slice(0, 10)}/${now.getTime()}-${dev || "nodev"}`, { build: +body.build || 0, device: dev, errors });
  // почистване на отчетите над 90 дни (рядко, евтино)
  if (Math.random() < 0.02) {
    const old = new Date(Date.now() - 90 * 864e5).toISOString().slice(0, 10);
    const { blobs } = await store.list();
    for (const b of blobs) if (b.key.slice(0, 10) < old) await store.delete(b.key);
  }
  return json(200, { ok: true });
};
