import mongoose from "mongoose";
import { Station } from "./models";
import { SEED } from "./seedStations";

const URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/plugnpark";
const cache = globalThis.__pnpMongo || (globalThis.__pnpMongo = { conn: null, promise: null });

export async function connect() {
  if (cache.conn) return cache.conn;
  if (!cache.promise) {
    cache.promise = mongoose.connect(URI, { serverSelectionTimeoutMS: 4000 }).then(async (m) => {
      await Station.init(); // makes sure the 2dsphere index exists for "near me" searches
      if ((await Station.estimatedDocumentCount()) === 0) await Station.insertMany(SEED);
      return m;
    });
  }
  try { cache.conn = await cache.promise; } catch (e) { cache.promise = null; throw e; }
  return cache.conn;
}
