// Availability forecast. No imports, so it can be tested on its own.
//
// The chart shows BOOKING DEMAND on PlugNPark by day and hour, relative to the busiest hour at that station.
// With no bookings it shows a typical city pattern (and says so). With some bookings it blends the two.
// With enough bookings it shows only what was measured. It never claims more than the data supports.
const WEEKDAY = [.05, .04, .03, .03, .05, .10, .20, .40, .60, .70, .60, .55, .60, .55, .50, .50, .55, .70, .85, .90, .75, .50, .30, .12];
const WEEKEND = [.08, .06, .04, .03, .04, .06, .10, .20, .35, .50, .65, .75, .80, .80, .75, .75, .80, .85, .90, .85, .70, .50, .30, .15];
export const prior = (dow, hour) => (dow >= 5 ? WEEKEND : WEEKDAY)[hour];   // dow: Monday = 0 ... Sunday = 6
const MAX_PRIOR = 0.9;
export const ENOUGH = 30;   // bookings needed before the chart is "measured"

// Local day and hour for a date in a time zone, using the 15-minute-safe Intl API.
export function makeParts(timeZone) {
  const f = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short", hour: "numeric", hourCycle: "h23" });
  const DOW = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
  return (d) => {
    const p = f.formatToParts(d);
    let hour = Number(p.find((x) => x.type === "hour").value);
    if (hour === 24) hour = 0;
    return { dow: DOW[p.find((x) => x.type === "weekday").value], hour };
  };
}

export function forecast({ bookings, capacity, now, partsFn, windowDays = 56 }) {
  const end = now.getTime(), start = end - windowDays * 864e5, STEP = 15 * 60e3;
  const occ = Array.from({ length: 7 }, () => Array(24).fill(0));   // booked slot-hours per bucket
  let n = 0, synthetic = 0, earliest = end;

  for (const b of bookings) {
    const s = Math.max(new Date(b.at).getTime(), start), e = Math.min(new Date(b.endsAt).getTime(), end);
    if (!(e > s)) continue;                                           // only the past counts
    n++; if (b.synthetic) synthetic++; earliest = Math.min(earliest, s);
    for (let t = s; t < e; ) {
      const next = Math.min(e, (Math.floor(t / STEP) + 1) * STEP);
      const { dow, hour } = partsFn(new Date(t));
      occ[dow][hour] += (next - t) / 3600e3;
      t = next;
    }
  }

  const weeks = n ? Math.min(windowDays / 7, Math.max(1, Math.ceil((end - earliest) / (7 * 864e5)))) : 1;
  const frac = occ.map((row) => row.map((v) => Math.min(1, v / (weeks * Math.max(1, capacity)))));
  const peak = Math.max(...frac.flat());
  const c = Math.min(1, n / ENOUGH);                                  // how much to trust the measurements
  const matrix = frac.map((row, d) => row.map((v, h) => {
    const measured = peak > 0 ? v / peak : 0, typical = prior(d, h) / MAX_PRIOR;
    return Math.round((c * measured + (1 - c) * typical) * 100) / 100;
  }));
  const often = frac.map((row) => row.map((v) => n >= 10 && v >= 0.85));  // genuinely full, not just relatively busy
  return { matrix, often, basis: n === 0 ? "typical" : n < ENOUGH ? "blend" : "measured", bookings: n, weeks, demo: n > 0 && synthetic / n > 0.5 };
}
