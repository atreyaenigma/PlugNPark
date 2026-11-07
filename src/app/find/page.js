"use client";
import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import { statusOf } from "@/lib/status";
import Bolt from "@/components/Bolt";

const Map = dynamic(() => import("@/components/Map"), { ssr: false });
const TYPES = [["all", "All"], ["ev", "EV charging"], ["parking", "Parking"]];

function Bars({ free, total }) {
  return (
    <span className="bars" aria-label={`${free} of ${total} free`}>
      {Array.from({ length: total }, (_, i) => <i key={i} className={i < free ? "on" : ""} />)}
    </span>
  );
}

// Small pseudo-QR drawn from the booking code. Swap for a real QR library in production.
function Code({ code }) {
  const cells = [];
  let h = 7;
  for (const ch of code) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  for (let i = 0; i < 49; i++) { h = (h * 1103515245 + 12345) >>> 0; cells.push((h >> 16) & 1); }
  return (
    <svg viewBox="0 0 7 7" className="qr" shapeRendering="crispEdges" aria-hidden="true">
      {cells.map((c, i) => c ? <rect key={i} x={i % 7} y={Math.floor(i / 7)} width="1" height="1" /> : null)}
    </svg>
  );
}

export default function Find() {
  const [list, setList] = useState([]);
  const [type, setType] = useState("all");
  const [fast, setFast] = useState(false);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(null);
  const [kind, setKind] = useState("parking");
  const [hours, setHours] = useState(2);
  const [ticket, setTicket] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const r = await fetch(`/api/stations?type=${type}&q=${encodeURIComponent(q)}${fast ? "&fast=1" : ""}`);
    setList(await r.json());
  }, [type, q, fast]);
  useEffect(() => { load(); }, [load]);

  const pick = useCallback((id) => { setSel(id); setTicket(null); setError(""); }, []);
  const s = list.find((x) => x.id === sel);
  useEffect(() => { if (s) setKind(s.parkTotal ? "parking" : "ev"); }, [sel]); // eslint-disable-line

  const total = !s ? 0 : kind === "ev" ? Math.round(s.kwhRate * 15 * hours * 0.5) : s.parkRate * hours;

  const book = async () => {
    setError("");
    const r = await fetch("/api/bookings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stationId: s.id, kind, hours }) });
    const d = await r.json();
    if (!r.ok) setError(d.error); else { setTicket(d); load(); }
  };

  return (
    <main className="find">
      <aside className="panel">
        <label className="field"><span>Where are you going?</span>
          <input placeholder="Search a street or station" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <div className="seg">
          {TYPES.map(([v, l]) => <button key={v} aria-pressed={type === v} className={type === v ? "on" : ""} onClick={() => setType(v)}>{l}</button>)}
        </div>
        <label className="check"><input type="checkbox" checked={fast} onChange={(e) => setFast(e.target.checked)} /> Fast chargers only (50 kW and up)</label>

        <ul className="cards">
          {list.length === 0 && <li className="empty">No stations match. Clear a filter or try a different street.</li>}
          {list.map((x) => (
            <li key={x.id} className={sel === x.id ? "card sel" : "card"}>
              <button className="card-head" onClick={() => pick(x.id)} aria-expanded={sel === x.id}>
                <i className={`dot ${statusOf(x)}`} />
                <span className="card-title"><b>{x.name}</b><small>{x.area}</small></span>
              </button>
              <div className="card-meta">
                {x.parkTotal > 0 && <span>Parking <Bars free={Math.min(x.parkFree, 12)} total={Math.min(x.parkTotal, 12)} /> {x.parkFree} free</span>}
                {x.chargers.map((c, i) => <span key={i}><Bolt size={12} /> {c.kind} {c.kw} kW <Bars free={c.free} total={c.total} /></span>)}
              </div>

              <AnimatePresence initial={false}>
                {sel === x.id && (
                  <motion.div className="book" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                    {ticket ? (
                      <div className="pass">
                        <Code code={ticket.code} />
                        <div>
                          <b>{ticket.code}</b>
                          <p>{ticket.station}<br />{ticket.detail}, {ticket.hours} h<br />Estimated ₹{ticket.total}</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="row">
                          {x.parkTotal > 0 && <button className={kind === "parking" ? "pill on" : "pill"} onClick={() => setKind("parking")}>Parking</button>}
                          {x.chargers.length > 0 && <button className={kind === "ev" ? "pill on" : "pill"} onClick={() => setKind("ev")}>EV charger</button>}
                        </div>
                        <div className="row between">
                          <span>Duration</span>
                          <span className="stepper">
                            <button onClick={() => setHours(Math.max(1, hours - 1))} aria-label="Less time">−</button>
                            <b>{hours} h</b>
                            <button onClick={() => setHours(Math.min(8, hours + 1))} aria-label="More time">+</button>
                          </span>
                        </div>
                        <div className="row between"><span>Estimated cost</span><b>₹{total}</b></div>
                        {error && <p className="err">{error}</p>}
                        <button className="btn full" onClick={book}>Reserve for {hours} h</button>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
          ))}
        </ul>
      </aside>
      <section className="map-wrap" aria-label="Map of parking and charging stations">
        <Map stations={list} selId={sel} onSelect={pick} />
        <div className="legend"><i className="dot free" /> Plenty <i className="dot low" /> Few left <i className="dot busy" /> Full</div>
      </section>
    </main>
  );
}
