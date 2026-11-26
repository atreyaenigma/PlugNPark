import { NextResponse } from "next/server";
import { connect } from "@/lib/mongo";
import { Station } from "@/lib/models";
import { importArea, OcmError } from "@/lib/ocmImport";
import { adminCheck, guard } from "@/lib/api";

const bad = (error, status = 502) => NextResponse.json({ error }, { status });

export const POST = guard(async (req) => {
  const { res } = await adminCheck(); if (res) return res;
  const b = await req.json();
  const lat = Number(b.lat), lng = Number(b.lng), radius = Number(b.radius ?? 15), max = Number(b.max ?? 50);
  if (!(Math.abs(lat) <= 90) || !(Math.abs(lng) <= 180)) return bad("Enter a valid latitude and longitude.", 400);
  if (!(radius >= 1 && radius <= 100)) return bad("Radius must be between 1 and 100 km.", 400);
  if (!(max >= 1 && max <= 200)) return bad("Maximum results must be between 1 and 200.", 400);
  try { return NextResponse.json(await importArea({ lat, lng, radius, max })); }
  catch (e) { if (e instanceof OcmError) return bad(e.message, e.status); throw e; }
});

// Removes imported stations that were never made live.
export const DELETE = guard(async () => {
  const { res } = await adminCheck(); if (res) return res;
  await connect();
  const r = await Station.deleteMany({ source: "ocm", live: false });
  return NextResponse.json({ removed: r.deletedCount });
});
