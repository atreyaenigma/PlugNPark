// "Best for you" ranking. Pure functions, so they can be tested on their own.
//
// A station is scored 0 to 100 from up to six things the driver cares about, each with a visible weight:
//   charging  : distance 30%, free now 22%, speed on YOUR car 20%, price 13%, rating 10%, driver reports 5%
//   parking   : distance 35%, free now 25%, price 20%, rating 15%, driver reports 5%
// Distance is left out (and the rest rescaled) when we do not know where the driver is.
// Then safety rules: reported broken x0.4, does not fit the driver's car x0.15, nothing free right now x0.6,
// and a station that is not live gets a low availability score.
import { usablePower } from "./vehicles";

const W = {
  ev: { distance: 0.30, availability: 0.22, speed: 0.20, price: 0.13, rating: 0.10, community: 0.05 },
  parking: { distance: 0.35, availability: 0.25, price: 0.20, rating: 0.15, community: 0.05 },
};
const GUESS_KW = { CCS: 30, CHAdeMO: 25, "Type 2": 7 };
export const MIN_BEST = 40;   // below this nothing is called a "best match"
export const GOOD = 65;       // at or above this it is a "good match"
const LABEL = { distance: "Distance", availability: "Free now", speed: "Charging speed", price: "Price", rating: "Rating", community: "Driver reports" };

const clamp01 = (x) => Math.max(0, Math.min(1, x));
const bayes = (avg, n) => (n * (avg || 0) + 3 * 3.5) / (n + 3);   // a 5-star from one review does not beat 4.6 from 40
const stats = (a) => ({ n: a.length, min: a.length ? Math.min(...a) : 0, max: a.length ? Math.max(...a) : 0 });
const priceScore = (p, st) => (p == null ? 0.5 : st.n < 2 || st.max === st.min ? 0.7 : 0.25 + 0.75 * (1 - (p - st.min) / (st.max - st.min)));
const strength = (v) => (v >= 0.7 ? "strong" : v >= 0.4 ? "ok" : "weak");

function evFacts(s, vehicle) {
  let kw = 0, free = 0, total = 0, usable = 0;
  for (const c of s.chargers) {
    let k;
    if (vehicle) { const u = usablePower(c, vehicle); if (!u) continue; k = u.kw; } else k = c.kw || GUESS_KW[c.kind] || 7;
    usable++; kw = Math.max(kw, k); free += c.free || 0; total += c.total || 0;
  }
  return { kw, free, total, usable };
}

function scoreKind(s, kind, ctx) {
  const live = s.live !== false, d = s.distanceKm, w = W[kind];
  const broken = s.community?.state === "broken", working = s.community?.state === "working";
  const ev = kind === "ev" ? evFacts(s, ctx.vehicle) : null;
  const f = [];     // { key, w, v, text, good }
  let full = false; // live, and nothing free right now
  const flags = [];

  if (ctx.hasOrigin && d != null) f.push({ key: "distance", w: w.distance, v: Math.exp(-d / 6), text: d < 1.5 ? `Very close, ${d} km away` : `${d} km away`, good: d < 1.5 ? "Very close" : `${d} km away` });

  if (!live) f.push({ key: "availability", w: w.availability, v: 0.3, text: "Not live, so a free spot cannot be counted on" });
  else {
    const free = kind === "ev" ? ev.free : s.parkFree, total = kind === "ev" ? ev.total : s.parkTotal;
    full = free <= 0 && !(kind === "ev" && ev.usable === 0);   // no usable plug is a different problem ("won't fit")
    f.push({ key: "availability", w: w.availability, v: free <= 0 ? 0 : 0.6 + 0.4 * Math.min(1, free / 3),
      text: free <= 0 ? (kind === "ev" ? "Nothing free right now" : "Lot is full right now") : `${free} of ${total} ${kind === "ev" ? "charger" : "bay"}${total > 1 ? "s" : ""} free now`, good: free > 0 ? `${free} free now` : null });
  }

  if (kind === "ev") f.push({ key: "speed", w: w.speed, v: clamp01(ev.kw / 60) ** 0.7,
    text: ctx.vehicle ? `Your car can charge at up to ${ev.kw} kW here` : `Up to ${ev.kw} kW`, good: ev.kw >= 50 ? `Fast, up to ${ev.kw} kW` : ev.kw >= 36 ? `Up to ${ev.kw} kW` : null });

  const price = kind === "ev" ? (live && s.kwhRate > 0 ? s.kwhRate : null) : (live && s.parkRate > 0 ? s.parkRate : null);
  const pst = kind === "ev" ? ctx.evP : ctx.pkP, cheapest = price != null && pst.n >= 2 && price === pst.min;
  const unit = kind === "ev" ? "per kWh" : "per hour";
  f.push({ key: "price", w: w.price, v: priceScore(price, pst), text: price == null ? "Price not listed" : `₹${price} ${unit}${cheapest ? ", the lowest here" : ""}`, good: cheapest ? "Cheapest here" : null, special: cheapest });

  const hasR = (s.reviewCount || 0) > 0 && Number.isFinite(s.rating);   // be safe with incomplete data
  const n = hasR ? s.reviewCount : 0, b = bayes(hasR ? s.rating : 0, n);
  f.push({ key: "rating", w: w.rating, v: (b - 1) / 4, text: n ? `${s.rating.toFixed(1)} stars from ${n} review${n > 1 ? "s" : ""}` : "No reviews yet", good: n && b >= 4 ? `★ ${s.rating.toFixed(1)}` : null });

  f.push({ key: "community", w: w.community, v: broken ? 0 : working ? 1 : 0.5, text: broken ? "Reported broken recently" : working ? "Drivers confirmed it works" : "No recent driver reports", good: working ? "Drivers say it works" : null });

  let score = (100 * f.reduce((a, x) => a + x.w * x.v, 0)) / f.reduce((a, x) => a + x.w, 0);
  if (broken) { score *= 0.4; flags.push("Reported broken"); }
  if (full) { score *= 0.6; flags.push(kind === "ev" ? "Nothing free right now" : "Full right now"); }   // cannot be used now
  if (!live) flags.push("Availability not live");
  if (kind === "ev" && ctx.vehicle && ev.usable === 0) { score *= 0.15; flags.push("Won't fit your car"); }
  return { score, f, flags, kind, kw: ev ? ev.kw : 0, price, bayes: b };
}

