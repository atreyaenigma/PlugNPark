// Approximate real-world figures (not manufacturer claims). Users can enter their own under "Custom".
export const VEHICLES = [
  { id: "nexon-ev-lr", name: "Tata Nexon EV (long range)", batteryKwh: 40.5, rangeKm: 300, maxDcKw: 60, maxAcKw: 7.2, connectors: ["CCS", "Type 2"] },
  { id: "tiago-ev", name: "Tata Tiago EV", batteryKwh: 24, rangeKm: 200, maxDcKw: 25, maxAcKw: 7.2, connectors: ["CCS", "Type 2"] },
  { id: "punch-ev", name: "Tata Punch EV (long range)", batteryKwh: 35, rangeKm: 270, maxDcKw: 50, maxAcKw: 7.2, connectors: ["CCS", "Type 2"] },
  { id: "xuv400", name: "Mahindra XUV400", batteryKwh: 39.4, rangeKm: 280, maxDcKw: 50, maxAcKw: 7.2, connectors: ["CCS", "Type 2"] },
  { id: "zs-ev", name: "MG ZS EV", batteryKwh: 50.3, rangeKm: 320, maxDcKw: 75, maxAcKw: 7.4, connectors: ["CCS", "Type 2"] },
  { id: "atto3", name: "BYD Atto 3", batteryKwh: 60.5, rangeKm: 400, maxDcKw: 80, maxAcKw: 11, connectors: ["CCS", "Type 2"] },
  { id: "comet-ev", name: "MG Comet EV (AC charging only)", batteryKwh: 17.3, rangeKm: 150, maxDcKw: 0, maxAcKw: 3.3, connectors: ["Type 2"] },
  { id: "custom", name: "Custom car", batteryKwh: 40, rangeKm: 280, maxDcKw: 50, maxAcKw: 7, connectors: ["CCS", "Type 2"] },
];

export const DC_KINDS = ["CCS", "CHAdeMO"];
export const CONNECTOR_KINDS = ["CCS", "CHAdeMO", "Type 2"];
const GUESS_KW = { CCS: 30, CHAdeMO: 25, "Type 2": 7 }; // used when a listing has no power figure

// What a charger can really deliver to this car, or null if it does not fit.
export function usablePower(c, v) {
  const estimated = !c.kw;
  if (DC_KINDS.includes(c.kind)) {
    if (!v.connectors.includes(c.kind) || !(v.maxDcKw > 0)) return null;
    return { kw: Math.min(c.kw || GUESS_KW[c.kind], v.maxDcKw), estimated };
  }
  if (c.kind === "Type 2") {
    if (!v.connectors.includes("Type 2") || !(v.maxAcKw > 0)) return null;
    return { kw: Math.min(c.kw || GUESS_KW["Type 2"], v.maxAcKw), estimated };
  }
  return null;
}

// Best compatible charger at a station: prefers one that is free now (live stations), then the fastest.
export function bestCharger(station, v, minKw = 0) {
  let best = null, bestRank = -1;
  station.chargers.forEach((c, index) => {
    const u = usablePower(c, v);
    if (!u || u.kw < minKw) return;
    const rank = u.kw + (station.live && c.free > 0 ? 1000 : 0);
    if (rank > bestRank) { bestRank = rank; best = { kind: c.kind, ratedKw: c.kw, usableKw: u.kw, estimated: u.estimated, free: station.live ? c.free : null, total: c.total, index }; }
  });
  return best;
}

// Validates a vehicle sent by the browser.
export function cleanVehicle(v) {
  const num = (x, lo, hi) => { const n = Number(x); return Number.isFinite(n) && n >= lo && n <= hi ? n : null; };
  const batteryKwh = num(v?.batteryKwh, 5, 200), rangeKm = num(v?.rangeKm, 50, 800);
  const maxDcKw = num(v?.maxDcKw ?? 0, 0, 350), maxAcKw = num(v?.maxAcKw ?? 0, 0, 22);
  const connectors = Array.isArray(v?.connectors) ? v.connectors.filter((k) => CONNECTOR_KINDS.includes(k)) : [];
  if (batteryKwh === null || rangeKm === null || maxDcKw === null || maxAcKw === null) return { error: "Check the car details: battery 5 to 200 kWh, range 50 to 800 km, charging power within normal limits." };
  if (!connectors.length) return { error: "Choose at least one connector your car can use." };
  return { vehicle: { name: String(v.name || "Your car").slice(0, 60), batteryKwh, rangeKm, maxDcKw, maxAcKw, connectors } };
}

// ---------- compatibility ----------
// How well a station suits a car: "fast" (24 kW or more), "slow", "none" (no connector fits),
// "na" (no chargers at all, for example parking only) or "unknown" (no car saved yet).
export function compat(station, v) {
  if (!station?.chargers?.length) return { status: "na" };
  if (!v) return { status: "unknown" };
  let best = null;
  for (const c of station.chargers) {
    const u = usablePower(c, v);
    if (u && (!best || u.kw > best.kw)) best = { ...u, kind: c.kind };
  }
  if (!best) {
    const has = [...new Set(station.chargers.map((c) => c.kind))].join(", ");
    return { status: "none", reason: `This station has ${has}. ${v.name} takes ${v.connectors.join(" and ")}${v.maxDcKw > 0 ? "" : " (AC only)"}.` };
  }
  const minutes = Math.round(((0.6 * v.batteryKwh) / (best.kw * 0.85)) * 60);   // 20% to 80%
  return { status: best.kw >= 24 ? "fast" : "slow", kw: best.kw, kind: best.kind, estimated: best.estimated, minutes };
}

// ---------- form state <-> saved vehicle ----------
const customOf = (v) => ({ name: v.presetId === "custom" ? v.name : "My car", batteryKwh: String(v.batteryKwh), rangeKm: String(v.rangeKm), maxDcKw: String(v.maxDcKw), maxAcKw: String(v.maxAcKw), connectors: [...v.connectors] });
export const emptyState = (id = "") => ({ id, custom: customOf(VEHICLES.find((p) => p.id === "custom")) });
export function stateFromVehicle(v) {
  if (!v) return emptyState("");
  const preset = VEHICLES.find((p) => p.id === v.presetId && p.id !== "custom");
  return preset ? { id: preset.id, custom: customOf(preset) } : { id: "custom", custom: customOf(v) };
}
// null until a car is chosen
export function vehicleFromState(s) {
  if (!s.id) return null;
  const preset = VEHICLES.find((p) => p.id === s.id && p.id !== "custom");
  if (preset) return { presetId: preset.id, name: preset.name, batteryKwh: preset.batteryKwh, rangeKm: preset.rangeKm, maxDcKw: preset.maxDcKw, maxAcKw: preset.maxAcKw, connectors: [...preset.connectors] };
  const c = s.custom;
  return { presetId: "custom", name: String(c.name || "").trim().slice(0, 60) || "My car", batteryKwh: Number(c.batteryKwh), rangeKm: Number(c.rangeKm), maxDcKw: Number(c.maxDcKw), maxAcKw: Number(c.maxAcKw), connectors: [...c.connectors] };
}
