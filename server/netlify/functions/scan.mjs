// FIT — сървър за AI разпознаване на фитнес уреди.
// Ключът за Claude API е в променливата ANTHROPIC_API_KEY в Netlify (никога в приложението).
import { CORS, json, originOk, device, ip, take, LIMITS } from "../lib/guard.mjs";
const MODEL = process.env.FIT_MODEL || "claude-sonnet-5-5";
const MAX_IMAGE = 1_500_000;   // ~1,1 MB JPEG в base64
const MAX_PROMPT = 4000;

export default async (req, context) => {
  if (req.method === "OPTIONS") return new Response("", { status: 204, headers: CORS });
  if (req.method !== "POST") return json(405, { error: "POST only" });
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return json(500, { error: "ANTHROPIC_API_KEY липсва в Netlify" });
  if (!originOk(req)) return json(403, { error: "origin" });
  if (+(req.headers.get("content-length") || 0) > 2_000_000) return json(413, { error: "too big" });
  let body;
  try { body = await req.json(); } catch { return json(400, { error: "bad json" }); }
  // Дневен лимит по устройство и IP — сървърът не е безплатен общ достъп до Claude.
  const kind = Array.isArray(body?.chat) ? "chat" : "scan";
  const lim = await take(kind, device(req), ip(req, context));
  if (!lim.ok) return json(429, { error: "limit", limit: LIMITS[kind] });
  // Чат режим: { chat: [{role, content}, ...] } — първото съобщение е контекстът от приложението
  if (Array.isArray(body?.chat)) {
    const turns = body.chat.slice(-12).filter((t) => t && (t.role === "user" || t.role === "assistant") && typeof t.content === "string");
    const total = turns.reduce((n, t) => n + t.content.length, 0);
    if (!turns.length || total > 20000) return json(400, { error: "bad chat" });
    const [ctx, ...rest] = turns;
    const msgs = rest.length ? rest : [{ role: "user", content: "Здравей" }];
    if (msgs[0].role !== "user") msgs.unshift({ role: "user", content: "Здравей" });
    const rc = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: MODEL, max_tokens: 700, system: "Ти си асистентът на фитнес приложението FIT. Говориш само за фитнес, здраве, храна, активности, спорт и приложението.\n\n" + ctx.content.slice(0, 6000), messages: msgs }),
    });
    if (!rc.ok) return json(rc.status === 429 ? 429 : 502, { error: "claude " + rc.status });
    const jc = await rc.json();
    return json(200, { text: (jc.content || []).map((c) => c.text || "").join("") });
  }
  const { image, prompt } = body || {};
  if (typeof image !== "string" || !image || image.length > MAX_IMAGE) return json(400, { error: "bad image" });
  if (typeof prompt !== "string" || !prompt || prompt.length > MAX_PROMPT) return json(400, { error: "bad prompt" });
  // Сървърът приема само заявки за фитнес уреди — не е общ достъп до Claude.
  const guard = "Ти си фитнес треньор в приложението FIT. Отговаряй само за фитнес уреди и упражнения. Ако заявката е за друго, върни {\"equipment\":\"\"}.\n\n";
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: MODEL, max_tokens: 1800,
      messages: [{ role: "user", content: [
        { type: "image", source: { type: "base64", media_type: "image/jpeg", data: image } },
        { type: "text", text: guard + prompt },
      ] }],
    }),
  });
  if (!r.ok) return json(r.status === 429 ? 429 : 502, { error: "claude " + r.status });
  const j = await r.json();
  return json(200, { text: (j.content || []).map((c) => c.text || "").join("") });
};
