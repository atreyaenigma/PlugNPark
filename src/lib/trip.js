// The trip planner. Pure maths with no imports, so it can be tested on its own.
//
// Rules it follows:
//  - never plans a leg that ends below the reserve battery (default 10%)
//  - drives as far as the battery allows, then stops at the best charger within reach
//  - charges only as much as needed (up to the target, default 80%), because fast charging slows near full
//  - a detour to a charger costs battery for the trip off the road and back
//
// candidates: [{ id, along, off, usableKw, live, free, penalty }]  (penalty: e.g. drivers reported it broken)  (along = km into the route, off = km from the road)
const CHARGE_EFFICIENCY = 0.85; // average power is below the peak because charging tapers
const STOP_OVERHEAD_MIN = 5;    // parking, plugging in, paying
const MARGIN = 0.05;            // extra battery kept when planning the final leg

const bonus = (c) =>
  (c.usableKw >= 100 ? 15 : c.usableKw >= 50 ? 10 : c.usableKw >= 25 ? 4 : 0) +
  (c.live ? (c.free > 0 ? 12 : -25) : 0) - c.off * 1.5 - (c.penalty || 0);

export function planTrip({ routeKm, candidates, vehicle, startSoc, reserve = 0.1, target = 0.8 }) {
  const full = vehicle.rangeKm;
  const stops = [];
  const used = new Set();
  let pos = 0, soc = startSoc;

  if (soc <= reserve) return { ok: false, stops, error: `The starting battery (${Math.round(soc * 100)}%) is at or below your ${Math.round(reserve * 100)}% reserve. Start with more charge.` };

  for (let n = 0; n < 12; n++) {
    const remaining = routeKm - pos;
    const reach = (soc - reserve) * full;
    if (reach >= remaining) break;                                   // destination is reachable

    const reachable = candidates.filter((c) => !used.has(c.id) && c.along > pos + 0.5 && (c.along - pos) + 2 * c.off <= reach);
    if (!reachable.length) {
      const next = candidates.filter((c) => !used.has(c.id) && c.along > pos).sort((a, b) => a.along - b.along)[0];
      return {
        ok: false, stops, reachKm: Math.round(reach), atKm: Math.round(pos), nextKm: next ? Math.round(next.along - pos) : null,
        error: next
          ? `No compatible charger within reach after ${Math.round(pos)} km. You can drive about ${Math.round(reach)} km from there, but the next charger is ${Math.round(next.along - pos)} km away. Start with more charge or allow a bigger detour.`
          : `No compatible charger found for the last ${Math.round(remaining)} km after ${Math.round(pos)} km. Chargers along this road may not be listed yet.`,
      };
    }

    const best = reachable.map((c) => ({ c, score: c.along + bonus(c) })).sort((a, b) => b.score - a.score)[0].c;
    const travelled = best.along - pos + 2 * best.off;
    const arrive = soc - travelled / full;
    const need = (routeKm - best.along) / full + reserve + MARGIN;     // battery wanted to finish the trip
    const cap = Math.min(1, Math.max(target, arrive + 0.05));
    const leave = Math.min(cap, need);
    const kwh = (leave - arrive) * vehicle.batteryKwh;
    const chargeMin = Math.round((kwh / (best.usableKw * CHARGE_EFFICIENCY)) * 60 + STOP_OVERHEAD_MIN);

    stops.push({ ...best, travelledKm: travelled, arriveSoc: arrive, leaveSoc: leave, chargeKwh: kwh, chargeMin });
    used.add(best.id);
    pos = best.along; soc = leave;
  }

  const finalReach = (soc - reserve) * full;
  if (finalReach < routeKm - pos - 1e-6) return { ok: false, stops, error: "This trip needs more than 12 charging stops. Try a different car or route." };
  return { ok: true, stops, arriveSoc: soc - (routeKm - pos) / full };
}
