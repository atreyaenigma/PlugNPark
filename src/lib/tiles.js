// Map tiles. Works with no key (OpenStreetMap).
// Optional: add a free CARTO key as NEXT_PUBLIC_CARTO_KEY in .env.local (carto.com/basemaps/apikey) for the CARTO light style.
// A tile key is visible in the browser by design, so this is not a secret.
export function tileConfig() {
  const key = process.env.NEXT_PUBLIC_CARTO_KEY;
  if (key) {
    return {
      url: `https://{s}.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}.png?key=${key}`,
      attribution: "&copy; OpenStreetMap contributors &copy; CARTO", className: "", maxZoom: 19,
    };
  }
  return { url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png", attribution: "&copy; OpenStreetMap contributors", className: "", maxZoom: 19 };
}
