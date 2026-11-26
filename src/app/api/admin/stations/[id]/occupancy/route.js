import { NextResponse } from "next/server";
import { connect } from "@/lib/mongo";
import { Station } from "@/lib/models";
import { nudge } from "@/lib/live";
import { adminCheck, guard } from "@/lib/api";

// An operator marks one bay or charger as taken (-1) or free (+1).
export const POST = guard(async (req, { params }) => {
  const { res } = await adminCheck(); if (res) return res;
  const id = Number((await params).id);
  const { target, index = 0, delta } = await req.json();
  if (!["parking", "charger"].includes(target) || ![-1, 1].includes(delta)) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  await connect();
  const s = await Station.findOne({ id }).lean();
  if (!s) return NextResponse.json({ error: "Station not found." }, { status: 404 });
  if (s.live === false) return NextResponse.json({ error: "Make this station live first." }, { status: 409 });
  if (target === "charger" && !s.chargers[index]) return NextResponse.json({ error: "Charger not found." }, { status: 404 });
  const ok = await nudge(s, target, index, delta);
  return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: delta < 0 ? "Everything here is already taken." : "Nothing more to free. The rest is held by active bookings." }, { status: 409 });
});
