"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import { statusOf } from "@/lib/status";
import Bolt from "@/components/Bolt";
import Heart from "@/components/Heart";
import Pin from "@/components/Pin";
import LiveBadge from "@/components/LiveBadge";
import BookingPanel from "@/components/BookingPanel";
import { useAuth } from "@/components/AuthProvider";
import useFavorites from "@/components/useFavorites";
import useUserLocation from "@/components/useUserLocation";
import usePoll from "@/components/usePoll";
import CompatBadge from "@/components/CompatBadge";
import { compat } from "@/lib/vehicles";
import { rankStations, sortRanked } from "@/lib/rank";
import RankInfo from "@/components/RankInfo";

const Map = dynamic(() => import("@/components/Map"), { ssr: false });
const TYPES = [["all", "All"], ["ev", "EV charging"], ["parking", "Parking"]];

function Bars({ free, total }) {
  return (
    <span className="bars" role="img" aria-label={`${free} of ${total} free`}>
      {Array.from({ length: total }, (_, i) => <i key={i} className={i < free ? "on" : ""} />)}
    </span>
  );
}

export default function Find() {
  const [list, setList] = useState([]);
  const [type, setType] = useState("all");
  const [fast, setFast] = useState(false);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(null);
  const [demo, setDemo] = useState(false);
  const [onlyFit, setOnlyFit] = useState(false);
  const [sort, setSort] = useState("best");
  const [center, setCenter] = useState(null);   // a searched place: { label, lat, lng }
  const [places, setPlaces] = useState(null);   // place suggestions, null = closed
  const [searching, setSearching] = useState(false);
  const [note, setNote] = useState("");
  const [tick, setTick] = useState(0);
  const { user } = useAuth();
  const fav = useFavorites();
  const loc = useUserLocation();

  // A searched place wins over "my location" for sorting. Searching a place shows stations within 50 km.
  const load = useCallback(async () => {
    const o = center || loc.pos;
    const near = o ? `&lat=${o.lat}&lng=${o.lng}${center ? "&radius=50" : ""}` : "";
    const r = await fetch(`/api/stations?type=${type}&q=${encodeURIComponent(q)}${fast ? "&fast=1" : ""}${near}`, { cache: "no-store" });
    if (r.ok) setList(await r.json());
    fetch("/api/status", { cache: "no-store" }).then((x) => x.json()).then((d) => setDemo(!!d.demo)).catch(() => {});
  }, [type, q, fast, loc.pos, center]);
  useEffect(() => { load(); }, [load, tick]);
  usePoll(load);

  const searchPlaces = async (e) => {
    e.preventDefault();
    const t = q.trim();
    if (t.length < 2) return;
    setSearching(true); setNote("");
    try {
      const r = await fetch(`/api/geocode?q=${encodeURIComponent(t)}`);
      const d = await r.json().catch(() => null);
      if (!r.ok) { setPlaces(null); setNote(d?.error || "Place search failed."); } else setPlaces(d);
    } catch { setPlaces(null); setNote("Could not reach the server."); }
    setSearching(false);
  };

  const choose = async (p) => {
    setCenter(p); setQ(""); setPlaces(null); setSel(null);
    setNote(`Looking for real chargers near ${p.label}...`);
    try {
      const r = await fetch("/api/discover", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lat: p.lat, lng: p.lng }) });
      const d = await r.json().catch(() => ({}));
      setNote(d.created > 0 ? `Added ${d.created} real chargers near ${p.label}. They are not live, so they cannot be booked.` : "");
    } catch { setNote(""); }
    setTick((n) => n + 1);
  };

  const short = center ? center.label.split(",")[0] : "";
  const vehicle = user?.vehicle || null;
  const shown = onlyFit && vehicle ? list.filter((x) => compat(x, vehicle).status !== "none") : list;

  // Ranking: score every station shown, then order by the chosen sort.
  const need = type === "ev" ? "ev" : type === "parking" ? "parking" : "any";
  const hasOrigin = !!(center || loc.pos);
  const ranked = useMemo(() => rankStations(shown, { need, vehicle, hasOrigin }), [shown, need, vehicle, hasOrigin]);
  const orderedNow = useMemo(() => sortRanked(ranked, sort), [ranked, sort]);
  useEffect(() => { if ((sort === "nearest" && !hasOrigin) || (sort === "cheapest" && need === "any") || (sort === "fastest" && need !== "ev")) setSort("best"); }, [sort, hasOrigin, need]);
  // While a card is open the order stays put, so the list never jumps under the driver's finger.
  const frozen = useRef(null);
  if (sel == null || !frozen.current || frozen.current.sort !== sort) frozen.current = { sort, ids: orderedNow.map((r) => r.station.id) };
  const pos = (r) => { const i = frozen.current.ids.indexOf(r.station.id); return i < 0 ? 1e9 : i; };
  const ordered = sel == null ? orderedNow : [...orderedNow].sort((a, b) => pos(a) - pos(b));
  const bestId = sort === "best" ? ranked.find((r) => r.level === "best")?.station.id ?? null : null;

  return (
    <main className="find">
      <aside className="panel">
        <h1 className="sr-only">Find parking and EV charging</h1>
        <LiveBadge demo={demo} />
        {user && !vehicle && <p className="carbanner">Add your car to see which chargers fit it. <Link href="/profile">Add my car</Link></p>}
        {vehicle && <p className="carchip">Your car: <b>{vehicle.name}</b> <Link href="/profile">Change</Link></p>}
        <form className="searchform" onSubmit={searchPlaces} role="search">
          <label htmlFor="place-q">Where are you going?</label>
          <div className="searchrow">
            <input id="place-q" placeholder="Search a place or station" value={q} onChange={(e) => { setQ(e.target.value); setPlaces(null); }} autoComplete="off" />
            <button className="btn small" disabled={searching || q.trim().length < 2}>{searching ? "Searching..." : "Find place"}</button>
          </div>
          {places && (
            <ul className="places" aria-label="Place results">
              {places.length === 0 && <li className="none">No places found for “{q.trim()}”.</li>}
              {places.map((p, i) => <li key={i}><button type="button" onClick={() => choose(p)}><Pin /> {p.label}</button></li>)}
              <li className="attr">Place search by OpenStreetMap Nominatim</li>
            </ul>
          )}
        </form>
        {note && <p className="note" role="status">{note}</p>}

        <div className="locbar">
          {center ? (
            <><span className="loc-on"><Pin /> Near {center.label}</span><button className="linkbtn" onClick={() => { setCenter(null); setNote(""); }}>Clear</button></>
          ) : loc.pos ? (
            <><span className="loc-on"><Pin /> Sorted by distance from you</span><button className="linkbtn" onClick={loc.clear}>Clear</button></>
          ) : (
            <button className="btn ghost small" onClick={loc.request} disabled={loc.status === "asking"}><Pin /> {loc.status === "asking" ? "Finding you..." : "Sort by distance from me"}</button>
          )}
          {loc.status === "denied" && <p className="err">Location is blocked. Allow it in your browser's site settings, then try again.</p>}
          {loc.status === "error" && <p className="err">Could not get your location. On a phone it only works on HTTPS or localhost.</p>}
          {loc.status === "unsupported" && <p className="err">This browser cannot share your location.</p>}
        </div>
        <div className="seg">
          {TYPES.map(([v, l]) => <button key={v} aria-pressed={type === v} className={type === v ? "on" : ""} onClick={() => setType(v)}>{l}</button>)}
        </div>
        <label className="check"><input type="checkbox" checked={fast} onChange={(e) => setFast(e.target.checked)} /> Fast chargers only (50 kW and up)</label>
        {vehicle && <label className="check"><input type="checkbox" checked={onlyFit} onChange={(e) => setOnlyFit(e.target.checked)} /> Hide chargers that won't fit my car</label>}

        <ul className="cards">
          {shown.length > 1 && (
            <li className="sortli">
              <label className="sortrow">Sort by
                <select name="sort" value={sort} onChange={(e) => setSort(e.target.value)}>
                  <option value="best">Best match for you</option>
                  <option value="nearest" disabled={!hasOrigin}>Nearest{hasOrigin ? "" : " (share your location or search a place first)"}</option>
                  <option value="cheapest" disabled={need === "any"}>Cheapest{need === "any" ? " (choose EV charging or Parking first)" : need === "ev" ? " (per kWh)" : " (per hour)"}</option>
                  <option value="fastest" disabled={need !== "ev"}>Fastest charging{need !== "ev" ? " (choose EV charging first)" : ""}</option>
                  <option value="rated">Top rated</option>
                </select>
              </label>
              {sort === "best" && <p className="muted small-note">Ranked by distance, what is free now, charging speed on your car, price, ratings and driver reports.</p>}
            </li>
          )}
          {shown.length === 0 && (
            <li className="empty">
              {center ? <>No stations within 50 km of {short} yet.{user?.isAdmin && <> <Link href={`/admin?lat=${center.lat.toFixed(4)}&lng=${center.lng.toFixed(4)}`}>Import chargers here</Link>.</>}</>
                : "No stations match. Clear a filter or search a place."}
            </li>
          )}
          {ordered.map((r) => { const x = r.station; return (
            <li key={x.id} className={sel === x.id ? "card sel" : "card"}>
              <div className="card-top">
                <button className="card-head" onClick={() => setSel(sel === x.id ? null : x.id)} aria-expanded={sel === x.id}>
                  <i className={`dot ${statusOf(x)}`} />
                  <span className="card-title"><b>{x.name}</b><small>{x.area}{x.distanceKm != null ? ` · ${x.distanceKm} km ${center ? `from ${short}` : "away"}` : ""}</small></span>
                </button>
                <Heart on={fav.ids.includes(x.id)} onClick={() => fav.toggle(x.id)} label={x.name} />
              </div>
              <div className="card-meta">
                {sort === "best" && r.level === "best" && <span className="tag best">Best match</span>}
                {sort === "best" && r.level === "good" && <span className="tag goodm">Good match</span>}
                <span className={`tag ${x.live === false ? "" : "live"}`}>{x.live === false ? "Not live" : demo ? "Simulated live" : "Live"}</span>
                {x.reviewCount > 0 && <span className="rate">★ {x.rating.toFixed(1)} ({x.reviewCount} review{x.reviewCount > 1 ? "s" : ""})</span>}
                {x.community?.state === "broken" && <span className="tag bad">Reported broken</span>}
                {x.community?.state === "working" && <span className="tag live">Drivers say it works</span>}
                <CompatBadge s={x} v={vehicle} />
                {x.parkTotal > 0 && <span>Parking <Bars free={Math.min(x.parkFree, 12)} total={Math.min(x.parkTotal, 12)} /> {x.parkFree} free</span>}
                {x.chargers.map((c, i) => <span key={i}><Bolt size={12} /> {c.kind}{c.kw ? ` ${c.kw} kW` : ""} {x.live === false ? `· ${c.total} connector${c.total > 1 ? "s" : ""}` : <Bars free={c.free} total={c.total} />}</span>)}
              </div>
              <RankInfo r={r} showHeadline={sort === "best"} />
              <AnimatePresence initial={false}>
                {sel === x.id && (
                  <motion.div className="book" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                    <BookingPanel key={x.id} station={x} onBooked={() => load()} />
                    <Link href={`/station/${x.id}`} className="more">Full details and directions →</Link>
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
          ); })}
        </ul>
      </aside>
      <section className="map-wrap" aria-label="Map of parking and charging stations">
        <Map stations={shown} selId={sel} onSelect={setSel} me={center || loc.pos} vehicle={vehicle} bestId={bestId} />
        <div className="legend"><i className="dot free" /> Plenty <i className="dot low" /> Few left <i className="dot busy" /> Full <i className="dot unknown" /> Not live</div>
      </section>
    </main>
  );
}
