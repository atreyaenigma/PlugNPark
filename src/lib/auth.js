import crypto from "crypto";
import { cookies } from "next/headers";
import { connect } from "./mongo";
import { User } from "./models";

const SECRET = process.env.SESSION_SECRET || "dev-secret-change-me";
const adminEmails = () => (process.env.ADMIN_EMAILS || "").split(",").map((x) => x.trim().toLowerCase()).filter(Boolean);
const sign = (v) => crypto.createHmac("sha256", SECRET).update(v).digest("hex");

export const hashPassword = (pw) => {
  const salt = crypto.randomBytes(16).toString("hex");
  return salt + ":" + crypto.scryptSync(pw, salt, 64).toString("hex");
};
export const checkPassword = (pw, stored) => {
  const [salt, h] = stored.split(":");
  const a = crypto.scryptSync(pw, salt, 64), b = Buffer.from(h, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

// Only mark the cookie Secure on real HTTPS, otherwise browsers drop it on http:// and login loops.
export function setSession(res, userId, req) {
  const https = req?.nextUrl?.protocol === "https:" || req?.headers?.get("x-forwarded-proto") === "https";
  const v = `${userId}.${Date.now() + 7 * 864e5}`;
  res.cookies.set("pnp_session", `${v}.${sign(v)}`, {
    httpOnly: true, sameSite: "lax", path: "/", maxAge: 7 * 86400, secure: https,
  });
  return res;
}

export async function currentUser() {
  const t = (await cookies()).get("pnp_session")?.value;
  if (!t) return null;
  const [id, exp, sig] = t.split(".");
  if (!sig) return null;
  const good = sign(`${id}.${exp}`);
  if (good.length !== sig.length || !crypto.timingSafeEqual(Buffer.from(good), Buffer.from(sig))) return null;
  if (Date.now() > Number(exp)) return null;
  try {
    await connect();
    const u = await User.findById(id).lean();
    return u ? { id: String(u._id), name: u.name, email: u.email, isAdmin: u.role === "admin" || adminEmails().includes(u.email),
      vehicle: u.vehicle ? { presetId: u.vehicle.presetId, name: u.vehicle.name, batteryKwh: u.vehicle.batteryKwh, rangeKm: u.vehicle.rangeKm, maxDcKw: u.vehicle.maxDcKw, maxAcKw: u.vehicle.maxAcKw, connectors: [...(u.vehicle.connectors || [])] } : null,
      vehicleSkipped: !!u.vehicleSkipped } : null;
  } catch { return null; }
}
