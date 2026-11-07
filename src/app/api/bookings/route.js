import { NextResponse } from "next/server";
import { stations, bookings } from "@/lib/data";

export async function POST(req) {
  const { stationId, kind, hours = 1 } = await req.json();
  const s = stations.find((x) => x.id === stationId);
  if (!s) return NextResponse.json({ error: "Station not found." }, { status: 404 });
  const h = Math.min(8, Math.max(1, Number(hours) || 1));
  let total, detail;
  if (kind === "ev") {
    const c = s.chargers.find((c) => c.free > 0);
    if (!c) return NextResponse.json({ error: "No charger is free right now. Try another station." }, { status: 409 });
    c.free -= 1;
    total = Math.round(s.kwhRate * 15 * h * 0.5);
    detail = `${c.kind} ${c.kw} kW`;
  } else {
    if (s.parkFree < 1) return NextResponse.json({ error: "This lot is full. Try another station." }, { status: 409 });
    s.parkFree -= 1;
    total = s.parkRate * h;
    detail = "Parking bay";
  }
  const b = { code: "PNP-" + Math.random().toString(36).slice(2, 7).toUpperCase(), station: s.name, kind, detail, hours: h, total, at: new Date().toISOString() };
  bookings.push(b);
  return NextResponse.json(b, { status: 201 });
}

export async function GET() {
  return NextResponse.json(bookings);
}
