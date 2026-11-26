import Link from "next/link";
import ParkingLot from "@/components/ParkingLot";
import CountUp from "@/components/CountUp";
import Bolt from "@/components/Bolt";
import Pin from "@/components/Pin";
import { getStations } from "@/lib/stations";
import { connect } from "@/lib/mongo";
import { Booking } from "@/lib/models";

export const dynamic = "force-dynamic";

const steps = [
  ["Search", "Type a street or tap the map. We show every lot and charger nearby."],
  ["Compare", "Free bays, charger speed and price per hour, side by side."],
  ["Reserve", "Hold a bay or a charger. You get a code for the gate."],
  ["Arrive", "Drive in, show the code, and plug in. No circling the block."],
];

export default async function Home() {
  let stations = [], bookingCount = 0, dbDown = false;
  try { stations = await getStations(); await connect(); bookingCount = await Booking.countDocuments({ synthetic: { $ne: true } }); } catch { dbDown = true; }
  const freeBays = stations.filter((s) => s.live).reduce((a, s) => a + s.parkFree, 0);
  const freeChargers = stations.filter((s) => s.live).reduce((a, s) => a + s.chargers.reduce((x, c) => x + c.free, 0), 0);
  const stats = [
    [freeBays, "free parking bays right now"],
    [freeChargers, "chargers ready to plug into"],
    [stations.length, "stations across the city"],
    [bookingCount, "bookings made so far"],
  ];

  return (
    <main>
      {dbDown && <p className="dbnote" role="alert">The database is not connected, so live numbers show zero. Start MongoDB and check MONGODB_URI in .env.local.</p>}
      <section className="herox" aria-label="Welcome to PlugNPark">
        <div className="herox-frame">
          {/* The picture sits on the bottom layer (z-index: -1); everything else is stacked above it. */}
          <picture className="herox-img">
            <source type="image/webp" srcSet="/images/hero-960.webp 960w, /images/hero-1600.webp 1600w" sizes="(min-width: 1500px) 1480px, 100vw" />
            <img src="/images/hero-1600.jpg" srcSet="/images/hero-960.jpg 960w, /images/hero-1600.jpg 1600w" sizes="(min-width: 1500px) 1480px, 100vw"
              width="1600" height="900" fetchPriority="high" decoding="async"
              alt="Illustration in a toy-brick style: a driver checks a parking and charging app beside an electric car that is plugged into a charger, next to a parking sign." />
          </picture>
          <div className="herox-card">
            <div className="hx-desktop">
              <h1>Find a spot.<br />Find a charge.</h1>
              <p>Free parking bays and working EV chargers on one live map, so you stop circling and start charging.</p>
              <div className="hx-cta">
                <Link href="/find" className="btn">Find parking near me</Link>
                <Link href="/trip" className="btn ghost">Plan a trip</Link>
              </div>
            </div>
            <div className="hx-brand" aria-hidden="true"><i>P</i><span>PlugNPark</span></div>
          </div>
        </div>

        <div className="hx-mobile">
          <h1>Find a spot.<br />Find a charge.</h1>
          <p>Free parking bays and working EV chargers on one live map, so you stop circling and start charging.</p>
          <div className="hx-cta">
            <Link href="/find" className="btn">Find parking near me</Link>
            <Link href="/trip" className="btn ghost">Plan a trip</Link>
          </div>
        </div>

        <ul className="herox-chips">
          <li><Bolt size={16} /> EV charging</li>
          <li><b>P</b> Find parking</li>
          <li><Pin size={16} /> Anywhere in your area</li>
        </ul>
      </section>

      <section className="tryit" aria-labelledby="tryit-h">
        <h2 id="tryit-h">Try it yourself</h2>
        <p className="muted">Tap a free bay to park your car. Bays with a bolt can charge it.</p>
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

    </main>
  );
}
