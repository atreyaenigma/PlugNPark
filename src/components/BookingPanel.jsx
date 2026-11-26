"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";
import PassCard from "./PassCard";
import { compat } from "@/lib/vehicles";

export default function BookingPanel({ station: x, onBooked }) {
  const { user } = useAuth();
  const router = useRouter();
  const path = usePathname();
  const [kind, setKind] = useState(x.parkTotal ? "parking" : "ev");
  const [hours, setHours] = useState(2);
  const [ticket, setTicket] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const total = kind === "ev" ? Math.round(x.kwhRate * 15 * hours * 0.5) : x.parkRate * hours;
  const available = kind === "ev" ? x.chargers.some((c) => c.free > 0) : x.parkFree > 0;

  const book = async () => {
    if (!user) { router.push(`/login?next=${encodeURIComponent(path)}`); return; }
    setBusy(true); setError("");
    const r = await fetch("/api/bookings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stationId: x.id, kind, hours }) });
    const d = await r.json();
    setBusy(false);
    if (!r.ok) { setError(d.error); return; }
    setTicket(d);
    onBooked && onBooked(d);
  };

  if (x.live === false) return (
    <div className="book-inner">
      <p className="note">This station is not live, so free chargers and booking are not shown. It is listed from Open Charge Map.</p>
      <a className="btn ghost small" target="_blank" rel="noopener noreferrer" href={`https://www.google.com/maps/dir/?api=1&destination=${x.lat},${x.lng}`}>Get directions</a>
    </div>
  );

  if (ticket) return (
    <div className="book-inner">
      <PassCard ticket={ticket} />
      <p className="note">Show this code at the gate. You can cancel it from your <Link href="/dashboard">dashboard</Link>.</p>
    </div>
  );

  return (
    <div className="book-inner">
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
      {!available && <p className="err">Nothing is free for this option right now.</p>}
      {kind === "ev" && user?.vehicle && compat(x, user.vehicle).status === "none" && <p className="warn">No charger here fits {user.vehicle.name}. You can still reserve if the booking is for another car.</p>}
      {error && <p className="err">{error}</p>}
      <button className="btn full" onClick={book} disabled={busy || !available}>
        {busy ? "Reserving..." : user ? `Reserve for ${hours} h` : "Log in to reserve"}
      </button>
    </div>
  );
}
