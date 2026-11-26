import { prior } from "./forecast";

const poisson = (lambda, rand) => { let k = 0, p = 1; const L = Math.exp(-lambda); do { k++; p *= rand(); } while (p > L && k < 60); return k - 1; };

// Makes believable past bookings for a station so the forecast chart has something to show in a demo.
// Every one is flagged synthetic: the chart says "demo history" and no statistics count them.
export function genBookings({ station, kind, capacity, weeks, now, partsFn, rand = Math.random, runId = "x" }) {
  const out = [], shift = (station.id % 3) - 1, weekendBoost = 0.8 + (station.id % 4) * 0.15;
  const from = Math.floor((now - weeks * 7 * 864e5) / 3600e3) * 3600e3;
  let counter = 0;
  for (let t = from; t < now - 3600e3 && out.length < 1500; t += 3600e3) {
    const { dow, hour } = partsFn(new Date(t));
    const level = prior(dow, (hour + shift + 24) % 24) * (dow >= 5 ? weekendBoost : 1);
    const starts = poisson(capacity * level * 0.06, rand);
    for (let i = 0; i < starts; i++) {
      const at = t + Math.floor(rand() * 3600e3), hours = 1 + Math.floor(rand() * 4);
      const rate = kind === "ev" ? station.kwhRate * 15 * 0.5 : station.parkRate;
      out.push({
        code: `DEMO-${runId}${station.id}${kind[0]}${(counter++).toString(36)}`, userId: "demo", stationId: station.id, station: station.name,
        kind, detail: kind === "ev" ? "Demo charger" : "Demo bay", chargerIdx: kind === "ev" ? 0 : null, hours, total: Math.round(rate * hours),
        status: "completed", at: new Date(at), endsAt: new Date(at + hours * 3600e3), synthetic: true,
      });
    }
  }
  return out;
}
