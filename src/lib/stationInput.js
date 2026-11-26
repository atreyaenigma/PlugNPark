export const KINDS = ["CCS", "Type 2", "CHAdeMO", "Other"];
const whole = (v, min, max) => { const n = Number(v); return v !== "" && Number.isInteger(n) && n >= min && n <= max ? n : null; };

// Validates what the admin form sends. Returns { data } or { error }.
export function parseStation(b) {
  const name = String(b.name || "").trim();
  const area = String(b.area || "").trim();
  if (name.length < 2) return { error: "Station name is required." };
  if (!area) return { error: "Area is required." };
  const lat = Number(b.lat), lng = Number(b.lng);
  if (b.lat === "" || b.lng === "" || !(lat >= -90 && lat <= 90) || !(lng >= -180 && lng <= 180))
    return { error: "Click the map to pick the station location." };
  const parkTotal = whole(b.parkTotal ?? 0, 0, 2000), parkRate = whole(b.parkRate ?? 0, 0, 10000), kwhRate = whole(b.kwhRate ?? 0, 0, 1000);
  if (parkTotal === null || parkRate === null || kwhRate === null) return { error: "Bays and prices must be whole numbers (0 or more)." };
  const raw = Array.isArray(b.chargers) ? b.chargers : [];
  if (raw.length > 8) return { error: "A station can have at most 8 charger types." };
  const chargers = [];
  for (const c of raw) {
    const kw = whole(c.kw, 1, 400), total = whole(c.total, 1, 50);
    if (!KINDS.includes(c.kind) || kw === null || total === null) return { error: "Each charger needs a type, power (1 to 400 kW) and a count (1 to 50)." };
    chargers.push({ kind: c.kind, kw, total });
  }
  if (parkTotal === 0 && chargers.length === 0) return { error: "Add parking bays, chargers, or both." };
  const hours = String(b.hours || "24 hours").trim().slice(0, 40) || "24 hours";
  return { data: { name, area, lat, lng, hours, parkTotal, parkRate, kwhRate, chargers } };
}
