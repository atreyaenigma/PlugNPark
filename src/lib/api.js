import { NextResponse } from "next/server";
import { currentUser } from "./auth";

// Wraps a route handler so database problems come back as readable JSON instead of a crash.
export const guard = (fn) => async (...args) => {
  try { return await fn(...args); } catch (e) {
    console.error(e);
    const down = /ECONNREFUSED|ServerSelection|MongoNetwork|MongoParse|querySrv|ENOTFOUND/i.test(`${e?.name} ${e?.message}`);
    return NextResponse.json(
      { error: down ? "Cannot reach MongoDB. Check that it is running and that MONGODB_URI is correct." : "Something went wrong on the server." },
      { status: down ? 503 : 500 }
    );
  }
};

// Use at the top of every admin route: returns { res } to send back, or { user } when allowed.
export async function adminCheck() {
  const user = await currentUser();
  if (!user) return { res: NextResponse.json({ error: "Please log in." }, { status: 401 }) };
  if (!user.isAdmin) return { res: NextResponse.json({ error: "Admins only." }, { status: 403 }) };
  return { user };
}
