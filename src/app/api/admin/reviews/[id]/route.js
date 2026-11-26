import { NextResponse } from "next/server";
import { connect } from "@/lib/mongo";
import { Review } from "@/lib/models";
import { bustCommunity } from "@/lib/community";
import { adminCheck, guard } from "@/lib/api";

export const DELETE = guard(async (_req, { params }) => {
  const { res } = await adminCheck(); if (res) return res;
  const id = String((await params).id);
  if (!/^[a-f\d]{24}$/i.test(id)) return NextResponse.json({ error: "Invalid review." }, { status: 400 });
  await connect();
  const r = await Review.deleteOne({ _id: id });
  bustCommunity();
  return r.deletedCount ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Review not found." }, { status: 404 });
});
