// Turns one Open Charge Map POI into a PlugNPark station (or null if it should be skipped).
const BY_ID = { 2: "CHAdeMO", 25: "Type 2", 1036: "Type 2", 32: "CCS", 33: "CCS" };
const SKIP_STATUS = [100, 150, 200, 210]; // not operational, planned, removed, duplicate

function kindOf(c) {
  const t = c.ConnectionType?.Title || c.ConnectionType?.FormalName || "";
  if (/ccs|combo/i.test(t)) return "CCS";
  if (/chademo/i.test(t)) return "CHAdeMO";
  if (/type 2|mennekes|62196/i.test(t)) return "Type 2";
  if (t) return "Other";
  return BY_ID[c.ConnectionTypeID] || "Other";
}

export function mapPoi(p) {
  const a = p?.AddressInfo || {};
  if (!Number.isFinite(a.Latitude) || !Number.isFinite(a.Longitude) || !Number.isFinite(p.ID)) return null;
  if (p.StatusType?.IsOperational === false || SKIP_STATUS.includes(p.StatusTypeID)) return null;
  const groups = new Map();
  for (const c of p.Connections || []) {
    const kind = kindOf(c), kw = Math.round(Number(c.PowerKW)) || 0;
    const key = `${kind}|${kw}`;
    const total = Math.min(50, (groups.get(key)?.total || 0) + Math.max(1, Number(c.Quantity) || 1));
    groups.set(key, { kind, kw, total });
  }
  const chargers = [...groups.values()].slice(0, 8).map((g) => ({ ...g, free: 0 }));
  if (!chargers.length) return null;
  return {
    ocmId: p.ID,
    name: (a.Title || "Charging station").trim().slice(0, 80),
    area: (a.Town || a.AddressLine1 || a.StateOrProvince || "Unknown area").trim().slice(0, 60),
    lat: a.Latitude, lng: a.Longitude, chargers,
    operator: (p.OperatorInfo?.Title || "").slice(0, 60),
    usageCost: (p.UsageCost || "").slice(0, 120),
  };
}
