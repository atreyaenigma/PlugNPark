"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import useFavorites from "@/components/useFavorites";

export default function Dashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const fav = useFavorites();
  const [bookings, setBookings] = useState(null);
  const [stations, setStations] = useState([]);

  const load = useCallback(async () => {
    const [b, s] = await Promise.all([fetch("/api/bookings"), fetch("/api/stations")]);
    if (b.ok) setBookings(await b.json());
    setStations(await s.json());
  }, []);

  useEffect(() => { if (!loading && !user) router.replace("/login?next=/dashboard"); }, [loading, user, router]);
  useEffect(() => { if (user) load(); }, [user, load]);

  const cancel = async (code) => {
    if (!confirm("Cancel this booking?")) return;
    await fetch(`/api/bookings/${code}`, { method: "DELETE" });
    load();
  };

  if (loading || !user || !bookings) return <main className="page"><p className="muted">Loading your dashboard...</p></main>;

  const live = bookings.filter((b) => b.state === "active");
  const past = bookings.filter((b) => b.state !== "active");
  const evHours = bookings.filter((b) => b.kind === "ev" && b.state !== "cancelled").reduce((a, b) => a + b.hours, 0);
  const saved = stations.filter((s) => fav.ids.includes(s.id));

  return (
    <main className="page">
      <h1>Hi {user.name.split(" ")[0]}.</h1>
      <p className="muted">Here is everything you have booked and saved.</p>

      <div className="kpis">
        <div><b>{live.length}</b><span>active bookings</span></div>
        <div><b>{bookings.filter((b) => b.state !== "cancelled").length}</b><span>total bookings</span></div>
        <div><b>{evHours}</b><span>hours of EV charging</span></div>
        <div><b>{(evHours * 2.1).toFixed(1)}</b><span>kg CO₂ saved (estimate)</span></div>
      </div>

      <section className="block">
        <h2>Active bookings</h2>
        {live.length === 0 ? <p className="muted">Nothing booked right now. <Link href="/find">Find a spot</Link>.</p> : live.map((b) => (
          <div key={b.code} className="booking">
            <div><b>{b.station}</b><p className="muted">{b.detail} · {b.hours} h · ₹{b.total}</p></div>
            <div className="booking-end">{b.checkedIn && <span className="tag completed">checked in</span>}<code>{b.code}</code><Link href={`/pass/${b.code}`} className="btn ghost small">Show pass</Link><button className="btn ghost small" onClick={() => cancel(b.code)}>Cancel</button></div>
          </div>
        ))}
      </section>

      <section className="block">
        <h2>Saved stations</h2>
        {saved.length === 0 ? <p className="muted">Tap the heart on any station to save it here.</p> : (
          <div className="saved">{saved.map((s) => <Link key={s.id} href={`/station/${s.id}`} className="chip-link"><b>{s.name}</b><span className="muted">{s.area}</span></Link>)}</div>
        )}
      </section>

      <section className="block">
        <h2>History</h2>
        {past.length === 0 ? <p className="muted">Past and cancelled bookings will show up here.</p> : past.map((b) => (
          <div key={b.code} className="booking">
            <div><b>{b.station}</b><p className="muted">{b.detail} · {b.hours} h · {new Date(b.at).toLocaleDateString()}</p></div>
            <span className={`tag ${b.state}`}>{b.state}</span>
          </div>
        ))}
      </section>
    </main>
  );
}
