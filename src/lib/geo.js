// Small geography helpers. Points are [lat, lng].
const R = 6371;
const rad = (d) => (d * Math.PI) / 180;

export function haversineKm(a, b) {
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Cumulative distance along a polyline, rescaled so the last value equals totalKm (the router's own figure).
export function cumulative(points, totalKm) {
  const cum = [0];
  for (let i = 1; i < points.length; i++) cum.push(cum[i - 1] + haversineKm({ lat: points[i - 1][0], lng: points[i - 1][1] }, { lat: points[i][0], lng: points[i][1] }));
  const last = cum[cum.length - 1];
  const k = totalKm && last ? totalKm / last : 1;
  return cum.map((d) => d * k);
}

// Nearest point of the route to p: how far along the route it is, and how far off the road (km).
export function project(p, points, cum) {
  let best = { off: Infinity, along: 0 };
  const k = Math.cos(rad(p.lat));
  for (let i = 0; i < points.length - 1; i++) {
    const ax = (points[i][1] - p.lng) * k * 111.32, ay = (points[i][0] - p.lat) * 110.57;
    const bx = (points[i + 1][1] - p.lng) * k * 111.32, by = (points[i + 1][0] - p.lat) * 110.57;
    const dx = bx - ax, dy = by - ay, len2 = dx * dx + dy * dy;
    const t = len2 ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len2)) : 0;
    const d = Math.hypot(ax + t * dx, ay + t * dy);
    if (d < best.off) best = { off: d, along: cum[i] + t * (cum[i + 1] - cum[i]) };
  }
  return best;
}

// Points roughly every stepKm along the route, always including the start and end.
export function sampleAlong(points, cum, stepKm) {
  const out = [{ lat: points[0][0], lng: points[0][1] }];
  let next = stepKm;
  for (let i = 1; i < points.length; i++) {
    if (cum[i] >= next) { out.push({ lat: points[i][0], lng: points[i][1] }); next = cum[i] + stepKm; }
  }
  const end = points[points.length - 1];
  out.push({ lat: end[0], lng: end[1] });
  return out;
}

// Thins a long polyline for the browser.
export function decimate(points, minKm) {
  const out = [points[0]];
  let last = { lat: points[0][0], lng: points[0][1] };
  for (let i = 1; i < points.length - 1; i++) {
    const p = { lat: points[i][0], lng: points[i][1] };
    if (haversineKm(last, p) >= minKm) { out.push(points[i]); last = p; }
  }
  out.push(points[points.length - 1]);
  return out;
}

// A straight line, used only when the routing service is unavailable.
export function straightRoute(a, b) {
  const n = 40, points = [];
  for (let i = 0; i <= n; i++) points.push([a.lat + ((b.lat - a.lat) * i) / n, a.lng + ((b.lng - a.lng) * i) / n]);
  const km = haversineKm(a, b) * 1.25; // roads are longer than straight lines
  return { points, km, minutes: (km / 55) * 60, approximate: true };
}
