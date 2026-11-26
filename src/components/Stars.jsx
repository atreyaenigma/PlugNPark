const STAR = "M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3 6.1 20.6l1.3-6.6L2.5 9.4l6.6-.8z";

export default function Stars({ value, count, size = 16 }) {
  if (!count) return <span className="muted">No reviews yet</span>;
  return (
    <span className="stars" role="img" aria-label={`${value.toFixed(1)} out of 5 from ${count} review${count > 1 ? "s" : ""}`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" fill={i <= Math.round(value) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.6"><path d={STAR} /></svg>
      ))}
      <b>{value.toFixed(1)}</b><span className="muted">({count})</span>
    </span>
  );
}
