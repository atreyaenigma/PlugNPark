import { connect } from "./mongo";
import { Station } from "./models";
import { mapPoi } from "./ocm";

export class OcmError extends Error {
  constructor(message, status = 502) { super(message); this.status = status; }
}

// Fetches real chargers around a point from Open Charge Map and stores them as "not live" stations.
export async function importArea({ lat, lng, radius = 15, max = 50 }) {
  const key = process.env.OCM_API_KEY || "";
  const url = new URL((process.env.OCM_BASE_URL || "https://api.openchargemap.io/v3") + "/poi/");
  const q = { output: "json", latitude: lat, longitude: lng, distance: radius, distanceunit: "KM", maxresults: max, client: "plugnpark" };
  Object.entries(q).forEach(([k, v]) => url.searchParams.set(k, String(v)));
  if (key) url.searchParams.set("key", key);

  let r;
  try { r = await fetch(url, { headers: key ? { "X-API-Key": key } : {}, signal: AbortSignal.timeout(20000), cache: "no-store" }); }
  catch { throw new OcmError("Could not reach Open Charge Map. Check your internet connection and try again."); }
  if (r.status === 401 || r.status === 403) throw new OcmError("Open Charge Map refused the request. Add your free API key as OCM_API_KEY in .env.local and restart the server.");
  if (!r.ok) throw new OcmError(`Open Charge Map returned an error (${r.status}). Try again in a moment.`);
  const pois = await r.json().catch(() => null);
  if (!Array.isArray(pois)) throw new OcmError("Open Charge Map sent an unexpected response.");

  await connect();
  const mapped = pois.map(mapPoi).filter(Boolean);
  const existing = new Map((await Station.find({ ocmId: { $in: mapped.map((m) => m.ocmId) } }).lean()).map((s) => [s.ocmId, s]));
  let nextId = ((await Station.findOne().sort({ id: -1 }).lean())?.id || 0) + 1;
  const fresh = [];
  let updated = 0, managed = 0;
  for (const m of mapped) {
    const loc = { type: "Point", coordinates: [m.lng, m.lat] };
    const old = existing.get(m.ocmId);
    if (old && old.live !== false) { managed++; continue; }               // already promoted: leave it alone
    if (old) {
      await Station.updateOne({ ocmId: m.ocmId }, { $set: { name: m.name, area: m.area, lat: m.lat, lng: m.lng, loc, chargers: m.chargers, operator: m.operator, usageCost: m.usageCost } });
      updated++;
    } else {
      fresh.push({ id: nextId++, ...m, loc, hours: "Hours not listed", parkTotal: 0, parkFree: 0, parkRate: 0, kwhRate: 0, live: false, source: "ocm" });
    }
  }
  if (fresh.length) await Station.insertMany(fresh);
  return { created: fresh.length, updated, alreadyManaged: managed, skipped: pois.length - mapped.length, found: pois.length };
}
