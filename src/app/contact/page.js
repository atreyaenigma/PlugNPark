"use client";
import { useState } from "react";

export default function Contact() {
  const [f, setF] = useState({ name: "", email: "", message: "" });
  const [state, setState] = useState({ busy: false, done: false, error: "" });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setState({ busy: true, done: false, error: "" });
    const r = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
    const d = await r.json();
    if (!r.ok) setState({ busy: false, done: false, error: d.error });
    else { setState({ busy: false, done: true, error: "" }); setF({ name: "", email: "", message: "" }); }
  };

  return (
    <main className="auth">
      <form onSubmit={submit} className="auth-card">
        <h1>Contact us</h1>
        <p className="muted">Found a broken charger or have an idea? Tell us.</p>
        <label>Name<input value={f.name} onChange={set("name")} required /></label>
        <label>Email<input type="email" value={f.email} onChange={set("email")} required /></label>
        <label>Message<textarea rows={5} value={f.message} onChange={set("message")} required /></label>
        {state.error && <p className="err" role="alert">{state.error}</p>}
        {state.done && <p className="ok" role="status">Thanks. We got your message.</p>}
        <button className="btn full" disabled={state.busy}>{state.busy ? "Sending..." : "Send message"}</button>
      </form>
    </main>
  );
}
