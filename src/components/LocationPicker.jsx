"use client";
import { useEffect, useRef, useState } from "react";
import { tileConfig } from "@/lib/tiles";

// Click the map to set the station location.
export default function LocationPicker({ lat, lng, onPick }) {
  const el = useRef(null), map = useRef(null), marker = useRef(null), L = useRef(null), cb = useRef(onPick);
  const [ready, setReady] = useState(false);
  cb.current = onPick;

  useEffect(() => {
    let dead = false;
    import("leaflet").then((mod) => {
      if (dead) return;
      L.current = mod.default;
      const has = Number.isFinite(lat) && Number.isFinite(lng);
      map.current = L.current.map(el.current).setView(has ? [lat, lng] : [30.3165, 78.0322], has ? 15 : 12);
      { const t = tileConfig(); L.current.tileLayer(t.url, { attribution: t.attribution, maxZoom: t.maxZoom, className: t.className }).addTo(map.current); }
      map.current.on("click", (e) => cb.current(e.latlng.lat, e.latlng.lng));
      setReady(true);
    });
    return () => { dead = true; if (map.current) { map.current.remove(); map.current = null; marker.current = null; } };
  }, []); // eslint-disable-line

  useEffect(() => {
    if (!ready || !Number.isFinite(lat) || !Number.isFinite(lng)) return;
    const icon = L.current.divIcon({ className: "", html: '<div class="mk free sel"><span>P</span></div>', iconSize: [38, 38], iconAnchor: [19, 19] });
    if (marker.current) marker.current.setLatLng([lat, lng]);
    else marker.current = L.current.marker([lat, lng], { icon }).addTo(map.current);
  }, [ready, lat, lng]);

  return <div ref={el} className="picker" aria-label="Map: click to set the station location" />;
}
