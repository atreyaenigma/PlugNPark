"use client";
import { useEffect, useRef, useState } from "react";
import { statusOf } from "@/lib/status";


const BOLT = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M13.5 2 5 13.5h5.5L9.5 22 19 9.8h-5.7L13.5 2z"/></svg>';

export default function Map({ stations, selId, onSelect }) {
  const el = useRef(null), map = useRef(null), layer = useRef(null), L = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let dead = false;
    import("leaflet").then((mod) => {
      if (dead) return;
      L.current = mod.default;
      map.current = L.current.map(el.current, { zoomControl: false }).setView([30.3165, 78.0322], 13);
      L.current.control.zoom({ position: "bottomright" }).addTo(map.current);
      L.current.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: "&copy; OpenStreetMap, &copy; CARTO", maxZoom: 19,
      }).addTo(map.current);
      layer.current = L.current.layerGroup().addTo(map.current);
      setReady(true);
    });
    return () => { dead = true; if (map.current) { map.current.remove(); map.current = null; } };
  }, []);

  useEffect(() => {
    if (!ready) return;
    layer.current.clearLayers();
    stations.forEach((s) => {
      const ev = s.chargers.length > 0;
      const icon = L.current.divIcon({
        className: "",
        html: `<div class="mk ${statusOf(s)} ${selId === s.id ? "sel" : ""}"><span>${ev ? BOLT : "P"}</span></div>`,
        iconSize: [38, 38], iconAnchor: [19, 19],
      });
      L.current.marker([s.lat, s.lng], { icon, title: s.name }).on("click", () => onSelect(s.id)).addTo(layer.current);
    });
  }, [ready, stations, selId, onSelect]);

  useEffect(() => {
    const s = stations.find((x) => x.id === selId);
    if (ready && s) map.current.flyTo([s.lat, s.lng], 15, { duration: 0.8 });
  }, [ready, selId]); // eslint-disable-line

  return <div ref={el} className="leaflet-host" />;
}
