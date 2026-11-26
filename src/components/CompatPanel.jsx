"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "./AuthProvider";
import { compat, usablePower } from "@/lib/vehicles";

export default function CompatPanel({ station }) {
  const { user } = useAuth();
  const path = usePathname();
  if (!station.chargers?.length) return null;
  const v = user?.vehicle;
  const c = v ? compat(station, v) : null;

  return (
    <section className="block" aria-labelledby="cp-h">
      <h2 id="cp-h">Does it fit your car?</h2>
      {!user ? (
        <p className="muted"><Link href={`/login?next=${encodeURIComponent(path)}`}>Log in</Link> and add your car to see whether it fits.</p>
      ) : !v ? (
        <p className="muted">You have not added your car yet. <Link href="/profile">Add my car</Link> to see which chargers here fit it.</p>
      ) : (
        <>
          {c.status === "none" ? <p className="alert" role="status">Not compatible. {c.reason}</p>
            : <p className="goodnote" role="status">{v.name} can charge here at up to <b>{c.kw} kW</b>. About {c.minutes} min from 20% to 80%{c.estimated ? " (estimated, this charger does not list its power)" : ""}.</p>}
          <ul className="compatlist">
            {station.chargers.map((ch, i) => {
              const u = usablePower(ch, v);
              return (
                <li key={i}>
                  <span>{ch.kind}{ch.kw ? ` · ${ch.kw} kW` : ""}</span>
                  {u ? <b className="okc">Fits · your car gets {u.kw} kW{u.estimated ? " (est.)" : ""}</b> : <b className="noc">Won't fit</b>}
                </li>
              );
            })}
          </ul>
          <p className="muted small-note">Showing results for <b>{v.name}</b>. <Link href="/profile">Change car</Link></p>
        </>
      )}
    </section>
  );
}
