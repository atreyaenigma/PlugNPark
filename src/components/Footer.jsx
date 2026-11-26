import Link from "next/link";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-grid">
        <div>
          <div className="brand"><i>P</i>PlugNPark</div>
          <p>Find parking and EV charging before you leave home.</p>
        </div>
        <div><h2 className="fh">Explore</h2><Link href="/find">Find a spot</Link><Link href="/trip">Trip planner</Link><Link href="/#how">How it works</Link><Link href="/about">About</Link></div>
        <div><h2 className="fh">Account</h2><Link href="/login">Log in</Link><Link href="/signup">Sign up</Link><Link href="/dashboard">Dashboard</Link></div>
        <div><h2 className="fh">Help</h2><Link href="/contact">Contact us</Link></div>
      </div>
      <p className="copy">© 2026 PlugNPark. Park smart, charge faster. Imported charger data © Open Charge Map contributors (CC BY 4.0). Place search by OpenStreetMap Nominatim. Trip routes by OSRM.</p>
    </footer>
  );
}
