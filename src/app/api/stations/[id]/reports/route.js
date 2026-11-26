import { NextResponse } from "next/server";
import { connect } from "@/lib/mongo";
import { Report, Station } from "@/lib/models";
import { currentUser } from "@/lib/auth";
import { bustCommunity } from "@/lib/community";
import { guard } from "@/lib/api";

const TYPES = ["broken", "busy", "worked", "wrong"];
const SIX_HOURS = 6 * 3600e3;

export const POST = guard(async (req, { params }) => {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Please log in to send a report." }, { status: 401 });
  const id = Number((await params).id);
  const b = await req.json().catch(() => ({}));
  const type = String(b.type || ""), note = String(b.note || "").trim();
  if (!TYPES.includes(type)) return NextResponse.json({ error: "Choose what you want to report." }, { status: 400 });
  if (note.length > 300) return NextResponse.json({ error: "Keep the note under 300 characters." }, { status: 400 });
  await connect();
  if (!(await Station.exists({ id }))) return NextResponse.json({ error: "Station not found." }, { status: 404 });

  // Fair use: one report of each kind per station every 6 hours, and 15 reports a day per person.
  if (await Report.exists({ stationId: id, userId: user.id, type, createdAt: { $gte: new Date(Date.now() - SIX_HOURS) } }))
    return NextResponse.json({ error: "You already sent this report recently. Thank you, we have it." }, { status: 429 });
  if ((await Report.countDocuments({ userId: user.id, createdAt: { $gte: new Date(Date.now() - 864e5) } })) >= 15)
    return NextResponse.json({ error: "You have sent a lot of reports today. Please try again tomorrow." }, { status: 429 });

  await Report.create({ stationId: id, userId: user.id, type, note, status: type === "broken" || type === "wrong" ? "open" : "info" });
  bustCommunity();
  return NextResponse.json({ ok: true }, { status: 201 });
});
