import { NextResponse } from "next/server";
import { connect } from "@/lib/mongo";
import { Booking, Station } from "@/lib/models";
import { currentUser } from "@/lib/auth";
import { bookingState, releaseExpired, restore } from "@/lib/stations";
import { guard } from "@/lib/api";

export const dynamic = "force-dynamic";

export const GET = guard(async () => {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Please log in." }, { status: 401 });
  await releaseExpired();
  const list = await Booking.find({ userId: user.id }).sort({ at: -1 }).lean();
  return NextResponse.json(list.map((b) => ({
    code: b.code, stationId: b.stationId, station: b.station, kind: b.kind, detail: b.detail,
    hours: b.hours, total: b.total, at: b.at, state: bookingState(b), checkedIn: !!b.checkedInAt,
  })));
});

export const POST = guard(async (req) => {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Please log in to reserve." }, { status: 401 });
  const { stationId, kind, hours = 1 } = await req.json();
  await connect();
  await releaseExpired();
  const s = await Station.findOne({ id: Number(stationId) }).lean();
  if (!s) return NextResponse.json({ error: "Station not found." }, { status: 404 });
  if (s.live === false) return NextResponse.json({ error: "This station is not live, so it cannot be booked here." }, { status: 409 });
  const h = Math.min(8, Math.max(1, Number(hours) || 1));

  // The slot is taken with one atomic update, so two people can never grab the last one.
  let total, detail, chargerIdx = null;
  if (kind === "parking") {
    const got = await Station.findOneAndUpdate({ id: s.id, parkFree: { $gt: 0 } }, { $inc: { parkFree: -1 }, $set: { liveAt: new Date() } });
    if (!got) return NextResponse.json({ error: "This lot is full. Try another station." }, { status: 409 });
    total = s.parkRate * h; detail = "Parking bay";
  } else if (kind === "ev") {
    const before = await Station.findOneAndUpdate(
      { id: s.id, chargers: { $elemMatch: { free: { $gt: 0 } } } },
      { $inc: { "chargers.$.free": -1 }, $set: { liveAt: new Date() } }
    ).lean();
    if (!before) return NextResponse.json({ error: "No charger is free right now. Try another station." }, { status: 409 });
    chargerIdx = before.chargers.findIndex((c) => c.free > 0);
    const c = before.chargers[chargerIdx];
    total = Math.round(s.kwhRate * 15 * h * 0.5); detail = `${c.kind} ${c.kw} kW`;
  } else return NextResponse.json({ error: "Choose parking or an EV charger." }, { status: 400 });

  const doc = {
    code: "PNP-" + Math.random().toString(36).slice(2, 7).toUpperCase(),
    userId: user.id, stationId: s.id, station: s.name, kind, detail, chargerIdx, hours: h, total,
    status: "active", at: new Date(), endsAt: new Date(Date.now() + h * 3600e3),
  };
  try { await Booking.create(doc); } catch (e) { await restore(doc); throw e; }
  return NextResponse.json({ code: doc.code, station: doc.station, kind, detail, hours: h, total, at: doc.at, state: "active" }, { status: 201 });
});
