"use client";
import { useEffect, useState } from "react";
import Pin from "./Pin";
import useUserLocation from "./useUserLocation";

// Place picker: type a place, press Enter or the button, choose a result.
export default function PlaceInput({ id, label, value, onChange, allowMine }) {
  const [q, setQ] = useState("");
  const [places, setPlaces] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [wantMine, setWantMine] = useState(false);
  const loc = useUserLocation();

  useEffect(() => {
    if (wantMine && loc.pos) { onChange({ label: "My location", lat: loc.pos.lat, lng: loc.pos.lng }); setWantMine(false); }
  }, [wantMine, loc.pos]); // eslint-disable-line

  const search = async () => {
    const t = q.trim();
    if (t.length < 2) return;
    setBusy(true); setErr("");
    try {
      const r = await fetch(`/api/geocode?q=${encodeURIComponent(t)}`);
      const d = await r.json().catch(() => null);
      if (!r.ok) { setPlaces(null); setErr(d?.error || "Place search failed."); } else setPlaces(d);
    } catch { setErr("Could not reach the server."); }
    setBusy(false);
  };

  if (value) return (
    <div className="placechip">
      <span className="lab">{label}</span>
      <b>{value.label}</b>
      <button type="button" className="linkbtn" onClick={() => { onChange(null); setQ(""); setPlaces(null); }}>Change</button>
    </div>
  );

  return (
    <div className="placein">
      <label htmlFor={id}>{label}</label>
      <div className="searchrow">
        <input id={id} placeholder="Search a place" value={q} autoComplete="off"
          onChange={(e) => { setQ(e.target.value); setPlaces(null); }}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); search(); } }} />
        <button type="button" className="btn small" onClick={search} disabled={busy || q.trim().length < 2}>{busy ? "..." : "Find"}</button>
      </div>
      {allowMine && (
        <button type="button" className="linkbtn mine" onClick={() => { if (loc.pos) onChange({ label: "My location", lat: loc.pos.lat, lng: loc.pos.lng }); else { setWantMine(true); loc.request(); } }}>
          <Pin /> Use my location
        </button>
      )}
      {loc.status === "denied" && wantMine && <p className="err">Location is blocked. Allow it in the browser, or search a place.</p>}
      {err && <p className="err">{err}</p>}
      {places && (
        <ul className="places" aria-label={`${label} results`}>
          {places.length === 0 && <li className="none">No places found for “{q.trim()}”.</li>}
          {places.map((p, i) => <li key={i}><button type="button" onClick={() => { onChange(p); setPlaces(null); }}><Pin /> {p.label}</button></li>)}
          <li className="attr">Place search by OpenStreetMap Nominatim</li>
        </ul>
      )}
    </div>
  );
}
