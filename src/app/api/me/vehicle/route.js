import { NextResponse } from "next/server";
import { connect } from "@/lib/mongo";
import { User } from "@/lib/models";
import { currentUser } from "@/lib/auth";
import { cleanVehicle, VEHICLES } from "@/lib/vehicles";
import { guard } from "@/lib/api";

export const dynamic = "force-dynamic";
const need = () => NextResponse.json({ error: "Please log in." }, { status: 401 });

export const GET = guard(async () => {
  const u = await currentUser();
  if (!u) return need();
  return NextResponse.json({ vehicle: u.vehicle, skipped: u.vehicleSkipped });
});

// Saves the driver's car. A preset always uses its own figures; "custom" uses what the driver typed (validated).
export const PUT = guard(async (req) => {
  const u = await currentUser();
  if (!u) return need();
  const b = (await req.json().catch(() => ({}))).vehicle || {};
  const preset = VEHICLES.find((p) => p.id === b.presetId && p.id !== "custom");
  const { vehicle, error } = cleanVehicle(preset ? { ...preset } : b);
  if (error) return NextResponse.json({ error }, { status: 400 });
  const doc = { presetId: preset ? preset.id : "custom", ...vehicle, name: preset ? preset.name : String(b.name || "My car").trim().slice(0, 60) || "My car" };
  await connect();
  await User.updateOne({ _id: u.id }, { $set: { vehicle: doc, vehicleSkipped: false } });
  return NextResponse.json({ vehicle: doc });
});

// Removing the car is a choice, so we do not ask again.
export const DELETE = guard(async () => {
  const u = await currentUser();
  if (!u) return need();
  await connect();
  await User.updateOne({ _id: u.id }, { $unset: { vehicle: "" }, $set: { vehicleSkipped: true } });
  return NextResponse.json({ ok: true });
});
