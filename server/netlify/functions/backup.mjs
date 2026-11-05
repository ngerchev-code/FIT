// FIT — облачен архив без акаунт. Приема само криптиран блок (AES-GCM от телефона) под id = SHA-256 от кода.
// Сървърът не вижда кода и не може да прочете съдържанието.
import { blobs, CORS, json, originOk, device, ip, take } from "../lib/guard.mjs";

const MAX = 4_600_000;
const ID = /^[0-9a-f]{64}$/;

export default async (req, context) => {
  if (req.method === "OPTIONS") return new Response("", { status: 204, headers: CORS });
  if (!originOk(req)) return json(403, { error: "origin" });
  const store = blobs("fit-backups");
  const url = new URL(req.url);
  if (req.method === "GET" || req.method === "DELETE") {
    const id = url.searchParams.get("id") || "";
    if (!ID.test(id)) return json(400, { error: "bad id" });
    if (req.method === "DELETE") { await store.delete(id); return json(200, { ok: true }); }
    const box = await store.get(id, { type: "json" });
    return box ? json(200, { box }) : json(404, { error: "not found" });
  }
  if (req.method !== "PUT" && req.method !== "POST") return json(405, { error: "method" });
  const len = +(req.headers.get("content-length") || 0);
  if (len > MAX) return json(413, { error: "too big" });
  const lim = await take("backup", device(req), ip(req, context));
  if (!lim.ok) return json(429, { error: "limit" });
  let body; try { body = await req.json(); } catch { return json(400, { error: "bad json" }); }
  const { id, box } = body || {};
  if (!ID.test(id || "") || !box || box.v !== 1 || typeof box.ct !== "string" || typeof box.iv !== "string" || typeof box.salt !== "string") return json(400, { error: "bad box" });
  if (box.ct.length > MAX) return json(413, { error: "too big" });
  await store.setJSON(id, { v: 1, z: box.z ? 1 : 0, salt: box.salt, iv: box.iv, ct: box.ct }, { metadata: { at: new Date().toISOString() } });
  // архив, неизползван 12 месеца, се изтрива (рядко, евтино)
  if (Math.random() < 0.01) {
    const old = Date.now() - 365 * 864e5; const { blobs } = await store.list();
    for (const b of blobs) { const m = await store.getMetadata(b.key); if (m && Date.parse(m.metadata?.at || 0) < old) await store.delete(b.key); }
  }
  return json(200, { ok: true });
};
