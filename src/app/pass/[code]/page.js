"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { useAuth } from "@/components/AuthProvider";

const WORDS = { active: "Active", completed: "Finished", cancelled: "Cancelled" };

export default function PassPage() {
  const { code } = useParams();
  const { user } = useAuth();
  const [p, setP] = useState(null);
  const [missing, setMissing] = useState(false);
  const [origin, setOrigin] = useState("");
  const [msg, setMsg] = useState(null);

  const load = useCallback(async () => {
    const r = await fetch(`/api/pass/${code}`, { cache: "no-store" });
    if (!r.ok) { setMissing(true); return; }
    setP(await r.json());
  }, [code]);
  useEffect(() => { setOrigin(window.location.origin); load(); }, [load]);

  const checkIn = async () => {
    const r = await fetch("/api/admin/checkin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) });
    const d = await r.json().catch(() => ({}));
    setMsg({ ok: r.ok, text: r.ok ? `Checked in. Driver: ${d.userEmail}` : d.error });
    load();
  };

  if (missing) return <main className="page"><h1>Pass not found</h1><p className="muted">Check the code and try again.</p><Link href="/" className="btn">Back to home</Link></main>;
  if (!p) return <main className="page"><p className="muted">Loading pass...</p></main>;
  const canCheckIn = user?.isAdmin && p.state === "active" && !p.checkedInAt;

  return (
    <main className="page passpage">
      <div className={`bigpass ${p.state}`}>
        <div className="bigpass-top">
          <span className={`tag ${p.state}`}>{WORDS[p.state]}</span>
          {p.checkedInAt && <span className="tag completed">Checked in</span>}
        </div>
        <div className="bigqr">
          {origin && <QRCodeSVG value={`${origin}/pass/${p.code}`} size={200} level="M" bgColor="#FFFFFF" fgColor="#0F172A" marginSize={0} />}
        </div>
        <h1>{p.code}</h1>
        <p className="bigpass-info"><b>{p.station}</b><br />{p.detail} · {p.hours} h · ₹{p.total}</p>
        <p className="muted">Valid until {new Date(p.endsAt).toLocaleString()}</p>
        {p.lat != null && <a className="btn ghost small" target="_blank" rel="noopener noreferrer" href={`https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`}>Directions</a>}
        {canCheckIn && <button className="btn" onClick={checkIn}>Check this driver in</button>}
        {msg && <p className={msg.ok ? "ok" : "err"} role="status">{msg.text}</p>}
      </div>
    </main>
  );
}
