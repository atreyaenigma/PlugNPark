import { NextResponse } from "next/server";
import { connect } from "@/lib/mongo";
import { Booking } from "@/lib/models";
import { restore } from "@/lib/stations";
import { adminCheck, guard } from "@/lib/api";

export const DELETE = guard(async (_req, { params }) => {
  const { res } = await adminCheck(); if (res) return res;
  const { code } = await params;
  await connect();
  const b = await Booking.findOne({ code }).lean();
  if (!b) return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  const claimed = await Booking.findOneAndUpdate({ code, status: "active", endsAt: { $gt: new Date() } }, { status: "cancelled" });
  if (!claimed) return NextResponse.json({ error: "Only active bookings can be cancelled." }, { status: 409 });
  await restore(b);
  return NextResponse.json({ ok: true });
});
