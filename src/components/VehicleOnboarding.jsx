"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "./AuthProvider";
import VehicleFields from "./VehicleFields";
import { emptyState, vehicleFromState } from "@/lib/vehicles";

// Asks about the driver's car the first time they are logged in. They can skip; the question is not repeated.
// The native <dialog> gives a proper focus trap, Escape handling and screen reader behaviour.
export default function VehicleOnboarding() {
  const { user, refresh } = useAuth();
  const path = usePathname();
  const ref = useRef(null);
  const [ready, setReady] = useState(false);
  const [state, setState] = useState(() => emptyState(""));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const quiet = path.startsWith("/login") || path.startsWith("/signup") || path.startsWith("/pass") || path.startsWith("/admin");
  const eligible = !!user && !user.vehicle && !user.vehicleSkipped && !quiet;

  // Wait until the loading animation has finished, so the question never appears on top of it.
  useEffect(() => {
    if (!eligible) { setReady(false); return; }
    let t;
    const check = () => {
      let seen = true;
      try { seen = sessionStorage.getItem("pnp-seen") === "1"; } catch {}
      if (seen) t = setTimeout(() => setReady(true), 900); else t = setTimeout(check, 400);
    };
    check();
    return () => clearTimeout(t);
  }, [eligible]);

  useEffect(() => {
    const d = ref.current;
    if (d && ready && !d.open) d.showModal();
  }, [ready, eligible]);

  if (!eligible) return null;
  const vehicle = vehicleFromState(state);

  const skip = async () => { await fetch("/api/me/vehicle/skip", { method: "POST" }); await refresh(); };
  const save = async (e) => {
    e.preventDefault();
    if (!vehicle) { setError("Choose your car first, or skip for now."); return; }
    setBusy(true); setError("");
    const r = await fetch("/api/me/vehicle", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ vehicle }) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { setError(d.error || "Could not save your car."); setBusy(false); return; }
    await refresh();
  };

  return (
    <dialog ref={ref} className="vdialog" aria-labelledby="vo-h" aria-describedby="vo-d" onCancel={(e) => { e.preventDefault(); skip(); }}>
      <form onSubmit={save}>
        <h2 id="vo-h">What do you drive?</h2>
        <p id="vo-d" className="muted">We use your car to show which chargers fit it, and to plan trips. You can change it any time under My car.</p>
        <VehicleFields state={state} onChange={setState} allowEmpty />
        {error && <p className="err" role="alert">{error}</p>}
        <div className="row vo-actions">
          <button className="btn" disabled={busy || !vehicle}>{busy ? "Saving..." : "Save my car"}</button>
          <button type="button" className="btn ghost" onClick={skip}>Skip for now</button>
        </div>
      </form>
    </dialog>
  );
}
