import Link from "next/link";
import ParkingLot from "@/components/ParkingLot";
import CountUp from "@/components/CountUp";
import { stations, bookings } from "@/lib/data";

export const dynamic = "force-dynamic";

const steps = [
  ["Search", "Type a street or tap the map. We show every lot and charger nearby."],
  ["Compare", "Free bays, charger speed and price per hour, side by side."],
  ["Reserve", "Hold a bay or a charger. You get a code for the gate."],
  ["Arrive", "Drive in, show the code, and plug in. No circling the block."],
];

export default function Home() {
  const freeBays = stations.reduce((a, s) => a + s.parkFree, 0);
  const freeChargers = stations.reduce((a, s) => a + s.chargers.reduce((x, c) => x + c.free, 0), 0);
  const stats = [
    [freeBays, "free parking bays right now"],
    [freeChargers, "chargers ready to plug into"],
    [stations.length, "stations across the city"],
    [bookings.length, "bookings made today"],
  ];

  return (
    <main>
      <section className="hero">
        <h1>Find a spot.<br />Find a charge.</h1>
        <p className="lead">PlugNPark shows free parking bays and working EV chargers on one live map, so you stop circling and start charging.</p>
        <div className="hero-cta">
          <Link href="/find" className="btn">Find parking near me</Link>
          <span className="hint">Or try the lot below. It is live.</span>
        </div>
        <ParkingLot />
      </section>

      <section id="how" className="how">
        <h2>From search to plugged in</h2>
        <ol>
          {steps.map(([t, d], i) => (
            <li key={t}><span className="step-n">{i + 1}</span><h3>{t}</h3><p>{d}</p></li>
          ))}
        </ol>
      </section>

      <section id="live" className="stats">
        {stats.map(([n, l]) => (
          <div key={l}><b><CountUp to={n} /></b><p>{l}</p></div>
        ))}
      </section>

      <section className="cta">
        <h2>Your next bay is already waiting.</h2>
        <Link href="/find" className="btn">Open the live map</Link>
      </section>

      <footer className="footer">PlugNPark. Park smart, charge faster.</footer>
    </main>
  );
}
