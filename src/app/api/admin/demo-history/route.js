import { NextResponse } from "next/server";
import { connect } from "@/lib/mongo";
import { Booking, Station } from "@/lib/models";
import { genBookings } from "@/lib/demoHistory";
import { makeParts } from "@/lib/forecast";
import { adminCheck, guard } from "@/lib/api";

// Creates flagged demo bookings in the past so the forecast chart has data to show. Replaces any earlier demo history.
export const POST = guard(async (req) => {
  const { res } = await adminCheck(); if (res) return res;
  const b = await req.json().catch(() => ({}));
  const weeks = Math.min(8, Math.max(1, Math.round(Number(b.weeks) || 6)));
  await connect();
  await Booking.deleteMany({ synthetic: true });
  const partsFn = makeParts(process.env.APP_TIMEZONE || "Asia/Kolkata"), now = Date.now(), runId = Date.now().toString(36).slice(-4);
  let total = 0, stations = 0;
  for (const s of await Station.find({ live: { $ne: false } }).lean()) {
    const caps = { parking: s.parkTotal || 0, ev: (s.chargers || []).reduce((a, c) => a + c.total, 0) };
    let any = false;
    for (const kind of ["parking", "ev"]) {
      if (caps[kind] <= 0) continue;
      const docs = genBookings({ station: s, kind, capacity: caps[kind], weeks, now, partsFn, runId });
      if (docs.length) { await Booking.insertMany(docs, { ordered: false }); total += docs.length; any = true; }
    }
    if (any) stations++;
  }
  return NextResponse.json({ created: total, stations, weeks });
});

export const DELETE = guard(async () => {
  const { res } = await adminCheck(); if (res) return res;
  await connect();
  const r = await Booking.deleteMany({ synthetic: true });
  return NextResponse.json({ removed: r.deletedCount });
});
