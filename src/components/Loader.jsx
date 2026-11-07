"use client";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import TopCar from "./TopCar";

// A car drives into its bay, the bay is painted, the cable connects, the battery counts to 100.
export default function Loader({ children }) {
  const [show, setShow] = useState(true);
  const [pct, setPct] = useState(0);

  useEffect(() => {
    let seen = false;
    try { seen = sessionStorage.getItem("pnp-seen") === "1"; } catch {}
    if (seen) { setShow(false); return; }
    const t0 = performance.now();
    const id = setInterval(() => {
      const t = (performance.now() - t0 - 1400) / 2000;
      setPct(Math.max(0, Math.min(100, Math.round(t * 100))));
    }, 40);
    const done = setTimeout(() => {
      setShow(false);
      try { sessionStorage.setItem("pnp-seen", "1"); } catch {}
    }, 3900);
    return () => { clearInterval(id); clearTimeout(done); };
  }, []);

  return (
    <>
      <AnimatePresence>
        {show && (
          <motion.div
            className="loader"
            initial={{ clipPath: "inset(0 0 0% 0)" }}
            animate={{ clipPath: "inset(0 0 0% 0)" }}
            exit={{ clipPath: "inset(0 0 100% 0)" }}
            transition={{ duration: 0.9, ease: [0.77, 0, 0.18, 1] }}
            role="status" aria-label="Loading PlugNPark"
          >
            <svg className="loader-scene" viewBox="0 0 900 520" preserveAspectRatio="xMidYMid slice">
              <motion.path d="M392 210 V50 H508 V210" stroke="#F3F1EA" strokeWidth="6" strokeLinecap="square" fill="none"
                initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.1, delay: 0.2, ease: "easeInOut" }} />
              <motion.line x1="450" y1="230" x2="450" y2="560" stroke="#F3F1EA" strokeOpacity=".35" strokeWidth="4" strokeDasharray="22 26"
                className="lane" initial={{ opacity: 1 }} animate={{ opacity: [1, 1, 0] }} transition={{ duration: 1.6, times: [0, 0.8, 1] }} />
              <rect x="540" y="96" width="22" height="64" rx="5" fill="#242831" stroke="#53F0B0" strokeWidth="2" />
              <motion.circle cx="551" cy="112" r="4" fill="#53F0B0" initial={{ opacity: 0.2 }} animate={{ opacity: [0.2, 1, 0.2] }} transition={{ delay: 1.5, duration: 0.6, repeat: Infinity }} />
              <motion.path d="M540 140 C 522 150, 506 150, 482 148" stroke="#53F0B0" strokeWidth="4" fill="none" strokeLinecap="round"
                initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 1.35, duration: 0.5 }} />
              <motion.g initial={{ y: 520 }} animate={{ y: 90 }} transition={{ duration: 1.45, ease: [0.2, 0.8, 0.2, 1] }}>
                <foreignObject x="422" y="0" width="56" height="110"><TopCar color="#2F6BFF" /></foreignObject>
              </motion.g>
            </svg>

            <div className="loader-foot">
              <div className="loader-num">{String(pct).padStart(2, "0")}<small>%</small></div>
              <div className="loader-word">PlugNPark</div>
            </div>
            <div className="loader-bar"><i style={{ width: `${pct}%` }} /></div>
          </motion.div>
        )}
      </AnimatePresence>
      {children}
    </>
  );
}
