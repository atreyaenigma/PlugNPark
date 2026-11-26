"use client";
import { useEffect, useRef } from "react";

// Calls fn every few seconds while the tab is visible.
export default function usePoll(fn, ms = 8000) {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => {
    const id = setInterval(() => { if (document.visibilityState === "visible") ref.current(); }, ms);
    return () => clearInterval(id);
  }, [ms]);
}
