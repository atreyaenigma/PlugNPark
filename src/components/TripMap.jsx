"use client";
import { useEffect, useRef, useState } from "react";
import { tileConfig } from "@/lib/tiles";

const tip = (text) => { const el = document.createElement("span"); el.textContent = text; return el; }; // text only, never HTML

export default function TripMap({ route, stops, from, to }) {
  const el = useRef(null), map = useRef(null), layer = useRef(null), L = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let dead = false;
    import("leaflet").then((mod) => {
      if (dead) return;
      L.current = mod.default;
      map.current = L.current.map(el.current, { zoomControl: false }).setView([22.5, 79], 5);
      L.current.control.zoom({ position: "bottomright" }).addTo(map.current);
      const t = tileConfig();
      L.current.tileLayer(t.url, { attribution: t.attribution, maxZoom: t.maxZoom, className: t.className }).addTo(map.current);
      layer.current = L.current.layerGroup().addTo(map.current);
      setReady(true);
    });
    return () => { dead = true; if (map.current) { map.current.remove(); map.current = null; } };
  }, []);

  useEffect(() => {
    if (!ready) return;
    layer.current.clearLayers();
    const pts = [];
    const dot = (p, cls, text, name) => {
      const icon = L.current.divIcon({ className: "", html: `<div class="tmk ${cls}">${text}</div>`, iconSize: [30, 30], iconAnchor: [15, 15] });
      L.current.marker([p.lat, p.lng], { icon }).bindTooltip(tip(name)).addTo(layer.current);
      pts.push([p.lat, p.lng]);
    };
    if (route?.length) {
      L.current.polyline(route, { color: "#FFFFFF", weight: 10, opacity: 0.95 }).addTo(layer.current);   // white casing so the line reads on any map
      const line = L.current.polyline(route, { color: "#16A34A", weight: 5, opacity: 1 }).addTo(layer.current);
      pts.push(...route);
      if (line.getBounds().isValid()) map.current.fitBounds(line.getBounds(), { padding: [50, 50] });
    }
    if (from) dot(from, "end", "A", from.label);
    if (to) dot(to, "end", "B", to.label);
    (stops || []).forEach((s, i) => dot(s, "stop", String(i + 1), s.name));
    if (!route?.length && pts.length) map.current.fitBounds(pts, { padding: [60, 60], maxZoom: 10 });
  }, [ready, route, stops, from, to]);

  return <div ref={el} className="leaflet-host" />;
}
