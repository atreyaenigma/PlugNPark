import { Station, Booking } from "./models";

const held = (id, extra) => Booking.countDocuments({ stationId: id, status: "active", endsAt: { $gt: new Date() }, ...extra });

// Moves one slot: delta -1 = one more taken, +1 = one freed. Atomic, never below 0 and never above
// (total minus what active bookings are holding). Returns true if something changed.
export async function nudge(s, target, index, delta) {
  const now = new Date();
  if (target === "parking") {
    if (delta < 0) return !!(await Station.findOneAndUpdate({ id: s.id, parkFree: { $gt: 0 } }, { $inc: { parkFree: -1 }, $set: { liveAt: now } }));
    const cap = s.parkTotal - (await held(s.id, { kind: "parking" }));
    return !!(await Station.findOneAndUpdate({ id: s.id, $expr: { $lt: ["$parkFree", cap] } }, { $inc: { parkFree: 1 }, $set: { liveAt: now } }));
  }
  const path = `chargers.${index}.free`;
  if (delta < 0) return !!(await Station.findOneAndUpdate({ id: s.id, [path]: { $gt: 0 } }, { $inc: { [path]: -1 }, $set: { liveAt: now } }));
  const cap = (s.chargers[index]?.total || 0) - (await held(s.id, { kind: "ev", chargerIdx: index }));
  return !!(await Station.findOneAndUpdate(
    { id: s.id, $expr: { $lt: [{ $arrayElemAt: ["$chargers.free", index] }, cap] } },
    { $inc: { [path]: 1 }, $set: { liveAt: now } }
  ));
}
