import { connect } from "./mongo";
import { Station, Booking, Meta } from "./models";
import { communitySummary, EMPTY_COMMUNITY } from "./community";

export const bookingState = (b) =>
  b.status === "cancelled" ? "cancelled" : b.status === "completed" || new Date(b.endsAt) <= new Date() ? "completed" : "active";

// Give a slot back to its station.
export async function restore(b) {
  const now = new Date();
  if (b.kind === "parking") await Station.updateOne({ id: b.stationId }, { $inc: { parkFree: 1 }, $set: { liveAt: now } });
  else await Station.updateOne({ id: b.stationId }, { $inc: { [`chargers.${b.chargerIdx}.free`]: 1 }, $set: { liveAt: now } });
}

// True while an admin has "demo traffic" running (it expires by itself a few seconds after the admin tab stops).
export async function demoOn() {
  await connect();
  const m = await Meta.findOne({ key: "demoUntil" }).lean();
  return !!(m && new Date(m.value) > new Date());
}

// Bookings whose time ran out free their slot. Each one is claimed atomically so it is only released once.
export async function releaseExpired() {
  await connect();
  const due = await Booking.find({ status: "active", endsAt: { $lte: new Date() } }).lean();
  for (const b of due) {
    const claimed = await Booking.findOneAndUpdate({ _id: b._id, status: "active" }, { status: "completed" });
    if (claimed) await restore(b);
  }
}

const clean = (s) => ({
  id: s.id, name: s.name, area: s.area, lat: s.lat, lng: s.lng,
  parkFree: s.parkFree, parkTotal: s.parkTotal, parkRate: s.parkRate, kwhRate: s.kwhRate, hours: s.hours,
  chargers: s.chargers.map((c) => ({ kind: c.kind, kw: c.kw, free: c.free, total: c.total })),
  live: s.live !== false, source: s.source || "manual", ocmId: s.ocmId ?? null,
  operator: s.operator || "", usageCost: s.usageCost || "", liveAt: s.liveAt || null,
});

export async function getStations(near, maxKm) {
  await releaseExpired();
  // With a position, MongoDB sorts by distance using the 2dsphere index.
  if (near && Math.abs(near.lat) <= 90 && Math.abs(near.lng) <= 180) {
    const list = await Station.aggregate([
      { $geoNear: { near: { type: "Point", coordinates: [near.lng, near.lat] }, distanceField: "distance", spherical: true, key: "loc", ...(maxKm > 0 ? { maxDistance: maxKm * 1000 } : {}) } },
    ]);
    const sum = await communitySummary();
    return list.map((s) => ({ ...clean(s), ...(sum.get(s.id) || EMPTY_COMMUNITY), distanceKm: Math.round(s.distance / 100) / 10 }));
  }
  const sum = await communitySummary();
  return (await Station.find().sort({ id: 1 }).lean()).map((s) => ({ ...clean(s), ...(sum.get(s.id) || EMPTY_COMMUNITY) }));
}
export async function getStation(id) {
  await releaseExpired();
  const s = await Station.findOne({ id: Number(id) }).lean();
  if (!s) return null;
  const sum = await communitySummary();
  return { ...clean(s), ...(sum.get(s.id) || EMPTY_COMMUNITY) };
}
