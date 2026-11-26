import { NextResponse } from "next/server";
import { connect } from "@/lib/mongo";
import { Meta } from "@/lib/models";
import { importArea, OcmError } from "@/lib/ocmImport";
import { allow, ipOf } from "@/lib/limit";
import { guard } from "@/lib/api";

// Public: when someone searches a new place, fetch real chargers around it (once per area per week).
// Everything it adds is "not live", and it is rate limited so it cannot be used to hammer Open Charge Map.
export const POST = guard(async (req) => {
  if (!allow("disc:" + ipOf(req), 10, 3600e3)) return NextResponse.json({ ok: false, error: "Too many area searches. Try again later." }, { status: 429 });
  const b = await req.json().catch(() => ({}));
  const lat = Number(b.lat), lng = Number(b.lng);
  if (!(Math.abs(lat) <= 90) || !(Math.abs(lng) <= 180)) return NextResponse.json({ ok: false, error: "Invalid location." }, { status: 400 });

  await connect();
  const key = `area:${lat.toFixed(1)}:${lng.toFixed(1)}`;
  const seen = await Meta.findOne({ key }).lean();
  if (seen && Date.now() - new Date(seen.value) < 7 * 864e5) return NextResponse.json({ ok: true, cached: true, created: 0 });
  if (Date.now() - (globalThis.__pnpDisc || 0) < 2000) return NextResponse.json({ ok: true, busy: true, created: 0 });
  globalThis.__pnpDisc = Date.now();

  try {
    const r = await importArea({ lat, lng, radius: 15, max: 50 });
    await Meta.updateOne({ key }, { value: new Date() }, { upsert: true });
    return NextResponse.json({ ok: true, ...r });
  } catch (e) {
    if (e instanceof OcmError) return NextResponse.json({ ok: false, error: e.message });
    throw e;
  }
});
