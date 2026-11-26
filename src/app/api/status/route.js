import { NextResponse } from "next/server";
import { demoOn } from "@/lib/stations";
import { guard } from "@/lib/api";

export const dynamic = "force-dynamic";
export const GET = guard(async () => NextResponse.json({ demo: await demoOn() }));
