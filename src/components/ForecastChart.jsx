"use client";
import { useEffect, useMemo, useState } from "react";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const hr = (h) => `${h % 12 === 0 ? 12 : h % 12} ${h < 12 ? "AM" : "PM"}`;
const level = (v) => (v >= 0.7 ? "high" : v >= 0.35 ? "mid" : "low");
const WORD = { high: "busy", mid: "moderate", low: "quiet" };

// Contiguous runs of hours at or above a threshold, e.g. [[17,19]] -> "5 to 8 PM".
function runs(vals, ok) {
  const out = []; let s = null;
  vals.forEach((v, h) => { if (ok(v)) { if (s === null) s = h; } else if (s !== null) { out.push([s, h - 1]); s = null; } });
  if (s !== null) out.push([s, 23]);
  return out;
}
const span = ([a, b]) => (a === b ? hr(a) : `${hr(a)} to ${hr(b + 1 > 23 ? 0 : b + 1)}`);

export default function ForecastChart({ stationId }) {
  const [data, setData] = useState(null);
  const [kind, setKind] = useState(null);
  const [day, setDay] = useState(null);

  useEffect(() => {
    fetch(`/api/stations/${stationId}/forecast`, { cache: "no-store" }).then((r) => r.json()).then((d) => {
      setData(d);
      const ks = Object.keys(d.kinds || {});
      setKind(ks.includes("ev") && !ks.includes("parking") ? "ev" : ks[0] || null);
      setDay(d.now?.dow ?? 0);
    }).catch(() => {});
  }, [stationId]);

  const f = data?.kinds?.[kind];
  const vals = f && day != null ? f.matrix[day] : null;
  const summary = useMemo(() => {
    if (!vals) return null;
    const max = Math.max(...vals);
    const busy = runs(vals, (v) => v >= max * 0.9 && v >= 0.5).slice(0, 2).map(span).join(" and ");
    const quiet = runs(vals.map((v, h) => (h >= 6 && h <= 22 ? v : 1)), (v) => v < 0.3).slice(0, 1).map(span).join("");
    return { busy, quiet };
  }, [vals]);

  if (!data || data.live === false || !kind || !f) return null;
  const isToday = day === data.now.dow;
  const basis = f.basis === "typical" ? "No bookings here yet, so this is a typical city pattern, not measured at this station."
    : f.basis === "blend" ? `Based on ${f.bookings} booking${f.bookings > 1 ? "s" : ""} so far, mixed with a typical city pattern.`
    : `Based on ${f.bookings} bookings over the last ${f.weeks} week${f.weeks > 1 ? "s" : ""}.`;

  return (
    <section className="block" aria-labelledby="fc-h">
      <h2 id="fc-h">When is it busy?</h2>
      <div className="fc-controls">
        {Object.keys(data.kinds).length > 1 && (
          <div className="row" role="group" aria-label="What to forecast">
            {Object.keys(data.kinds).map((k) => <button key={k} className={kind === k ? "pill on" : "pill"} onClick={() => setKind(k)}>{k === "ev" ? "EV charging" : "Parking"}</button>)}
          </div>
        )}
        <div className="row days" role="group" aria-label="Day of the week">
          {DAYS.map((d, i) => <button key={d} className={day === i ? "pill on" : "pill"} aria-pressed={day === i} onClick={() => setDay(i)}>{d}{i === data.now.dow ? " (today)" : ""}</button>)}
        </div>
      </div>

      {summary?.busy ? <p className="fc-sum">Usually busiest around <b>{summary.busy}</b>.{summary.quiet && <> Quietest around <b>{summary.quiet}</b>.</>}</p> : <p className="fc-sum">Demand looks even through the day.</p>}

      <svg className="fc" viewBox="0 0 720 170" role="img" aria-label={`Expected demand by hour on ${DAYS[day]}. ${summary?.busy ? `Busiest around ${summary.busy}.` : ""}`}>
        {vals.map((v, h) => {
          const full = f.often[day][h], hgt = Math.max(4, v * 120), x = 8 + h * 29.5;
          return (
            <g key={h}>
              <title>{`${hr(h)}: ${full ? "often full" : WORD[level(v)]}`}</title>
              <rect x={x} y={134 - hgt} width="24" height={hgt} rx="4" className={`bar ${level(v)} ${isToday && h === data.now.hour ? "now" : ""}`} />
              {full && <text x={x + 12} y={128 - hgt} textAnchor="middle" className="fullmark">!</text>}
              {h % 3 === 0 && <text x={x + 12} y="156" textAnchor="middle" className="axis">{hr(h).replace(" ", "").toLowerCase()}</text>}
            </g>
          );
        })}
      </svg>
      <div className="fc-legend"><i className="low" /> Quiet <i className="mid" /> Moderate <i className="high" /> Busy {isToday && <><i className="nowkey" /> Now</>}</div>

      <details className="fc-table">
        <summary>Show as a table</summary>
        <table><thead><tr><th>Time</th><th>Expected</th></tr></thead>
          <tbody>{vals.map((v, h) => <tr key={h}><td>{hr(h)}</td><td>{f.often[day][h] ? "Often full" : WORD[level(v)]}</td></tr>)}</tbody></table>
      </details>

      <p className="muted small-note">{basis}{f.demo ? " This history is demo data." : ""} It shows when drivers tend to book on PlugNPark, not walk-in traffic. Times are in {data.tz.replace("_", " ")}.</p>
    </section>
  );
}
