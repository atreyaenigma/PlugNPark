import { NextResponse } from "next/server";
import { stations, bookings } from "@/lib/data";

export async function GET() {
  return NextResponse.json({
    stations: stations.length,
    freeBays: stations.reduce((a, s) => a + s.parkFree, 0),
    freeChargers: stations.reduce((a, s) => a + s.chargers.reduce((x, c) => x + c.free, 0), 0),
    bookings: bookings.length,
  });
}
