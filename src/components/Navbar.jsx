"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "./AuthProvider";

const links = [["/find", "Find"], ["/trip", "Trip planner"], ["/about", "About"], ["/contact", "Contact"]];

export default function Navbar() {
  const { user, loading, logout } = useAuth();
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <header className="nav">
      <Link href="/" className="brand" onClick={close}><i>P</i>PlugNPark</Link>
      <button className="burger" onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Menu"><span /><span /></button>
      <nav className={open ? "open" : ""}>
        {links.map(([h, l]) => (
          <Link key={h} href={h} onClick={close} className={path === h ? "active" : ""}>{l}</Link>
        ))}
        {user && <Link href="/dashboard" onClick={close} className={path === "/dashboard" ? "active" : ""}>Dashboard</Link>}
        {user && <Link href="/profile" onClick={close} className={path === "/profile" ? "active" : ""}>My car</Link>}
        {user?.isAdmin && <Link href="/admin" onClick={close} className={path === "/admin" ? "active" : ""}>Admin</Link>}
        {!loading && (user ? (
          <button className="btn ghost small" onClick={() => { close(); logout(); }}>Log out ({user.name.split(" ")[0]})</button>
        ) : (
          <>
            <Link href="/login" onClick={close}>Log in</Link>
            <Link href="/signup" className="btn small" onClick={close}>Sign up</Link>
          </>
        ))}
      </nav>
    </header>
  );
}
