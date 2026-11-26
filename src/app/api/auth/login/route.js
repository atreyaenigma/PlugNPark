import { NextResponse } from "next/server";
import { connect } from "@/lib/mongo";
import { User } from "@/lib/models";
import { checkPassword, setSession } from "@/lib/auth";
import { guard } from "@/lib/api";

export const POST = guard(async (req) => {
  const { email = "", password = "" } = await req.json();
  await connect();
  const u = await User.findOne({ email: email.trim().toLowerCase() }).lean();
  if (!u || !checkPassword(password, u.password)) return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 });
  return setSession(NextResponse.json({ user: { id: String(u._id), name: u.name, email: u.email } }), String(u._id), req);
});
