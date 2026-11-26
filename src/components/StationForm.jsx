"use client";
import { useState } from "react";
import dynamic from "next/dynamic";

const LocationPicker = dynamic(() => import("./LocationPicker"), { ssr: false });
const KINDS = ["CCS", "Type 2", "CHAdeMO", "Other"];

export const blankStation = { name: "", area: "", lat: "", lng: "", hours: "24 hours", parkTotal: "0", parkRate: "0", kwhRate: "0", chargers: [] };
export const toForm = (s) => ({
  name: s.name, area: s.area, lat: String(s.lat), lng: String(s.lng), hours: s.hours || "24 hours",
  parkTotal: String(s.parkTotal), parkRate: String(s.parkRate), kwhRate: String(s.kwhRate),
  chargers: s.chargers.map((c) => ({ kind: c.kind, kw: String(c.kw), total: String(c.total) })),
});

export default function StationForm({ id, initial, onSaved, onCancel }) {
  const [f, setF] = useState(initial);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const setCharger = (i, k, v) => setF({ ...f, chargers: f.chargers.map((c, j) => (j === i ? { ...c, [k]: v } : c)) });
  const lat = parseFloat(f.lat), lng = parseFloat(f.lng);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      const r = await fetch(id ? `/api/admin/stations/${id}` : "/api/admin/stations", {
        method: id ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setError(d.error || "Could not save the station."); setBusy(false); return; }
      onSaved();
    } catch { setError("Could not reach the server."); setBusy(false); }
  };

  return (
    <form className="editor block" onSubmit={submit}>
      <h2>{id ? "Edit station" : "Add a station"}</h2>
      <div className="grid2">
        <label>Station name<input name="name" value={f.name} onChange={set("name")} required /></label>
        <label>Area<input name="area" value={f.area} onChange={set("area")} required /></label>
        <label>Opening hours<input name="hours" value={f.hours} onChange={set("hours")} /></label>
      </div>

      <p className="label">Location (click the map)</p>
      <LocationPicker lat={lat} lng={lng} onPick={(a, b) => setF((p) => ({ ...p, lat: a.toFixed(5), lng: b.toFixed(5) }))} />
      <p className="muted small-note">{Number.isFinite(lat) ? `Selected: ${f.lat}, ${f.lng}` : "No location picked yet."}</p>

      <h3>Parking</h3>
      <div className="grid2">
        <label>Total bays<input name="parkTotal" type="number" min="0" value={f.parkTotal} onChange={set("parkTotal")} /></label>
        <label>Price per hour (₹)<input name="parkRate" type="number" min="0" value={f.parkRate} onChange={set("parkRate")} /></label>
      </div>

      <h3>EV charging</h3>
      <label className="narrow">Price per kWh (₹)<input name="kwhRate" type="number" min="0" value={f.kwhRate} onChange={set("kwhRate")} /></label>
      {f.chargers.map((c, i) => (
        <div key={i} className="charger-edit">
          <select aria-label="Connector type" value={c.kind} onChange={(e) => setCharger(i, "kind", e.target.value)}>{KINDS.map((k) => <option key={k}>{k}</option>)}</select>
          <label>kW<input type="number" min="1" aria-label="Power in kW" value={c.kw} onChange={(e) => setCharger(i, "kw", e.target.value)} /></label>
          <label>Count<input type="number" min="1" aria-label="Number of chargers" value={c.total} onChange={(e) => setCharger(i, "total", e.target.value)} /></label>
          <button type="button" className="btn ghost small" onClick={() => setF({ ...f, chargers: f.chargers.filter((_, j) => j !== i) })}>Remove</button>
        </div>
      ))}
      <button type="button" className="btn ghost small add-charger" onClick={() => setF({ ...f, chargers: [...f.chargers, { kind: "CCS", kw: "30", total: "2" }] })}>+ Add a charger type</button>

      {error && <p className="err" role="alert">{error}</p>}
      <div className="row">
        <button className="btn" disabled={busy}>{busy ? "Saving..." : id ? "Save changes" : "Add station"}</button>
        <button type="button" className="btn ghost" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}
