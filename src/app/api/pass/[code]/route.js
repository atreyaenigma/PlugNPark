import { NextResponse } from "next/server";
import { connect } from "@/lib/mongo";
import { Booking, Station } from "@/lib/models";
import { bookingState } from "@/lib/stations";
import { guard } from "@/lib/api";

export const dynamic = "force-dynamic";

// Public on purpose: whoever holds the code can see this pass. It never includes the driver's details.
export const GET = guard(async (_req, { params }) => {
  const { code } = await params;
  await connect();
  const b = await Booking.findOne({ code: String(code).toUpperCase() }).lean();
  if (!b) return NextResponse.json({ error: "Pass not found." }, { status: 404 });
  const s = await Station.findOne({ id: b.stationId }).lean();
  return NextResponse.json({
    code: b.code, station: b.station, kind: b.kind, detail: b.detail, hours: b.hours, total: b.total,
    at: b.at, endsAt: b.endsAt, state: bookingState(b), checkedInAt: b.checkedInAt || null,
    lat: s?.lat ?? null, lng: s?.lng ?? null,
  });
});
