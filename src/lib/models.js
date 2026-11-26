import mongoose from "mongoose";
const { Schema } = mongoose;

const StationSchema = new Schema({
  id: { type: Number, unique: true, required: true },
  name: String, area: String, lat: Number, lng: Number,
  loc: { type: { type: String, enum: ["Point"] }, coordinates: [Number] }, // for "stations near me" queries
  parkFree: Number, parkTotal: Number, parkRate: Number, kwhRate: Number, hours: String,
  live: { type: Boolean, default: true },            // false = imported, availability unknown
  source: { type: String, default: "manual" },       // "manual" or "ocm"
  ocmId: { type: Number, index: true },
  operator: String, usageCost: String, liveAt: Date,
  chargers: [{ _id: false, kind: String, kw: Number, total: Number, free: Number }],
});
StationSchema.index({ loc: "2dsphere" });

const UserSchema = new Schema({
  name: String,
  email: { type: String, unique: true, lowercase: true, trim: true },
  password: String,
  vehicle: {
    type: new Schema({ presetId: String, name: String, batteryKwh: Number, rangeKm: Number, maxDcKw: Number, maxAcKw: Number, connectors: [String] }, { _id: false }),
    default: undefined,
  },
  vehicleSkipped: { type: Boolean, default: false },   // chose "skip" on the first-login car question
  role: { type: String, enum: ["user", "admin"], default: "user" },
  favorites: { type: [Number], default: [] },
  createdAt: { type: Date, default: Date.now },
});

const BookingSchema = new Schema({
  code: { type: String, unique: true },
  userId: { type: String, index: true },
  stationId: Number, station: String,
  kind: { type: String, enum: ["parking", "ev"] },
  detail: String, chargerIdx: Number, hours: Number, total: Number,
  status: { type: String, enum: ["active", "completed", "cancelled"], default: "active" },
  at: { type: Date, default: Date.now },
  endsAt: Date,
  checkedInAt: Date,
  synthetic: Boolean,   // demo history for the forecast chart; never counted in stats
});
BookingSchema.index({ status: 1, endsAt: 1 });

const MessageSchema = new Schema({ name: String, email: String, message: String, at: { type: Date, default: Date.now } });

const ReviewSchema = new Schema({
  stationId: { type: Number, index: true }, userId: String,
  rating: { type: Number, min: 1, max: 5 }, comment: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now }, updatedAt: { type: Date, default: Date.now },
});
ReviewSchema.index({ stationId: 1, userId: 1 }, { unique: true });

// broken / wrong go to the admin queue ("open"). busy / worked are information only ("info").
const ReportSchema = new Schema({
  stationId: { type: Number, index: true }, userId: String,
  type: { type: String, enum: ["broken", "busy", "worked", "wrong"] },
  note: { type: String, default: "" },
  status: { type: String, enum: ["open", "info", "resolved", "dismissed"], default: "open" },
  createdAt: { type: Date, default: Date.now }, resolvedAt: Date, resolvedBy: String,
});
ReportSchema.index({ stationId: 1, type: 1, createdAt: -1 });

const m = (name, schema) => mongoose.models[name] || mongoose.model(name, schema);
const MetaSchema = new Schema({ key: { type: String, unique: true }, value: Schema.Types.Mixed });
export const Meta = m("Meta", MetaSchema);
export const Station = m("Station", StationSchema);
export const User = m("User", UserSchema);
export const Booking = m("Booking", BookingSchema);
export const Message = m("Message", MessageSchema);
export const Review = m("Review", ReviewSchema);
export const Report = m("Report", ReportSchema);
