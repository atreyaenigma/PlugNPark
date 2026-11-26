// Plain-language reason for a station's rank, with the full breakdown one click away.
export default function RankInfo({ r, showHeadline }) {
  if (!r.factors.length) return null;
  return (
    <div className="rankinfo">
      {showHeadline && r.headline.length > 0 && <p className="why">{r.headline.join(" · ")}</p>}
      <details className="whybox">
        <summary>Why this ranking?</summary>
        <p>Match score: <b>{r.score} out of 100</b></p>
        <ul>
          {r.factors.map((f) => <li key={f.key}><b>{f.label}:</b> {f.text} <span className={`str ${f.strength}`}>({f.strength})</span></li>)}
        </ul>
        {r.flags.length > 0 && <p className="held">Held back by: {r.flags.join(", ")}.</p>}
        <p className="muted small-note">Price is compared with the other stations shown. Distance counts only when we know where you are.</p>
      </details>
    </div>
  );
}
