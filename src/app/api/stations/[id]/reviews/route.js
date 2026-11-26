import { NextResponse } from "next/server";
import { connect } from "@/lib/mongo";
import { Review, Station, User } from "@/lib/models";
import { currentUser } from "@/lib/auth";
import { bustCommunity } from "@/lib/community";
import { allow } from "@/lib/limit";
import { guard } from "@/lib/api";

export const dynamic = "force-dynamic";

// "Asha Kumar" -> "Asha K." so reviews never show full names or emails.
const shortName = (n = "") => { const p = n.trim().split(/\s+/); return p.length > 1 ? `${p[0]} ${p[p.length - 1][0].toUpperCase()}.` : p[0] || "Driver"; };

export const GET = guard(async (_req, { params }) => {
  const id = Number((await params).id);
  await connect();
  const me = await currentUser();
  const list = await Review.find({ stationId: id }).sort({ updatedAt: -1 }).limit(30).lean();
  const users = await User.find({ _id: { $in: list.map((r) => r.userId).filter((x) => /^[a-f\d]{24}$/i.test(x)) } }).lean();
  const name = Object.fromEntries(users.map((u) => [String(u._id), u.name]));
  return NextResponse.json(list.map((r) => ({ id: String(r._id), rating: r.rating, comment: r.comment, at: r.updatedAt, author: shortName(name[r.userId]), mine: me?.id === r.userId })));
});

// One review per driver per station. Posting again edits it.
export const POST = guard(async (req, { params }) => {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Please log in to leave a review." }, { status: 401 });
  if (!allow("rev:" + user.id, 20, 3600e3)) return NextResponse.json({ error: "Too many changes. Try again later." }, { status: 429 });
  const id = Number((await params).id);
  const b = await req.json().catch(() => ({}));
  const rating = Number(b.rating), comment = String(b.comment || "").trim();
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return NextResponse.json({ error: "Choose a rating from 1 to 5 stars." }, { status: 400 });
  if (comment.length > 500) return NextResponse.json({ error: "Keep the review under 500 characters." }, { status: 400 });
  await connect();
  if (!(await Station.exists({ id }))) return NextResponse.json({ error: "Station not found." }, { status: 404 });
  await Review.updateOne({ stationId: id, userId: user.id }, { $set: { rating, comment, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } }, { upsert: true });
  bustCommunity();
  return NextResponse.json({ ok: true }, { status: 201 });
});

export const DELETE = guard(async (_req, { params }) => {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Please log in." }, { status: 401 });
  const id = Number((await params).id);
  await connect();
  await Review.deleteOne({ stationId: id, userId: user.id });
  bustCommunity();
  return NextResponse.json({ ok: true });
});
