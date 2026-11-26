import { NextResponse } from "next/server";
import { connect } from "@/lib/mongo";
import { Station } from "@/lib/models";
import { adminCheck, guard } from "@/lib/api";

// Turns an imported (not live) station into one managed on this site, with bookings and live counts.
export const POST = guard(async (_req, { params }) => {
  const { res } = await adminCheck(); if (res) return res;
  const id = Number((await params).id);
  await connect();
  const s = await Station.findOne({ id }).lean();
  if (!s) return NextResponse.json({ error: "Station not found." }, { status: 404 });
  if (s.live !== false) return NextResponse.json({ error: "Already live." }, { status: 409 });
  await Station.updateOne({ id }, { $set: { live: true, parkFree: s.parkTotal, chargers: s.chargers.map((c) => ({ kind: c.kind, kw: c.kw, total: c.total, free: c.total })), liveAt: new Date() } });
  return NextResponse.json({ ok: true });
});
