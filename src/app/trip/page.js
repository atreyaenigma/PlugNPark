"use client";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import PlaceInput from "@/components/PlaceInput";
import Bolt from "@/components/Bolt";
import VehicleFields from "@/components/VehicleFields";
import { useAuth } from "@/components/AuthProvider";
import { emptyState, stateFromVehicle, vehicleFromState } from "@/lib/vehicles";

const TripMap = dynamic(() => import("@/components/TripMap"), { ssr: false });
const fmt = (m) => { m = Math.round(m); const h = Math.floor(m / 60); return h ? `${h} h ${m % 60} min` : `${m} min`; };

export default function Trip() {
  const [from, setFrom] = useState(null);
  const [to, setTo] = useState(null);
  const { user } = useAuth();
  const [vstate, setVstate] = useState(() => emptyState("nexon-ev-lr"));
  const [usingSaved, setUsingSaved] = useState(false);
  const touched = useRef(false);
  useEffect(() => { if (user?.vehicle && !touched.current) { setVstate(stateFromVehicle(user.vehicle)); setUsingSaved(true); } }, [user]);
  const [start, setStart] = useState(80);
  const [reserve, setReserve] = useState(10);
  const [detour, setDetour] = useState(5);
  const [fast, setFast] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [res, setRes] = useState(null);

  const vehicle = vehicleFromState(vstate);

  const plan = async (e) => {
    e.preventDefault();
    if (!from || !to) { setError("Pick both a start and a destination."); return; }
    setBusy(true); setError(""); setRes(null);
    try {
      const r = await fetch("/api/trip", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from, to, vehicle, startSoc: start / 100, reserve: reserve / 100, maxDetourKm: detour, fastOnly: fast }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) setError(d.error || "Could not plan this trip."); else setRes(d);
    } catch { setError("Could not reach the server."); }
    setBusy(false);
  };

  const stops = res?.plan.stops || [];
  const gmaps = res && from && to
    ? `https://www.google.com/maps/dir/?api=1&origin=${from.lat},${from.lng}&destination=${to.lat},${to.lng}&travelmode=driving${stops.length ? `&waypoints=${stops.slice(0, 9).map((s) => `${s.lat},${s.lng}`).join("|")}` : ""}`
    : null;

  return (
    <main className="find trip">
      <aside className="panel">
        <h1 className="trip-h">Trip planner</h1>
        <p className="muted small-note">Plan a long drive with the charging stops it needs.</p>
        <form onSubmit={plan} className="tripform">
          <PlaceInput id="trip-from" label="From" value={from} onChange={setFrom} allowMine />
          <PlaceInput id="trip-to" label="To" value={to} onChange={setTo} />

          {usingSaved && user?.vehicle && <p className="goodnote">Using your saved car, {user.vehicle.name}. Change the car below for this trip only, or <Link href="/profile">update it for good</Link>.</p>}
          <VehicleFields state={vstate} onChange={(v) => { touched.current = true; setUsingSaved(false); setVstate(v); }} />

          <label className="fld">Battery when you leave: <b>{start}%</b>
            <input type="range" min="10" max="100" step="5" value={start} onChange={(e) => setStart(Number(e.target.value))} />
          </label>
          <div className="grid2">
            <label className="fld">Keep at least
              <select value={reserve} onChange={(e) => setReserve(Number(e.target.value))}>{[5, 10, 15, 20].map((v) => <option key={v} value={v}>{v}% on arrival</option>)}</select>
            </label>
            <label className="fld">Max detour
              <select value={detour} onChange={(e) => setDetour(Number(e.target.value))}>{[2, 5, 10, 20].map((v) => <option key={v} value={v}>{v} km off route</option>)}</select>
            </label>
          </div>
          <label className="check"><input type="checkbox" checked={fast} onChange={(e) => setFast(e.target.checked)} /> Fast chargers only (24 kW and up)</label>

          {error && <p className="err" role="alert">{error}</p>}
          <button className="btn full" disabled={busy}>{busy ? "Planning... this can take a moment" : "Plan my trip"}</button>
        </form>

        {res && (
          <section className="tripres" aria-live="polite">
            <div className="tripsum">
              <div><b>{res.route.distanceKm} km</b><span>distance</span></div>
              <div><b>{fmt(res.summary.totalMin)}</b><span>total time</span></div>
              <div><b>{res.summary.stops}</b><span>charging stop{res.summary.stops === 1 ? "" : "s"}</span></div>
              <div><b>{res.summary.arriveSoc != null ? `${res.summary.arriveSoc}%` : "-"}</b><span>battery on arrival</span></div>
            </div>
            <p className="muted small-note">Driving {fmt(res.route.driveMin)} · charging {fmt(res.summary.chargeMin)}{res.summary.detourMin ? ` · detours ${fmt(res.summary.detourMin)}` : ""}
              {res.summary.costKnownFor > 0 && ` · about ₹${res.summary.costInr} for the stops with listed prices`}</p>

            {res.warnings.map((w, i) => <p key={i} className="warn" role="note">{w}</p>)}
            {!res.plan.ok && <p className="err" role="alert">{res.plan.error}</p>}

            <ol className="timeline">
              <li className="tl tl-end"><span className="tl-dot">A</span><div><b>Start</b><small>{from.label}</small></div></li>
              {stops.map((s, i) => (
                <li key={s.stationId} className="tl">
                  <span className="tl-dot stop">{i + 1}</span>
                  <div>
                    <b><Link href={`/station/${s.stationId}`}>{s.name}</Link></b>
                    <small>{s.area} · {s.alongKm} km into the trip{s.offKm >= 0.1 ? ` · ${s.offKm} km off the road` : ""}</small>
                    <p><Bolt size={12} /> Arrive at {s.arriveSoc}%, charge to {s.leaveSoc}% · {fmt(s.chargeMin)} at {s.kw} kW {s.kind}{s.kwEstimated ? " (estimated)" : ""}</p>
                    {s.reportedBroken && <p className="alert">Drivers recently reported a problem here.</p>}
                    <p className="muted">{s.costInr != null ? `About ₹${s.costInr}` : `Price: ${s.usageCost || "not listed"}`} · {s.live ? `${s.freeNow} free now` : "Availability not live"}</p>
                    <p className="tl-links">
                      <Link href={`/station/${s.stationId}`}>{s.live ? "Details and reserve" : "Details"}</Link>
                      <a target="_blank" rel="noopener noreferrer" href={`https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}`}>Directions</a>
                    </p>
                  </div>
                </li>
              ))}
              <li className="tl tl-end"><span className="tl-dot">B</span><div><b>Arrive</b><small>{to.label}{res.summary.arriveSoc != null ? ` · about ${res.summary.arriveSoc}% battery` : ""}</small></div></li>
            </ol>
            {gmaps && <a className="btn ghost small" target="_blank" rel="noopener noreferrer" href={gmaps}>Open this trip in Google Maps</a>}
            <p className="muted small-note">Estimates only. Real range changes with speed, weather, load and road. Routes by OSRM, map data © OpenStreetMap contributors.</p>
          </section>
        )}
      </aside>
      <section className="map-wrap" aria-label="Trip map">
        <TripMap route={res?.route.geometry} stops={stops} from={from} to={to} />
      </section>
    </main>
  );
}
