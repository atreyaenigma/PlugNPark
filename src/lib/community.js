import { connect } from "./mongo";
import { Review, Report } from "./models";

export const EMPTY_COMMUNITY = { rating: null, reviewCount: 0, community: { state: null, broken: 0, worked: 0, lastBrokenAt: null, lastWorkedAt: null } };
const cache = globalThis.__pnpComm || (globalThis.__pnpComm = { t: 0, v: null });
export const bustCommunity = () => { cache.t = 0; };

// Ratings, and what drivers have said recently, for every station (cached for a few seconds).
//  "broken":  an open report in the last 72 hours with no "it worked" report after it
//  "working": at least one "it worked" report in the last 14 days
export async function communitySummary() {
  if (cache.v && Date.now() - cache.t < 5000) return cache.v;
  await connect();
  const now = Date.now();
  const [rev, rep] = await Promise.all([
    Review.aggregate([{ $group: { _id: "$stationId", avg: { $avg: "$rating" }, n: { $sum: 1 } } }]),
    Report.aggregate([
      { $match: { $or: [
        { type: "broken", status: "open", createdAt: { $gte: new Date(now - 72 * 3600e3) } },
        { type: "worked", status: "info", createdAt: { $gte: new Date(now - 14 * 864e5) } },
      ] } },
      { $group: { _id: { s: "$stationId", t: "$type" }, users: { $addToSet: "$userId" }, last: { $max: "$createdAt" } } },
    ]),
  ]);
  const out = new Map();
  const get = (id) => { if (!out.has(id)) out.set(id, { rating: null, reviewCount: 0, community: { ...EMPTY_COMMUNITY.community } }); return out.get(id); };
  for (const r of rev) { const o = get(r._id); o.rating = Math.round(r.avg * 10) / 10; o.reviewCount = r.n; }
  for (const r of rep) {
    const c = get(r._id.s).community;
    if (r._id.t === "broken") { c.broken = r.users.length; c.lastBrokenAt = r.last; }
    else { c.worked = r.users.length; c.lastWorkedAt = r.last; }
  }
  for (const o of out.values()) {
    const c = o.community;
    if (c.broken > 0 && !(c.lastWorkedAt && new Date(c.lastWorkedAt) > new Date(c.lastBrokenAt))) c.state = "broken";
    else if (c.worked > 0) c.state = "working";
  }
  cache.v = out; cache.t = Date.now();
  return out;
}
