import { NextResponse } from "next/server";
import { connect } from "@/lib/mongo";
import { Booking, User } from "@/lib/models";
import { adminCheck, guard } from "@/lib/api";

export const POST = guard(async (req) => {
  const { res } = await adminCheck(); if (res) return res;
  const code = String((await req.json()).code || "").trim().toUpperCase();
  if (!code) return NextResponse.json({ error: "Enter a booking code." }, { status: 400 });
  await connect();
  const now = new Date();
  // One atomic update: only an active, unexpired, not-yet-checked-in booking can be checked in.
  const b = await Booking.findOneAndUpdate(
    { code, status: "active", endsAt: { $gt: now }, checkedInAt: null },
    { checkedInAt: now }, { new: true }
  ).lean();
  if (!b) {
    const cur = await Booking.findOne({ code }).lean();
    const why = !cur ? "No booking found with that code."
      : cur.status === "cancelled" ? "This booking was cancelled."
      : cur.checkedInAt ? `Already checked in at ${new Date(cur.checkedInAt).toLocaleTimeString()}.`
      : "This booking has expired.";
    return NextResponse.json({ error: why }, { status: cur ? 409 : 404 });
  }
  const owner = /^[a-f\d]{24}$/i.test(b.userId) ? await User.findById(b.userId).lean() : null;
  return NextResponse.json({ code: b.code, station: b.station, detail: b.detail, hours: b.hours, userEmail: owner?.email || "unknown", checkedInAt: b.checkedInAt });
});
