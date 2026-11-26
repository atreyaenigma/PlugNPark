"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";

export default function useFavorites() {
  const { user } = useAuth();
  const router = useRouter();
  const path = usePathname();
  const [ids, setIds] = useState([]);

  useEffect(() => {
    if (!user) { setIds([]); return; }
    fetch("/api/favorites").then((r) => r.json()).then((d) => setIds(d.ids || []));
  }, [user]);

  const toggle = async (id) => {
    if (!user) { router.push(`/login?next=${encodeURIComponent(path)}`); return; }
    const r = await fetch("/api/favorites", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stationId: id }) });
    setIds((await r.json()).ids);
  };
  return { ids, toggle };
}
