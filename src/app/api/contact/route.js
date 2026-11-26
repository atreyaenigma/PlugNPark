import { NextResponse } from "next/server";
import { connect } from "@/lib/mongo";
import { Message } from "@/lib/models";
import { guard } from "@/lib/api";

export const POST = guard(async (req) => {
  const { name = "", email = "", message = "" } = await req.json();
  if (!name.trim() || !/^\S+@\S+\.\S+$/.test(email) || message.trim().length < 5)
    return NextResponse.json({ error: "Please fill in your name, a valid email and a message." }, { status: 400 });
  await connect();
  await Message.create({ name: name.trim(), email: email.trim(), message: message.trim() });
  return NextResponse.json({ ok: true }, { status: 201 });
});
