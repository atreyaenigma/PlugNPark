export default function Heart({ on, onClick, label }) {
  return (
    <button type="button" className={`heart ${on ? "on" : ""}`} onClick={onClick} aria-pressed={on} aria-label={on ? `Remove ${label} from favourites` : `Save ${label} to favourites`}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill={on ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M12 21s-7-4.6-9.3-9A5.4 5.4 0 0 1 12 6a5.4 5.4 0 0 1 9.3 6c-2.3 4.4-9.3 9-9.3 9z" />
      </svg>
    </button>
  );
}
