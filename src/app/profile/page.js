"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import VehicleFields from "@/components/VehicleFields";
import { emptyState, stateFromVehicle, vehicleFromState } from "@/lib/vehicles";

export default function Profile() {
  const { user, loading, refresh } = useAuth();
  const router = useRouter();
  const [state, setState] = useState(() => emptyState(""));
  const [loaded, setLoaded] = useState(false);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (!loading && !user) router.replace("/login?next=/profile"); }, [loading, user, router]);
  useEffect(() => { if (user && !loaded) { setState(stateFromVehicle(user.vehicle)); setLoaded(true); } }, [user, loaded]);

  if (loading || !user) return <main className="page"><p className="muted">Loading...</p></main>;
  const vehicle = vehicleFromState(state);

  const save = async (e) => {
    e.preventDefault();
    if (!vehicle) { setMsg({ ok: false, text: "Choose your car first." }); return; }
    setBusy(true); setMsg(null);
    const r = await fetch("/api/me/vehicle", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ vehicle }) });
    const d = await r.json().catch(() => ({}));
    setBusy(false);
    setMsg(r.ok ? { ok: true, text: `Saved. Chargers will now be matched to ${d.vehicle.name}.` } : { ok: false, text: d.error });
    if (r.ok) refresh();
  };
  const remove = async () => {
    if (!confirm("Remove your car? You will stop seeing compatibility labels.")) return;
    await fetch("/api/me/vehicle", { method: "DELETE" });
    setState(emptyState("")); setMsg({ ok: true, text: "Your car was removed." }); refresh();
  };

  return (
    <main className="page">
      <h1>My car</h1>
      <p className="muted">{user.name} · {user.email}</p>

      <form className="block" onSubmit={save}>
        <h2>{user.vehicle ? "Your car" : "Add your car"}</h2>
        <p className="muted">PlugNPark uses it to show which chargers fit, how fast they will charge it, and to plan trips.</p>
        <VehicleFields state={state} onChange={(s) => { setState(s); setMsg(null); }} allowEmpty />
        {msg && <p className={msg.ok ? "ok" : "err"} role="status">{msg.text}</p>}
        <div className="row profile-actions">
          <button className="btn small" disabled={busy || !vehicle}>{busy ? "Saving..." : user.vehicle ? "Change my car" : "Save my car"}</button>
          {user.vehicle && <button type="button" className="btn ghost small danger" onClick={remove}>Remove my car</button>}
          <Link href="/find" className="btn ghost small">See chargers that fit</Link>
        </div>
      </form>
    </main>
  );
}
