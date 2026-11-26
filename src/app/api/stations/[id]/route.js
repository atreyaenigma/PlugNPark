import { NextResponse } from "next/server";
import { getStation } from "@/lib/stations";
import { guard } from "@/lib/api";

export const dynamic = "force-dynamic";
export const GET = guard(async (_req, { params }) => {
  const { id } = await params;
  const s = await getStation(id);
  return s ? NextResponse.json(s) : NextResponse.json({ error: "Station not found." }, { status: 404 });
});
