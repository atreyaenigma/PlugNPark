import { NextResponse } from "next/server";
import { getStations } from "@/lib/stations";
import { guard } from "@/lib/api";

export const dynamic = "force-dynamic";
export const GET = guard(async (req) => {
  const p = new URL(req.url).searchParams;
  const type = p.get("type") || "all";
  const q = (p.get("q") || "").toLowerCase();
  const fast = p.get("fast") === "1";
  const lat = parseFloat(p.get("lat")), lng = parseFloat(p.get("lng"));
  const near = Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
  const radius = parseFloat(p.get("radius"));
  const list = (await getStations(near, radius > 0 ? radius : undefined)).filter((s) => {
    if (type === "ev" && !s.chargers.length) return false;
    if (type === "parking" && !s.parkTotal) return false;
    if (fast && !s.chargers.some((c) => c.kw >= 50)) return false;
    if (q && !(s.name + s.area).toLowerCase().includes(q)) return false;
    return true;
  });
  return NextResponse.json(list);
});
