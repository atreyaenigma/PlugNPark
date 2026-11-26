// Top-down car, drawn in SVG. Used in the loader and the parking lot.
export default function TopCar({ color = "#F3F1EA", w = 56 }) {
  return (
    <svg width={w} viewBox="0 0 56 110" fill="none" aria-hidden="true">
      <rect x="3" y="2" width="50" height="106" rx="18" fill={color} />
      <rect x="10" y="22" width="36" height="20" rx="6" fill="#14161B" opacity=".85" />
      <rect x="10" y="68" width="36" height="16" rx="5" fill="#14161B" opacity=".7" />
      <rect x="13" y="46" width="30" height="18" rx="4" fill="#14161B" opacity=".18" />
      <rect x="8" y="5" width="10" height="5" rx="2.5" fill="#FFF6C9" />
      <rect x="38" y="5" width="10" height="5" rx="2.5" fill="#FFF6C9" />
      <rect x="8" y="100" width="10" height="4" rx="2" fill="#FF4D4D" />
      <rect x="38" y="100" width="10" height="4" rx="2" fill="#FF4D4D" />
    </svg>
  );
}
