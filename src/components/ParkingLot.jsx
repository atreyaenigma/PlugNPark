"use client";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import TopCar from "./TopCar";
import Bolt from "./Bolt";

// t = taken, f = free, e = free EV bay, b = EV bay in use
const ROW_A = "t e f t b f e t".split(" ");
const ROW_B = "f t e e t f t b".split(" ");
const COLORS = ["#E9E6DC", "#9AA3B5", "#FF8A3D", "#D9455F", "#5C6577", "#C7D2E8"];

const build = () => [...ROW_A, ...ROW_B].map((k, i) => ({
  id: (i < 8 ? "A" : "B") + ((i % 8) + 1), kind: k, color: COLORS[(i * 7) % COLORS.length], mine: false,
}));

const label = (b) => {
  if (b.mine) return `Bay ${b.id}: your car`;
  if (b.kind === "f") return `Bay ${b.id}: free parking. Tap to park here`;
  if (b.kind === "e") return `Bay ${b.id}: free EV charger, 60 kW. Tap to park and charge`;
  if (b.kind === "b") return `Bay ${b.id}: EV charger in use`;
  return `Bay ${b.id}: taken`;
};

export default function ParkingLot() {
  const [bays, setBays] = useState(build);
  const [hover, setHover] = useState(null);
  const [ticket, setTicket] = useState(null);

  const park = (b) => {
    if (b.mine || (b.kind !== "f" && b.kind !== "e") || ticket) return;
    setBays((all) => all.map((x) => (x.id === b.id ? { ...x, mine: true } : x)));
    setTicket({ id: b.id, ev: b.kind === "e", code: "PNP-" + Math.random().toString(36).slice(2, 6).toUpperCase() });
  };
  const reset = () => { setBays(build()); setTicket(null); };

  const row = (list) => list.map((b) => {
    const open = (b.kind === "f" || b.kind === "e") && !b.mine && !ticket;
    return (
      <button key={b.id} className={`bay ${open ? "open" : ""}`}
        onMouseEnter={() => setHover(b)} onFocus={() => setHover(b)} onMouseLeave={() => setHover(null)}
        onClick={() => park(b)} aria-label={label(b)} disabled={!open}>
        <span className="bay-id">{b.id}</span>
        {(b.kind === "e" || b.kind === "b") && !b.mine && <span className={`bay-bolt ${b.kind === "e" ? "live" : ""}`}><Bolt size={14} /></span>}
        <AnimatePresence>
          {(b.kind === "t" || b.kind === "b" || b.mine) && (
            <motion.div className="bay-car" initial={b.mine ? { y: 140, opacity: 0 } : false}
              animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }}>
              <TopCar color={b.mine ? "#53F0B0" : b.color} w={42} />
            </motion.div>
          )}
        </AnimatePresence>
      </button>
    );
  });

  return (
    <div className="lot">
      <div className="lot-row top">{row(bays.slice(0, 8))}</div>
      <div className="lot-lane"><span>Entry</span><i /><span>Exit</span></div>
      <div className="lot-row bottom">{row(bays.slice(8))}</div>
      <div className="lot-status" aria-live="polite">
        {ticket ? (
          <div className="ticket">
            <div><b>Bay {ticket.id} is yours.</b> Code {ticket.code}. {ticket.ev ? "Plug in and charging starts." : "Free for the first hour."}</div>
            <button className="btn ghost small" onClick={reset}>Park somewhere else</button>
          </div>
        ) : hover ? label(hover) : "Tap a free bay to park. Bays with a bolt can charge your car."}
      </div>
    </div>
  );
}
