import { compat } from "@/lib/vehicles";

// Small label showing whether a station suits the driver's car.
export default function CompatBadge({ s, v }) {
  if (!v) return null;
  const c = compat(s, v);
  if (c.status === "na" || c.status === "unknown") return null;
  if (c.status === "none") return <span className="tag nofit" title={c.reason}>Won't fit your car</span>;
  return <span className={`tag ${c.status === "fast" ? "live" : "slowfit"}`} title={`About ${c.minutes} min for 20 to 80%`}>{c.status === "fast" ? "Fits your car" : "Fits, slow charging"} · up to {c.kw} kW{c.estimated ? "*" : ""}</span>;
}
