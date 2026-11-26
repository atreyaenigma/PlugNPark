import { NextResponse } from "next/server";
import { connect } from "@/lib/mongo";
import { Station } from "@/lib/models";
import { parseStation } from "@/lib/stationInput";
import { adminCheck, guard } from "@/lib/api";

export const POST = guard(async (req) => {
  const { res } = await adminCheck(); if (res) return res;
  const { data, error } = parseStation(await req.json());
  if (error) return NextResponse.json({ error }, { status: 400 });
  await connect();
  const last = await Station.findOne().sort({ id: -1 }).lean();
  const id = (last?.id || 0) + 1;
  await Station.create({
    id, ...data,
    parkFree: data.parkTotal,
    chargers: data.chargers.map((c) => ({ ...c, free: c.total })),
    loc: { type: "Point", coordinates: [data.lng, data.lat] },
  });
  return NextResponse.json({ id }, { status: 201 });
});
