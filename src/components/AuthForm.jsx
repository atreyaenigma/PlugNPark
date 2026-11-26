"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "./AuthProvider";

export default function AuthForm({ mode }) {
  const signup = mode === "signup";
  const router = useRouter();
  const params = useSearchParams();
  const { user, loading } = useAuth();
  const [f, setF] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const next = params.get("next");
  const dest = next && next.startsWith("/") ? next : "/dashboard";

  // Already logged in? Skip the form.
  useEffect(() => { if (!loading && user && !busy) router.replace(dest); }, [loading, user, busy, dest, router]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      const r = await fetch(`/api/auth/${mode}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setError(d.error || "Something went wrong on the server. Please try again."); setBusy(false); return; }

      // Confirm the browser actually kept the session cookie before leaving this page.
      const me = await (await fetch("/api/auth/me", { cache: "no-store" })).json();
      if (!me.user) {
        setError("Your account is fine, but your browser did not keep the login cookie. Open the site on http://localhost:3000 and make sure cookies are allowed.");
        setBusy(false); return;
      }
      window.location.assign(dest); // full reload so every part of the app sees the new session
    } catch {
      setError("Could not reach the server. Check that it is running and try again.");
      setBusy(false);
    }
  };

  return (
    <main className="auth">
      <form onSubmit={submit} className="auth-card">
        <h1>{signup ? "Create your account" : "Welcome back"}</h1>
        <p className="muted">{signup ? "Reserve bays and chargers, and keep your bookings in one place." : "Log in to see your bookings and saved stations."}</p>
        {signup && <label>Name<input value={f.name} onChange={set("name")} autoComplete="name" required /></label>}
        <label>Email<input type="email" value={f.email} onChange={set("email")} autoComplete="email" required /></label>
        <label>Password<input type="password" value={f.password} onChange={set("password")} autoComplete={signup ? "new-password" : "current-password"} minLength={signup ? 6 : undefined} required /></label>
        {error && <p className="err" role="alert">{error}</p>}
        <button className="btn full" disabled={busy}>{busy ? "Please wait..." : signup ? "Sign up" : "Log in"}</button>
        <p className="muted switch">
          {signup ? "Already have an account? " : "New to PlugNPark? "}
          <Link href={`${signup ? "/login" : "/signup"}${next ? `?next=${encodeURIComponent(next)}` : ""}`}>{signup ? "Log in" : "Create an account"}</Link>
        </p>
      </form>
    </main>
  );
}
