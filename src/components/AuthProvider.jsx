"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";

const Ctx = createContext({ user: null, loading: true, refresh: async () => {}, logout: async () => {} });
export const useAuth = () => useContext(Ctx);

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    let u = null;
    try { u = (await (await fetch("/api/auth/me", { cache: "no-store" })).json()).user || null; } catch {}
    setUser(u);
    setLoading(false);
    return u;
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    window.location.assign("/");
  };
  return <Ctx.Provider value={{ user, loading, refresh, logout }}>{children}</Ctx.Provider>;
}
