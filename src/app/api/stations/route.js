import { NextResponse } from "next/server";
import { stations } from "@/lib/data";

export async function GET(req) {
  const p = new URL(req.url).searchParams;
  const type = p.get("type") || "all";
  const q = (p.get("q") || "").toLowerCase();
  const fast = p.get("fast") === "1";
  const list = stations.filter((s) => {
    if (type === "ev" && !s.chargers.length) return false;
    if (type === "parking" && !s.parkTotal) return false;
    if (fast && !s.chargers.some((c) => c.kw >= 50)) return false;
    if (q && !(s.name + s.area).toLowerCase().includes(q)) return false;
    return true;
  });
  return NextResponse.json(list);
}