export function rankStations(stations, { need = "any", vehicle = null, hasOrigin = false } = {}) {
  const ctx = {
    need, vehicle, hasOrigin,
    evP: stats(stations.filter((s) => s.chargers?.length && s.live !== false && s.kwhRate > 0).map((s) => s.kwhRate)),
    pkP: stats(stations.filter((s) => s.parkTotal > 0 && s.live !== false && s.parkRate > 0).map((s) => s.parkRate)),
  };
  const kinds = need === "ev" ? ["ev"] : need === "parking" ? ["parking"] : ["ev", "parking"];
  const out = stations.map((s) => {
    let best = null;
    for (const k of kinds) {
      if ((k === "ev" && !s.chargers?.length) || (k === "parking" && !(s.parkTotal > 0))) continue;
      const r = scoreKind(s, k, ctx);
      if (!best || r.score > best.score) best = r;
    }
    if (!best) return { station: s, score: 0, level: null, headline: [], flags: ["Does not offer this"], factors: [], kind: null, kw: 0, price: null, bayes: 0 };
    const headline = best.f.filter((x) => x.good && x.v >= 0.55).sort((a, b) => b.w * b.v + (b.special ? 1 : 0) - (a.w * a.v + (a.special ? 1 : 0))).slice(0, 3).map((x) => x.good);
    return {
      station: s, score: Math.round(best.score), level: null, headline, flags: best.flags, kind: best.kind, kw: best.kw, price: best.price, bayes: best.bayes,
      factors: best.f.map((x) => ({ key: x.key, label: LABEL[x.key], text: x.text, strength: strength(x.v) })),
    };
  });
  const order = [...out].sort((a, b) => b.score - a.score);
  order.forEach((r, i) => { r.level = i === 0 && r.score >= MIN_BEST ? "best" : r.score >= GOOD ? "good" : null; });
  return out;
}

const dist = (r) => r.station.distanceKm ?? Infinity;
const byScore = (a, b) => b.score - a.score || dist(a) - dist(b) || a.station.id - b.station.id;
const lowToHigh = (get) => (a, b) => (get(a) ?? Infinity) - (get(b) ?? Infinity) || byScore(a, b);
export const SORTS = {
  best: byScore,
  nearest: (a, b) => dist(a) - dist(b) || byScore(a, b),
  cheapest: lowToHigh((r) => r.price),
  fastest: (a, b) => b.kw - a.kw || byScore(a, b),
  rated: (a, b) => b.bayes - a.bayes || byScore(a, b),
};
export const sortRanked = (ranked, mode) => [...ranked].sort(SORTS[mode] || SORTS.best);
