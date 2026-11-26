import Link from "next/link";

export default function NotFound() {
  return (
    <main className="page notfound">
      <div className="big">404</div>
      <h1>This bay is empty.</h1>
      <p className="muted">The page you are looking for does not exist. Let's get you back on the road.</p>
      <Link href="/" className="btn">Back to home</Link>
    </main>
  );
}
