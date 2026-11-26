import { NextResponse } from "next/server";
import { getStations } from "@/lib/stations";
import { Booking } from "@/lib/models";
import { guard } from "@/lib/api";

export const dynamic = "force-dynamic";
export const GET = guard(async () => {
  const st = await getStations();
  return NextResponse.json({
    stations: st.length,
    freeBays: st.filter((s) => s.live).reduce((a, s) => a + s.parkFree, 0),
    freeChargers: st.filter((s) => s.live).reduce((a, s) => a + s.chargers.reduce((x, c) => x + c.free, 0), 0),
    bookings: await Booking.countDocuments({ synthetic: { $ne: true } }),
  });
});
