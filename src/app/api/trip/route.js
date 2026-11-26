import { NextResponse } from "next/server";
import { connect } from "@/lib/mongo";
import { Meta } from "@/lib/models";
import { getStations } from "@/lib/stations";
import { importArea, OcmError } from "@/lib/ocmImport";
import { allow, ipOf } from "@/lib/limit";
import { bestCharger, cleanVehicle } from "@/lib/vehicles";
import { cumulative, decimate, project, sampleAlong, straightRoute } from "@/lib/geo";
import { planTrip } from "@/lib/trip";
import { guard } from "@/lib/api";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const fail = (error, status = 400) => NextResponse.json({ error }, { status });
const place = (p) => p && Math.abs(Number(p.lat)) <= 90 && Math.abs(Number(p.lng)) <= 180 && p.lat !== "" && p.lng !== "" && p.lat != null && p.lng != null;

// The public OSRM demo server asks for: reasonable non-commercial use, 1 request per second, an identifying User-Agent.
const gate = globalThis.__pnpOsrmGate || (globalThis.__pnpOsrmGate = { chain: Promise.resolve(), last: 0 });
function throttle() {
  const next = gate.chain.then(async () => {
    const wait = Math.max(0, 1100 - (Date.now() - gate.last));
    if (wait) await sleep(wait);
    gate.last = Date.now();
  });
  gate.chain = next.catch(() => {});
  return next;
}

async function getRoute(a, b) {
  await throttle();
  const base = process.env.OSRM_URL || "https://router.project-osrm.org";
  const url = `${base}/route/v1/driving/${a.lng},${a.lat};${b.lng},${b.lat}?overview=full&geometries=geojson&steps=false`;
  let r;
  try {
    r = await fetch(url, { headers: { "User-Agent": `PlugNPark/1.0 (${process.env.GEOCODE_CONTACT || "student project"})` }, signal: AbortSignal.timeout(20000), cache: "no-store" });
  } catch { return straightRoute(a, b); }
  if (!r.ok) return straightRoute(a, b);
  const j = await r.json().catch(() => null);
  if (j?.code === "NoRoute") return { noRoute: true };
  const rt = j?.routes?.[0];
  if (j?.code !== "Ok" || !rt?.geometry?.coordinates?.length) return straightRoute(a, b);
  return { points: rt.geometry.coordinates.map(([lng, lat]) => [lat, lng]), km: rt.distance / 1000, minutes: rt.duration / 60, approximate: false };
}

// Makes sure real chargers along the road are loaded (once per stretch per week, a few stretches per request).
async function ensureCoverage(points, cum) {
  const samples = sampleAlong(points, cum, 40);
  const keys = new Map();
  for (const s of samples) keys.set(`corr:${s.lat.toFixed(1)}:${s.lng.toFixed(1)}`, s);
  await connect();
  const seen = new Map((await Meta.find({ key: { $in: [...keys.keys()] } }).lean()).map((m) => [m.key, new Date(m.value)]));
  const todo = [...keys].filter(([k]) => !(seen.get(k) && Date.now() - seen.get(k) < 7 * 864e5));
  let done = 0, created = 0, error = null;
  for (const [key, s] of todo.slice(0, 12)) {
    try {
      const r = await importArea({ lat: s.lat, lng: s.lng, radius: 25, max: 100 });
      created += r.created; done++;
      await Meta.updateOne({ key }, { value: new Date() }, { upsert: true });
      await sleep(250);
    } catch (e) { if (e instanceof OcmError) { error = e.message; break; } throw e; }
  }
  return { stretches: keys.size, pending: todo.length - done, created, error };
}

