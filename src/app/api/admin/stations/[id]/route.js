import { NextResponse } from "next/server";
import { connect } from "@/lib/mongo";
import { Booking, Station } from "@/lib/models";
import { releaseExpired } from "@/lib/stations";
import { parseStation } from "@/lib/stationInput";
import { adminCheck, guard } from "@/lib/api";

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const activeFilter = (id, extra = {}) => ({ stationId: id, status: "active", endsAt: { $gt: new Date() }, ...extra });

export const PUT = guard(async (req, { params }) => {
  const { res } = await adminCheck(); if (res) return res;
  const id = Number((await params).id);
  const { data, error } = parseStation(await req.json());
  if (error) return NextResponse.json({ error }, { status: 400 });
  await connect();
  await releaseExpired();
  const s = await Station.findOne({ id }).lean();
  if (!s) return NextResponse.json({ error: "Station not found." }, { status: 404 });

  // Never shrink a station below what is already booked.
  const parked = await Booking.countDocuments(activeFilter(id, { kind: "parking" }));
  if (data.parkTotal < parked) return NextResponse.json({ error: `${parked} parking bays are booked right now, so the total cannot go below ${parked}.` }, { status: 409 });
  for (let i = 0; i < s.chargers.length; i++) {
    const used = await Booking.countDocuments(activeFilter(id, { kind: "ev", chargerIdx: i }));
    const next = data.chargers[i];
    if (used > 0 && (!next || next.total < used))
      return NextResponse.json({ error: `Charger ${s.chargers[i].kind} ${s.chargers[i].kw} kW has ${used} active booking(s). Cancel them first or keep at least ${used}.` }, { status: 409 });
  }

  // Keep "free" in step with the new totals.
  const parkFree = clamp(s.parkFree + (data.parkTotal - s.parkTotal), 0, data.parkTotal);
  const chargers = data.chargers.map((c, i) => {
    const old = s.chargers[i];
    return { ...c, free: old ? clamp(old.free + (c.total - old.total), 0, c.total) : c.total };
  });
  await Station.updateOne({ id }, { $set: {
    name: data.name, area: data.area, lat: data.lat, lng: data.lng, hours: data.hours,
    parkTotal: data.parkTotal, parkRate: data.parkRate, kwhRate: data.kwhRate, parkFree, chargers,
    loc: { type: "Point", coordinates: [data.lng, data.lat] },
  } });
  return NextResponse.json({ ok: true });
});

export const DELETE = guard(async (_req, { params }) => {
  const { res } = await adminCheck(); if (res) return res;
  const id = Number((await params).id);
  await connect();
  await releaseExpired();
  const n = await Booking.countDocuments(activeFilter(id));
  if (n > 0) return NextResponse.json({ error: `This station has ${n} active booking(s). Cancel them first.` }, { status: 409 });
  const r = await Station.deleteOne({ id });
  return r.deletedCount ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Station not found." }, { status: 404 });
});
