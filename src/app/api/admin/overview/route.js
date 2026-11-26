import { NextResponse } from "next/server";
import { connect } from "@/lib/mongo";
import { Booking, Report, Review, Station, User } from "@/lib/models";
import { bookingState, demoOn, getStations } from "@/lib/stations";
import { adminCheck, guard } from "@/lib/api";

export const dynamic = "force-dynamic";
export const GET = guard(async () => {
  const { res } = await adminCheck(); if (res) return res;
  const stations = await getStations(); // also releases expired bookings
  await connect();
  const now = new Date();
  const [users, bookings, active, revenue, recent] = await Promise.all([
    User.countDocuments(),
    Booking.countDocuments({ synthetic: { $ne: true } }),
    Booking.countDocuments({ status: "active", endsAt: { $gt: now } }),
    Booking.aggregate([{ $match: { status: { $ne: "cancelled" }, synthetic: { $ne: true } } }, { $group: { _id: null, sum: { $sum: "$total" } } }]),
    Booking.find({ synthetic: { $ne: true } }).sort({ at: -1 }).limit(25).lean(),
  ]);
  const owners = await User.find({ _id: { $in: [...new Set(recent.map((b) => b.userId))].filter((x) => /^[a-f\d]{24}$/i.test(x)) } }).lean();
  const email = Object.fromEntries(owners.map((u) => [String(u._id), u.email]));
  const [reports, reviews, demoCount] = await Promise.all([
    Report.find({ status: "open" }).sort({ createdAt: -1 }).limit(50).lean(),
    Review.find().sort({ updatedAt: -1 }).limit(10).lean(),
    Booking.countDocuments({ synthetic: true }),
  ]);
  const names = Object.fromEntries((await Station.find({ id: { $in: [...reports, ...reviews].map((x) => x.stationId) } }).lean()).map((s) => [s.id, s.name]));
  const ids = [...new Set([...reports, ...reviews].map((x) => x.userId))].filter((x) => /^[a-f\d]{24}$/i.test(x));
  const mails = Object.fromEntries((await User.find({ _id: { $in: ids } }).lean()).map((u) => [String(u._id), u.email]));
  return NextResponse.json({
    openReports: reports.map((r) => ({ id: String(r._id), stationId: r.stationId, station: names[r.stationId] || `#${r.stationId}`, type: r.type, note: r.note, at: r.createdAt, userEmail: mails[r.userId] || "unknown" })),
    recentReviews: reviews.map((r) => ({ id: String(r._id), stationId: r.stationId, station: names[r.stationId] || `#${r.stationId}`, rating: r.rating, comment: r.comment, at: r.updatedAt, userEmail: mails[r.userId] || "unknown" })),
    demoBookings: demoCount,
    stats: { stations: stations.length, users, bookings, active, revenue: revenue[0]?.sum || 0 },
    stations, demo: await demoOn(),
    recent: recent.map((b) => ({ code: b.code, station: b.station, kind: b.kind, detail: b.detail, hours: b.hours, total: b.total, at: b.at, state: bookingState(b), checkedIn: !!b.checkedInAt, userEmail: email[b.userId] || "unknown" })),
  });
});
