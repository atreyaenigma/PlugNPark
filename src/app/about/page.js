import Link from "next/link";

export const metadata = { title: "About PlugNPark" };

const points = [
  ["The problem", "Drivers circle blocks looking for parking, and EV owners arrive at chargers that are full, broken or the wrong connector."],
  ["What we do", "PlugNPark shows free bays and working chargers on one live map, lets you reserve one, and gives you a code for the gate."],
  ["Why it matters", "Less circling means less traffic and fewer emissions. Easier charging makes it simpler to switch to an electric car."],
];

export default function About() {
  return (
    <main className="page about">
      <h1>Parking and charging, without the guesswork.</h1>
      <p className="lead">PlugNPark is a smart parking and EV charging finder built to take the stress out of arriving somewhere.</p>
      <div className="about-grid">
        {points.map(([t, d]) => <section key={t} className="block"><h2>{t}</h2><p className="muted">{d}</p></section>)}
      </div>
      <section className="block">
        <h2>Built with</h2>
        <p className="muted">Next.js and React for the interface, Node.js API routes for the backend, Leaflet and OpenStreetMap for the map, and Framer Motion for animation.</p>
      </section>
      <Link href="/find" className="btn">Find a spot now</Link>
    </main>
  );
}
