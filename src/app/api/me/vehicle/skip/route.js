import { NextResponse } from "next/server";
import { connect } from "@/lib/mongo";
import { User } from "@/lib/models";
import { currentUser } from "@/lib/auth";
import { guard } from "@/lib/api";

export const POST = guard(async () => {
  const u = await currentUser();
  if (!u) return NextResponse.json({ error: "Please log in." }, { status: 401 });
  await connect();
  await User.updateOne({ _id: u.id }, { $set: { vehicleSkipped: true } });
  return NextResponse.json({ ok: true });
});
