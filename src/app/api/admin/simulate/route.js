import { NextResponse } from "next/server";
import { connect } from "@/lib/mongo";
import { Meta, Station } from "@/lib/models";
import { nudge } from "@/lib/live";
import { adminCheck, guard } from "@/lib/api";

// Demo traffic: while an admin tab keeps calling this, live stations get small random changes.
// The flag expires 20 seconds after the last call, and the site labels the data as simulated.
export const POST = guard(async (req) => {
  const { res } = await adminCheck(); if (res) return res;
  const { on } = await req.json();
  await connect();
  if (!on) {
    await Meta.updateOne({ key: "demoUntil" }, { value: new Date() }, { upsert: true });
    return NextResponse.json({ demo: false });
  }
  await Meta.updateOne({ key: "demoUntil" }, { value: new Date(Date.now() + 20000) }, { upsert: true });
  let changes = 0;
  for (const s of await Station.find({ live: { $ne: false } }).lean()) {
    if (Math.random() < 0.4) continue;
    const slots = [];
    if (s.parkTotal > 0) slots.push({ target: "parking", index: 0, free: s.parkFree, total: s.parkTotal });
    s.chargers.forEach((c, i) => slots.push({ target: "charger", index: i, free: c.free, total: c.total }));
    if (!slots.length) continue;
    const t = slots[Math.floor(Math.random() * slots.length)];
    const delta = t.free === 0 ? 1 : t.free >= t.total ? -1 : Math.random() < 0.5 ? -1 : 1;
    if (await nudge(s, t.target, t.index, delta)) changes++;
  }
  return NextResponse.json({ demo: true, changes });
});