export const POST = guard(async (req) => {
  if (!allow("trip:" + ipOf(req), 12, 3600e3)) return fail("You have planned a lot of trips. Please wait a while and try again.", 429);
  const b = await req.json().catch(() => ({}));
  if (!place(b.from) || !place(b.to)) return fail("Pick a start and a destination.");
  const from = { lat: Number(b.from.lat), lng: Number(b.from.lng) }, to = { lat: Number(b.to.lat), lng: Number(b.to.lng) };
  const { vehicle, error } = cleanVehicle(b.vehicle);
  if (error) return fail(error);
  const num = (x, lo, hi, d) => (Number.isFinite(Number(x)) && x !== "" && x != null && Number(x) >= lo && Number(x) <= hi ? Number(x) : d);
  const startSoc = num(b.startSoc, 0.05, 1, 0.8), reserve = num(b.reserve, 0.05, 0.3, 0.1), target = num(b.target, 0.5, 1, 0.8);
  const maxDetour = num(b.maxDetourKm, 1, 25, 5), fastOnly = b.fastOnly !== false && vehicle.maxDcKw > 0;

  const route = await getRoute(from, to);
  if (route.noRoute) return fail("No driving route was found between these two places.", 422);
  if (route.km > 1000) return fail("Trips over 1000 km are not supported yet.");
  const cum = cumulative(route.points, route.km);

  const coverage = await ensureCoverage(route.points, cum);
  const stations = await getStations();
  const pad = 0.6, lats = route.points.map((p) => p[0]), lngs = route.points.map((p) => p[1]);
  const box = { s: Math.min(...lats) - pad, n: Math.max(...lats) + pad, w: Math.min(...lngs) - pad, e: Math.max(...lngs) + pad };

  const byId = new Map(), candidates = [];
  for (const s of stations) {
    if (s.lat < box.s || s.lat > box.n || s.lng < box.w || s.lng > box.e) continue;
    const ch = bestCharger(s, vehicle, fastOnly ? 24 : 0);
    if (!ch) continue;
    const pr = project(s, route.points, cum);
    if (pr.off > maxDetour) continue;
    byId.set(s.id, s);
    candidates.push({ id: s.id, along: pr.along, off: pr.off, usableKw: ch.usableKw, live: s.live, free: ch.free, charger: ch, penalty: s.community?.state === "broken" ? 150 : 0 });
  }

  const plan = planTrip({ routeKm: route.km, candidates, vehicle, startSoc, reserve, target });
  const stops = plan.stops.map((c) => {
    const s = byId.get(c.id);
    const cost = s.live && s.kwhRate > 0 ? Math.round(c.chargeKwh * s.kwhRate) : null;
    return {
      stationId: s.id, name: s.name, area: s.area, lat: s.lat, lng: s.lng, live: s.live, usageCost: s.usageCost,
      alongKm: Math.round(c.along * 10) / 10, offKm: Math.round(c.off * 10) / 10,
      arriveSoc: Math.round(c.arriveSoc * 100), leaveSoc: Math.round(c.leaveSoc * 100),
      chargeKwh: Math.round(c.chargeKwh * 10) / 10, chargeMin: c.chargeMin,
      reportedBroken: s.community?.state === "broken",
      kind: c.charger.kind, kw: c.charger.usableKw, kwEstimated: c.charger.estimated, freeNow: c.charger.free, costInr: cost,
    };
  });

  const warnings = [];
  if (route.approximate) warnings.push("The routing service could not be reached, so this route is an approximate straight line. Distances and times are rough.");
  if (coverage.error) warnings.push(`Could not load extra chargers along the road: ${coverage.error}`);
  else if (coverage.pending > 0) warnings.push(`Chargers for ${coverage.pending} stretch(es) of the road have not been loaded yet. Plan the trip again to include them.`);
  if (stops.some((s) => !s.live)) warnings.push("Availability at imported chargers is not live. A charger may be busy or out of service, so keep a backup in mind.");
  if (stops.some((s) => s.reportedBroken)) warnings.push("Drivers recently reported a problem at one of your stops. Check the station page, and keep a backup charger in mind.");
  if (stops.some((s) => s.kwEstimated)) warnings.push("Some chargers do not list their power, so charging time uses a cautious estimate.");

  const chargeMin = stops.reduce((a, s) => a + s.chargeMin, 0);
  const detourMin = Math.round(stops.reduce((a, s) => a + (2 * s.offKm) / 40 * 60, 0));
  const known = stops.filter((s) => s.costInr != null);
  const geometry = decimate(route.points, Math.max(0.3, route.km / 500));

  return NextResponse.json({
    route: { distanceKm: Math.round(route.km * 10) / 10, driveMin: Math.round(route.minutes), approximate: route.approximate, geometry },
    plan: { ok: plan.ok, error: plan.error || null, stops },
    summary: {
      stops: stops.length, chargeMin, detourMin, totalMin: Math.round(route.minutes) + chargeMin + detourMin,
      costInr: known.reduce((a, s) => a + s.costInr, 0), costKnownFor: known.length,
      arriveSoc: plan.ok ? Math.round(plan.arriveSoc * 100) : null,
    },
    coverage, warnings,
  });
});
