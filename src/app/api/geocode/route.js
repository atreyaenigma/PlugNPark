import { NextResponse } from "next/server";
import { allow, ipOf } from "@/lib/limit";
import { guard } from "@/lib/api";

export const dynamic = "force-dynamic";

// Place search through the public OpenStreetMap Nominatim service. Its policy asks for: an identifying
// User-Agent, at most 1 request per second for the whole app, cached repeats, and user-triggered searches only.
const cache = globalThis.__pnpGeo || (globalThis.__pnpGeo = new Map());
const gate = globalThis.__pnpGeoGate || (globalThis.__pnpGeoGate = { chain: Promise.resolve(), last: 0 });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function throttle() {
  const next = gate.chain.then(async () => {
    const wait = Math.max(0, 1100 - (Date.now() - gate.last));
    if (wait) await sleep(wait);
    gate.last = Date.now();
  });
  gate.chain = next.catch(() => {});
  return next;
}

const labelOf = (x) => {
  const a = x.address || {};
  const head = x.name || a.city || a.town || a.village || (x.display_name || "").split(",")[0];
  const parts = [head, a.state, a.country].filter(Boolean).filter((v, i, arr) => arr.indexOf(v) === i);
  return parts.join(", ") || x.display_name || "Unnamed place";
};

export const GET = guard(async (req) => {
  const q = (new URL(req.url).searchParams.get("q") || "").trim();
  if (q.length < 2 || q.length > 100) return NextResponse.json({ error: "Type at least 2 letters." }, { status: 400 });
  if (!allow("geo:" + ipOf(req), 20, 60000)) return NextResponse.json({ error: "Too many searches. Wait a minute and try again." }, { status: 429 });

  const key = q.toLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.t < 3600e3) return NextResponse.json(hit.v);

  await throttle();
  const url = new URL(process.env.GEOCODE_URL || "https://nominatim.openstreetmap.org/search");
  Object.entries({ q, format: "jsonv2", limit: 5, addressdetails: 1 }).forEach(([k, v]) => url.searchParams.set(k, String(v)));
  const busy = () => NextResponse.json({ error: "Place search is busy right now. Try again in a moment." }, { status: 503 });
  let r;
  try {
    r = await fetch(url, {
      headers: { "User-Agent": `PlugNPark/1.0 (${process.env.GEOCODE_CONTACT || "student project"})`, "Accept-Language": "en" },
      signal: AbortSignal.timeout(8000), cache: "no-store",
    });
  } catch { return busy(); }
  if (!r.ok) return busy();
  const raw = await r.json().catch(() => []);
  const out = (Array.isArray(raw) ? raw : [])
    .map((x) => ({ label: labelOf(x), lat: Number(x.lat), lng: Number(x.lon) }))
    .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
  cache.set(key, { t: Date.now(), v: out });
  if (cache.size > 500) cache.clear();
  return NextResponse.json(out);
});
