import { NextResponse } from "next/server";
import { connect } from "@/lib/mongo";
import { Booking, Station } from "@/lib/models";
import { forecast, makeParts } from "@/lib/forecast";
import { guard } from "@/lib/api";

export const dynamic = "force-dynamic";

export const GET = guard(async (_req, { params }) => {
  const id = Number((await params).id);
  await connect();
  const s = await Station.findOne({ id }).lean();
  if (!s) return NextResponse.json({ error: "Station not found." }, { status: 404 });
  if (s.live === false) return NextResponse.json({ live: false });

  const tz = process.env.APP_TIMEZONE || "Asia/Kolkata";
  const partsFn = makeParts(tz), now = new Date();
  const since = new Date(now.getTime() - 56 * 864e5);
  const cap = { parking: s.parkTotal || 0, ev: (s.chargers || []).reduce((a, c) => a + c.total, 0) };
  const kinds = {};
  for (const kind of ["parking", "ev"]) {
    if (cap[kind] <= 0) continue;
    const bookings = await Booking.find({ stationId: id, kind, status: { $ne: "cancelled" }, endsAt: { $gt: since }, at: { $lt: now } }).select("at endsAt synthetic").lean();
    kinds[kind] = forecast({ bookings, capacity: cap[kind], now, partsFn });
  }
  return NextResponse.json({ live: true, tz, now: partsFn(now), kinds });
});
