"use client";
import { useEffect, useState } from "react";

// Asks the browser for the user's position only when they press the button. Remembered for this tab.
export default function useUserLocation() {
  const [pos, setPos] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | asking | ready | denied | error | unsupported

  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem("pnp-loc") || "null");
      if (saved) { setPos(saved); setStatus("ready"); }
    } catch {}
  }, []);

  const request = () => {
    if (!navigator.geolocation) { setStatus("unsupported"); return; }
    setStatus("asking");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const v = { lat: p.coords.latitude, lng: p.coords.longitude };
        setPos(v); setStatus("ready");
        try { sessionStorage.setItem("pnp-loc", JSON.stringify(v)); } catch {}
      },
      (e) => setStatus(e.code === 1 ? "denied" : "error"),
      { timeout: 10000, maximumAge: 60000 }
    );
  };
  const clear = () => {
    setPos(null); setStatus("idle");
    try { sessionStorage.removeItem("pnp-loc"); } catch {}
  };
  return { pos, status, request, clear };
}
