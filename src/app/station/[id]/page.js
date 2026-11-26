"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { statusOf } from "@/lib/status";
import Bolt from "@/components/Bolt";
import Heart from "@/components/Heart";
import BookingPanel from "@/components/BookingPanel";
import LiveBadge from "@/components/LiveBadge";
import useFavorites from "@/components/useFavorites";
import useUserLocation from "@/components/useUserLocation";
import usePoll from "@/components/usePoll";
import Stars from "@/components/Stars";
import ForecastChart from "@/components/ForecastChart";
import ReportPanel from "@/components/ReportPanel";
import ReviewsPanel from "@/components/ReviewsPanel";
import CompatBadge from "@/components/CompatBadge";
import CompatPanel from "@/components/CompatPanel";
import { useAuth } from "@/components/AuthProvider";

const km = (a, b) => {
  const r = (d) => (d * Math.PI) / 180, dLat = r(b.lat - a.lat), dLng = r(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
};
const LABEL = { free: "Plenty free", low: "Few left", busy: "Full right now", unknown: "Availability is not live" };

export default function Station() {
  const { id } = useParams();
  const [s, setS] = useState(null);
  const [demo, setDemo] = useState(false);
  const [missing, setMissing] = useState(false);
  const fav = useFavorites();
  const loc = useUserLocation();
  const { user } = useAuth();

  const load = useCallback(async () => {
    const r = await fetch(`/api/stations/${id}`, { cache: "no-store" });
    if (!r.ok) { setMissing(true); return; }
    setS(await r.json());
    fetch("/api/status", { cache: "no-store" }).then((x) => x.json()).then((d) => setDemo(!!d.demo)).catch(() => {});
  }, [id]);
  useEffect(() => { load(); }, [load]);
  usePoll(load);

  if (missing) return <main className="page"><h1>Station not found</h1><p className="muted">This station may have been removed.</p><Link href="/find" className="btn">Back to the map</Link></main>;
  if (!s) return <main className="page"><p className="muted">Loading station...</p></main>;
  const st = statusOf(s), live = s.live;

  return (
    <main className="page detail">
      <Link href="/find" className="back">← Back to the map</Link>
      <div className="detail-head">
        <div>
          <h1>{s.name}</h1>
          <p className="muted">{s.area} · {s.hours === "Hours not listed" ? s.hours : `Open ${s.hours}`}{s.operator ? ` · ${s.operator}` : ""}</p>
          <p className="status"><i className={`dot ${st}`} /> {LABEL[st]}</p>
          {loc.pos && <p className="muted">{km(loc.pos, s).toFixed(1)} km from you</p>}
          <p className="ratingline"><Stars value={s.rating || 0} count={s.reviewCount} />{s.community?.state === "broken" && <span className="tag bad">Reported broken</span>}{s.community?.state === "working" && <span className="tag live">Drivers say it works</span>}<CompatBadge s={s} v={user?.vehicle} /></p>
        </div>
        <Heart on={fav.ids.includes(s.id)} onClick={() => fav.toggle(s.id)} label={s.name} />
      </div>
      {live && <LiveBadge demo={demo} />}

      <div className="detail-grid">
        <div>
          {s.parkTotal > 0 && (
            <section className="block">
              <h2>Parking</h2>
              <p><b>{s.parkFree}</b> of {s.parkTotal} bays free</p>
              <div className="meter"><i style={{ width: `${(s.parkFree / s.parkTotal) * 100}%` }} /></div>
              <p className="muted">₹{s.parkRate} per hour</p>
            </section>
          )}
          {s.chargers.length > 0 && (
            <section className="block">
              <h2>EV charging</h2>
              {s.chargers.map((c, i) => (
                <div key={i} className="charger-row">
                  <span><Bolt size={14} /> {c.kind}{c.kw ? ` · ${c.kw} kW` : ""}</span>
                  <span className="muted">{live ? `${c.free} of ${c.total} free` : `${c.total} connector${c.total > 1 ? "s" : ""}`}</span>
                </div>
              ))}
              <p className="muted">{live ? `₹${s.kwhRate} per kWh` : `Price: ${s.usageCost || "not listed"}`}</p>
            </section>
          )}
          {!live && (
            <section className="block">
              <h2>About this listing</h2>
              <p className="muted">This charger comes from Open Charge Map, a community-maintained registry. We do not know whether it is free right now, so booking is turned off.{s.ocmId && <> <a className="more" target="_blank" rel="noopener noreferrer" href={`https://openchargemap.org/site/poi/details/${s.ocmId}`}>See it on Open Charge Map</a></>}</p>
            </section>
          )}
          <CompatPanel station={s} />
          {live && <ForecastChart stationId={s.id} />}
          <ReportPanel station={s} onSent={load} />
          <ReviewsPanel stationId={s.id} onChanged={load} />
          <a className="btn ghost" target="_blank" rel="noopener noreferrer" href={`https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}`}>Get directions in Google Maps</a>
        </div>

        <aside className="block reserve">
          <h2>{live ? "Reserve" : "Booking unavailable"}</h2>
          <BookingPanel station={s} onBooked={load} />
        </aside>
      </div>
    </main>
  );
}
