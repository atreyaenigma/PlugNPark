"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "./AuthProvider";

const STAR = "M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3 6.1 20.6l1.3-6.6L2.5 9.4l6.6-.8z";

export default function ReviewsPanel({ stationId, onChanged }) {
  const { user } = useAuth();
  const path = usePathname();
  const [list, setList] = useState(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch(`/api/stations/${stationId}/reviews`, { cache: "no-store" });
    if (r.ok) setList(await r.json());
  }, [stationId]);
  useEffect(() => { load(); }, [load, user]);

  const mine = list?.find((x) => x.mine);
  useEffect(() => { if (mine) { setRating(mine.rating); setComment(mine.comment); } }, [mine?.id]); // eslint-disable-line

  const submit = async (e) => {
    e.preventDefault();
    if (!rating) { setMsg({ ok: false, text: "Choose a star rating first." }); return; }
    setBusy(true); setMsg(null);
    const r = await fetch(`/api/stations/${stationId}/reviews`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rating, comment }) });
    const d = await r.json().catch(() => ({}));
    setBusy(false);
    setMsg(r.ok ? { ok: true, text: mine ? "Review updated." : "Thanks for your review." } : { ok: false, text: d.error });
    if (r.ok) { load(); onChanged && onChanged(); }
  };
  const remove = async () => {
    if (!confirm("Delete your review?")) return;
    await fetch(`/api/stations/${stationId}/reviews`, { method: "DELETE" });
    setRating(0); setComment(""); setMsg(null); load(); onChanged && onChanged();
  };

  return (
    <section className="block" aria-labelledby="rev-h">
      <h2 id="rev-h">Reviews</h2>
      {!user ? (
        <p className="muted"><Link href={`/login?next=${encodeURIComponent(path)}`}>Log in</Link> to leave a review.</p>
      ) : (
        <form onSubmit={submit} className="revform">
          <div role="radiogroup" aria-label="Your rating" className="starpick">
            {[1, 2, 3, 4, 5].map((i) => (
              <button type="button" key={i} role="radio" aria-checked={rating === i} aria-label={`${i} star${i > 1 ? "s" : ""}`} className={i <= rating ? "on" : ""} onClick={() => setRating(i)}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill={i <= rating ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d={STAR} /></svg>
              </button>
            ))}
          </div>
          <label className="fld">Your experience (optional)
            <textarea name="comment" rows={3} maxLength={500} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Was it easy to find? Did the charger work? Was it clean and safe?" />
          </label>
          {msg && <p className={msg.ok ? "ok" : "err"} role="status">{msg.text}</p>}
          <div className="row">
            <button className="btn small" disabled={busy}>{mine ? "Update review" : "Post review"}</button>
            {mine && <button type="button" className="btn ghost small" onClick={remove}>Delete my review</button>}
          </div>
        </form>
      )}
      <ul className="revlist">
        {list?.length === 0 && <li className="muted">No reviews yet. Be the first.</li>}
        {list?.map((r) => (
          <li key={r.id}>
            <div className="revhead"><b>{r.author}</b><span className="stars" role="img" aria-label={`${r.rating} out of 5`}>{"★".repeat(r.rating)}<span className="dim">{"★".repeat(5 - r.rating)}</span></span><span className="muted">{new Date(r.at).toLocaleDateString()}</span></div>
            {r.comment && <p>{r.comment}</p>}
          </li>
        ))}
      </ul>
    </section>
  );
}
