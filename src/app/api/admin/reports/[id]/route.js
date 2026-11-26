import { NextResponse } from "next/server";
import { connect } from "@/lib/mongo";
import { Report } from "@/lib/models";
import { bustCommunity } from "@/lib/community";
import { adminCheck, guard } from "@/lib/api";

// Admin closes a report: "resolved" (fixed or confirmed) or "dismissed" (not valid).
export const POST = guard(async (req, { params }) => {
  const { res, user } = await adminCheck(); if (res) return res;
  const id = String((await params).id);
  const { status } = await req.json().catch(() => ({}));
  if (!/^[a-f\d]{24}$/i.test(id) || !["resolved", "dismissed"].includes(status)) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  await connect();
  const r = await Report.findOneAndUpdate({ _id: id, status: "open" }, { status, resolvedAt: new Date(), resolvedBy: user.id });
  bustCommunity();
  return r ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "That report is already closed." }, { status: 409 });
});
