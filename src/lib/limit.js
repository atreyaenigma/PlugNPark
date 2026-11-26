// Tiny in-memory rate limiter (per server process). Good enough for a demo; use Redis or a gateway when scaling out.
const hits = globalThis.__pnpHits || (globalThis.__pnpHits = new Map());
export function allow(key, max, windowMs) {
  const now = Date.now();
  const recent = (hits.get(key) || []).filter((t) => now - t < windowMs);
  if (recent.length >= max) { hits.set(key, recent); return false; }
  recent.push(now); hits.set(key, recent);
  return true;
}
export const ipOf = (req) => (req.headers.get("x-forwarded-for") || "local").split(",")[0].trim();
