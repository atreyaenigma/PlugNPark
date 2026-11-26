import { NextResponse } from "next/server";
import { connect } from "@/lib/mongo";
import { User } from "@/lib/models";
import { currentUser } from "@/lib/auth";
import { guard } from "@/lib/api";

export const dynamic = "force-dynamic";

export const GET = guard(async () => {
  const user = await currentUser();
  if (!user) return NextResponse.json({ ids: [] });
  const u = await User.findById(user.id).lean();
  return NextResponse.json({ ids: u?.favorites || [] });
});

export const POST = guard(async (req) => {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Please log in." }, { status: 401 });
  const { stationId } = await req.json();
  await connect();
  const u = await User.findById(user.id).lean();
  const has = (u.favorites || []).includes(stationId);
  const upd = await User.findByIdAndUpdate(user.id, has ? { $pull: { favorites: stationId } } : { $addToSet: { favorites: stationId } }, { new: true }).lean();
  return NextResponse.json({ ids: upd.favorites });
});
