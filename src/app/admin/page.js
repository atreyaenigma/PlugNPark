"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import StationForm, { blankStation, toForm } from "@/components/StationForm";

const post = (url, body) => fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body || {}) });

export default function Admin() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [editing, setEditing] = useState(null); // null | "new" | station
  const [msg, setMsg] = useState("");
  const [code, setCode] = useState("");
  const [checkMsg, setCheckMsg] = useState(null);
  const [demoOn, setDemoOn] = useState(false);
  const [imp, setImp] = useState({ lat: "30.3165", lng: "78.0322", radius: "15", max: "50" });
  const [importing, setImporting] = useState(false);
  const [impMsg, setImpMsg] = useState(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/overview", { cache: "no-store" });
    if (r.ok) setData(await r.json());
  }, []);

  useEffect(() => { if (!loading && !user) router.replace("/login?next=/admin"); }, [loading, user, router]);
  useEffect(() => { if (user?.isAdmin) load(); }, [user, load]);

  // Arriving from "Import chargers here" on the Find page pre-fills the location.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get("lat") && p.get("lng")) setImp((v) => ({ ...v, lat: p.get("lat"), lng: p.get("lng") }));
  }, []);

  // Demo traffic: this tab nudges the live stations every few seconds. Closing the tab ends it within 20 seconds.
  useEffect(() => {
    if (!demoOn) return;
    let stop = false;
    const tick = async () => { await post("/api/admin/simulate", { on: true }); if (!stop) load(); };
    tick();
    const id = setInterval(tick, 5000);
    return () => { stop = true; clearInterval(id); };
  }, [demoOn, load]);

  if (loading || !user) return <main className="page"><p className="muted">Loading...</p></main>;
  if (!user.isAdmin) return (
    <main className="page"><h1>Admins only</h1><p className="muted">Your account does not have access to this page.</p><Link href="/" className="btn">Back to home</Link></main>
  );
  if (!data) return <main className="page"><p className="muted">Loading the admin panel...</p></main>;

  const say = async (r, ok) => { const d = await r.json().catch(() => ({})); setMsg(r.ok ? ok : d.error); load(); };
  const remove = async (s) => { if (confirm(`Delete "${s.name}"? This cannot be undone.`)) say(await fetch(`/api/admin/stations/${s.id}`, { method: "DELETE" }), `Deleted ${s.name}.`); };
  const cancel = async (c) => { if (confirm(`Cancel booking ${c}?`)) say(await fetch(`/api/admin/bookings/${c}`, { method: "DELETE" }), `Cancelled ${c}.`); };
  const promote = async (s) => say(await post(`/api/admin/stations/${s.id}/promote`), `${s.name} is now live. You can edit it and take bookings.`);
  const slot = async (s, target, index, delta) => say(await post(`/api/admin/stations/${s.id}/occupancy`, { target, index, delta }), "Updated.");
  const toggleDemo = async () => { if (demoOn) await post("/api/admin/simulate", { on: false }); setDemoOn(!demoOn); load(); };
  const closeReport = async (id, status) => say(await post(`/api/admin/reports/${id}`, { status }), status === "resolved" ? "Report resolved." : "Report dismissed.");
  const deleteReview = async (id) => { if (confirm("Delete this review?")) say(await fetch(`/api/admin/reviews/${id}`, { method: "DELETE" }), "Review deleted."); };
  const genDemo = async () => { const r = await post("/api/admin/demo-history", { weeks: 6 }); const d = await r.json().catch(() => ({})); setMsg(r.ok ? `Created ${d.created} demo bookings across ${d.stations} stations.` : d.error); load(); };
  const clearDemo = async () => { const d = await (await fetch("/api/admin/demo-history", { method: "DELETE" })).json(); setMsg(`Removed ${d.removed} demo bookings.`); load(); };
  const saved = () => { setEditing(null); setMsg("Station saved."); load(); };

  const checkIn = async (e) => {
    e.preventDefault();
    const r = await post("/api/admin/checkin", { code: code.trim().toUpperCase() });
    const d = await r.json().catch(() => ({}));
    setCheckMsg({ ok: r.ok, text: r.ok ? `Checked in ${d.code}: ${d.station}, ${d.detail}, ${d.hours} h (${d.userEmail}).` : d.error });
    if (r.ok) { setCode(""); load(); }
  };

  const runImport = async (e) => {
    e.preventDefault();
    setImporting(true); setImpMsg(null);
    const r = await post("/api/admin/import/ocm", imp);
    const d = await r.json().catch(() => ({}));
    setImpMsg(r.ok
      ? { ok: true, text: `Found ${d.found}. Added ${d.created}, updated ${d.updated}, left ${d.alreadyManaged} you already manage, skipped ${d.skipped} (not operational or incomplete).` }
      : { ok: false, text: d.error || "Import failed." });
    setImporting(false); load();
  };
  const clearImported = async () => {
    if (!confirm("Remove all imported stations that are not live?")) return;
    const d = await (await fetch("/api/admin/import/ocm", { method: "DELETE" })).json();
    setImpMsg({ ok: true, text: `Removed ${d.removed} imported stations.` }); load();
  };
  const setI = (k) => (e) => setImp({ ...imp, [k]: e.target.value });
  const fillFromGps = () => {
    if (!navigator.geolocation) { setImpMsg({ ok: false, text: "This browser cannot share your location." }); return; }
    navigator.geolocation.getCurrentPosition(
      (p) => setImp((v) => ({ ...v, lat: p.coords.latitude.toFixed(4), lng: p.coords.longitude.toFixed(4) })),
      () => setImpMsg({ ok: false, text: "Could not get your location. Allow it in the browser, or type the coordinates." }),
      { timeout: 10000 }
    );
  };
  const { stats, stations, recent } = data;

  return (
    <main className="page">
      <h1>Admin panel</h1>
      <p className="muted">Manage stations, keep availability live, and watch bookings.</p>

      <div className="kpis">
        <div><b>{stats.stations}</b><span>stations</span></div>
        <div><b>{stats.active}</b><span>active bookings</span></div>
        <div><b>{stats.users}</b><span>registered users</span></div>
        <div><b>₹{stats.revenue}</b><span>estimated booking value</span></div>
      </div>

      {msg && <p className="ok" role="status">{msg}</p>}

      <section className="block">
        <h2>Check in a booking</h2>
        <p className="muted">Type the code from the driver's pass, or scan their QR with your phone while logged in as admin.</p>
        <form className="row checkin" onSubmit={checkIn}>
          <input className="codeinput" name="code" placeholder="PNP-XXXXX" value={code} onChange={(e) => setCode(e.target.value)} required />
          <button className="btn small">Check in</button>
        </form>
        {checkMsg && <p className={checkMsg.ok ? "ok" : "err"} role="status">{checkMsg.text}</p>}
      </section>

      <section className="block">
        <h2>Real chargers from Open Charge Map</h2>
        <p className="muted">Imports real charging stations around a point. They appear as "Not live" (no bookings) until you click "Make live". Needs OCM_API_KEY in .env.local.</p>
        <form className="importform" onSubmit={runImport}>
          <label>Latitude<input name="ilat" value={imp.lat} onChange={setI("lat")} /></label>
          <label>Longitude<input name="ilng" value={imp.lng} onChange={setI("lng")} /></label>
          <label>Radius (km)<input name="irad" type="number" min="1" max="100" value={imp.radius} onChange={setI("radius")} /></label>
          <label>Max results<input name="imax" type="number" min="1" max="200" value={imp.max} onChange={setI("max")} /></label>
          <button type="button" className="btn ghost small" onClick={fillFromGps}>Use my location</button>
          <button className="btn small" disabled={importing}>{importing ? "Importing..." : "Import chargers"}</button>
          <button type="button" className="btn ghost small" onClick={clearImported}>Clear imported</button>
        </form>
        {impMsg && <p className={impMsg.ok ? "ok" : "err"} role="status">{impMsg.text}</p>}
      </section>

      <section className="block">
        <div className="row between">
          <div><h2>Demo traffic</h2><p className="muted">Makes live stations change on their own so you can show the map updating. Everything is labelled "Simulated" to visitors. Keep this tab open while presenting.</p></div>
          <button className={demoOn ? "btn danger-solid small" : "btn small"} onClick={toggleDemo}>{demoOn ? "Stop demo traffic" : "Start demo traffic"}</button>
        </div>
        {demoOn && <p className="ok" role="status">Demo traffic is running.</p>}
      </section>

      <section className="block">
        <h2>Driver reports {data.openReports.length > 0 && <span className="tag bad">{data.openReports.length} open</span>}</h2>
        {data.openReports.length === 0 ? <p className="muted">No open reports.</p> : data.openReports.map((r) => (
          <div key={r.id} className="booking">
            <div><b>{r.station}</b> <span className={`tag ${r.type === "broken" ? "bad" : ""}`}>{r.type === "broken" ? "Broken" : "Wrong info"}</span>
              <p className="muted">{r.note || "No details"} · {r.userEmail} · {new Date(r.at).toLocaleString()}</p></div>
            <div className="booking-end">
              <Link href={`/station/${r.stationId}`} className="btn ghost small">View</Link>
              <button className="btn small" onClick={() => closeReport(r.id, "resolved")}>Resolve</button>
              <button className="btn ghost small" onClick={() => closeReport(r.id, "dismissed")}>Dismiss</button>
            </div>
          </div>
        ))}
      </section>

      <section className="block">
        <div className="row between">
          <div><h2>Forecast demo history</h2><p className="muted">Creates believable past bookings so the "When is it busy?" chart has data to show. They are labelled demo on the chart and never counted in the numbers above. {data.demoBookings > 0 && <b>{data.demoBookings} demo bookings exist now.</b>}</p></div>
          <div className="row"><button className="btn small" onClick={genDemo}>{data.demoBookings > 0 ? "Regenerate" : "Generate demo history"}</button>{data.demoBookings > 0 && <button className="btn ghost small" onClick={clearDemo}>Remove it</button>}</div>
        </div>
      </section>

      {editing ? (
        <StationForm key={editing === "new" ? "new" : editing.id} id={editing === "new" ? null : editing.id}
          initial={editing === "new" ? blankStation : toForm(editing)} onSaved={saved} onCancel={() => setEditing(null)} />
      ) : (
        <section className="block">
          <div className="row between">
            <h2>Stations</h2>
            <button className="btn small" onClick={() => { setMsg(""); setEditing("new"); }}>Add a station</button>
          </div>
          {stations.length === 0 && <p className="muted">No stations yet. Add one or import real chargers.</p>}
          {stations.map((s) => (
            <div key={s.id} className="srow">
              <div className="srow-main">
                <b>{s.name} <span className={`tag ${s.live ? "live" : ""}`}>{s.live ? "Live" : "Not live"}</span>{s.source === "ocm" && <span className="tag">Imported</span>}</b>
                <span className="muted">{s.area} · {s.hours}</span>
                {s.live && (
                  <div className="occ">
                    {s.parkTotal > 0 && (
                      <div><span>Parking</span>
                        <button onClick={() => slot(s, "parking", 0, -1)} aria-label={`One more bay taken at ${s.name}`}>−</button>
                        <b>{s.parkFree}/{s.parkTotal} free</b>
                        <button onClick={() => slot(s, "parking", 0, 1)} aria-label={`One bay freed at ${s.name}`}>+</button></div>
                    )}
                    {s.chargers.map((c, i) => (
                      <div key={i}><span>{c.kind} {c.kw} kW</span>
                        <button onClick={() => slot(s, "charger", i, -1)} aria-label={`One more ${c.kind} charger taken at ${s.name}`}>−</button>
                        <b>{c.free}/{c.total} free</b>
                        <button onClick={() => slot(s, "charger", i, 1)} aria-label={`One ${c.kind} charger freed at ${s.name}`}>+</button></div>
                    ))}
                  </div>
                )}
                {!s.live && <span className="muted">{s.chargers.map((c) => `${c.kind}${c.kw ? ` ${c.kw} kW` : ""} ×${c.total}`).join(", ")}</span>}
              </div>
              <div className="srow-actions">
                {!s.live && <button className="btn small" onClick={() => promote(s)}>Make live</button>}
                <Link href={`/station/${s.id}`} className="btn ghost small">View</Link>
                <button className="btn ghost small" onClick={() => { setMsg(""); setEditing(s); }}>Edit</button>
                <button className="btn ghost small danger" onClick={() => remove(s)}>Delete</button>
              </div>
            </div>
          ))}
        </section>
      )}

      <section className="block">
        <h2>Recent bookings</h2>
        {recent.length === 0 ? <p className="muted">No bookings yet.</p> : recent.map((b) => (
          <div key={b.code} className="booking">
            <div><b>{b.station}</b><p className="muted">{b.detail} · {b.hours} h · ₹{b.total} · {b.userEmail}</p></div>
            <div className="booking-end">
              {b.checkedIn && <span className="tag completed">checked in</span>}
              <code>{b.code}</code>
              {b.state === "active" ? <button className="btn ghost small" onClick={() => cancel(b.code)}>Cancel</button> : <span className={`tag ${b.state}`}>{b.state}</span>}
            </div>
          </div>
        ))}
      </section>
      <section className="block">
        <h2>Recent reviews</h2>
        {data.recentReviews.length === 0 ? <p className="muted">No reviews yet.</p> : data.recentReviews.map((r) => (
          <div key={r.id} className="booking">
            <div><b>{r.station}</b> <span className="stars" role="img" aria-label={`${r.rating} out of 5`}>{"★".repeat(r.rating)}<span className="dim">{"★".repeat(5 - r.rating)}</span></span>
              <p className="muted">{r.comment || "No comment"} · {r.userEmail}</p></div>
            <button className="btn ghost small danger" onClick={() => deleteReview(r.id)}>Delete</button>
          </div>
        ))}
      </section>
    </main>
  );
}
