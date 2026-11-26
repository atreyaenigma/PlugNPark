export default function LiveBadge({ demo }) {
  return (
    <p className={`livebadge ${demo ? "demo" : ""}`} role="status">
      <i /> {demo ? "Demo traffic is on: live stations show simulated changes" : "Live: availability refreshes every few seconds"}
    </p>
  );
}
