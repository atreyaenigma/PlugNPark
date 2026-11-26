"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "./AuthProvider";

const OPTIONS = [
  ["worked", "It worked", "I charged or parked here recently."],
  ["broken", "Broken or out of service", "A charger is not working."],
  ["busy", "Busy or blocked", "Everything was taken, or a car was blocking it."],
  ["wrong", "Wrong information", "Location, price or connector is wrong."],
];
const ago = (d) => { const m = Math.max(1, Math.round((Date.now() - new Date(d)) / 60000)); return m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`; };

export default function ReportPanel({ station, onSent }) {
  const { user } = useAuth();
  const path = usePathname();
  const [type, setType] = useState("");
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const c = station.community || {};

  const send = async (e) => {
    e.preventDefault();
    if (!type) { setMsg({ ok: false, text: "Choose what you want to report." }); return; }
    setBusy(true); setMsg(null);
    const r = await fetch(`/api/stations/${station.id}/reports`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type, note }) });
    const d = await r.json().catch(() => ({}));
    setBusy(false);
    setMsg(r.ok ? { ok: true, text: type === "worked" ? "Thanks. Other drivers will see that it worked." : "Thanks. Your report helps other drivers." } : { ok: false, text: d.error });
    if (r.ok) { setType(""); setNote(""); onSent && onSent(); }
  };

  return (
    <section className="block" aria-labelledby="rep-h">
      <h2 id="rep-h">What drivers are saying</h2>
      {c.state === "broken" && <p className="alert" role="status">Reported broken {ago(c.lastBrokenAt)} by {c.broken} driver{c.broken > 1 ? "s" : ""}. It may be out of service.</p>}
      {c.state === "working" && <p className="goodnote" role="status">{c.worked} driver{c.worked > 1 ? "s" : ""} confirmed it works. Last confirmed {ago(c.lastWorkedAt)}.</p>}
      {!c.state && <p className="muted">No recent reports. Been here? Tell other drivers how it went.</p>}

      {!user ? (
        <p className="muted"><Link href={`/login?next=${encodeURIComponent(path)}`}>Log in</Link> to send a report.</p>
      ) : (
        <form onSubmit={send} className="repform">
          <fieldset>
            <legend className="fld">Report something</legend>
            <div className="repopts">
              {OPTIONS.map(([v, label, hint]) => (
                <label key={v} className={type === v ? "repopt on" : "repopt"}>
                  <input type="radio" name="reptype" value={v} checked={type === v} onChange={() => setType(v)} />
                  <b>{label}</b><small>{hint}</small>
                </label>
              ))}
            </div>
          </fieldset>
          <label className="fld">Details (optional)
            <input name="note" maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} placeholder="For example: the CCS gun on the left would not start" />
          </label>
          {msg && <p className={msg.ok ? "ok" : "err"} role="status">{msg.text}</p>}
          <button className="btn small" disabled={busy}>{busy ? "Sending..." : "Send report"}</button>
        </form>
      )}
    </section>
  );
}
