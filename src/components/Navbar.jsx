import Link from "next/link";

export default function Navbar() {
  return (
    <header className="nav">
      <Link href="/" className="brand"><i>P</i>PlugNPark</Link>
      <nav>
        <Link href="/#how">How it works</Link>
        <Link href="/#live">Live numbers</Link>
        <Link href="/find" className="btn small">Open the map</Link>
      </nav>
    </header>
  );
}
