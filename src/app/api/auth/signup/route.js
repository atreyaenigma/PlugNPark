import { NextResponse } from "next/server";
import { connect } from "@/lib/mongo";
import { User } from "@/lib/models";
import { hashPassword, setSession } from "@/lib/auth";
import { guard } from "@/lib/api";

export const POST = guard(async (req) => {
  const { name = "", email = "", password = "" } = await req.json();
  const e = email.trim().toLowerCase();
  if (name.trim().length < 2) return NextResponse.json({ error: "Please enter your name." }, { status: 400 });
  if (!/^\S+@\S+\.\S+$/.test(e)) return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  if (password.length < 6) return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
  await connect();
  const exists = { error: "An account with this email already exists. Try logging in." };
  if (await User.findOne({ email: e })) return NextResponse.json(exists, { status: 409 });
  let user;
  try { user = await User.create({ name: name.trim(), email: e, password: hashPassword(password) }); }
  catch (err) { if (err.code === 11000) return NextResponse.json(exists, { status: 409 }); throw err; }
  const body = { user: { id: String(user._id), name: user.name, email: user.email } };
  return setSession(NextResponse.json(body, { status: 201 }), String(user._id), req);
});
