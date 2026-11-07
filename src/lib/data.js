// Demo data held in memory. Replace with MongoDB/PostgreSQL later (see README).
export const stations = [
  { id: 1, name: "Rajpur Road Hub", area: "Rajpur Road", lat: 30.3398, lng: 78.0634, parkFree: 14, parkTotal: 40, parkRate: 30, kwhRate: 18, chargers: [{ kind: "CCS", kw: 60, free: 2, total: 3 }, { kind: "Type 2", kw: 22, free: 1, total: 2 }] },
  { id: 2, name: "Clock Tower Parking", area: "Ghantaghar", lat: 30.3244, lng: 78.0418, parkFree: 6, parkTotal: 25, parkRate: 40, kwhRate: 0, chargers: [] },
  { id: 3, name: "ISBT Fast Charge", area: "ISBT", lat: 30.2875, lng: 78.0495, parkFree: 0, parkTotal: 0, parkRate: 0, kwhRate: 22, chargers: [{ kind: "CCS", kw: 120, free: 3, total: 4 }, { kind: "CHAdeMO", kw: 50, free: 0, total: 1 }] },
  { id: 4, name: "Mall Road Smart Lot", area: "Mussoorie Rd", lat: 30.3169, lng: 78.0322, parkFree: 22, parkTotal: 60, parkRate: 35, kwhRate: 14, chargers: [{ kind: "Type 2", kw: 22, free: 4, total: 6 }] },
  { id: 5, name: "Paltan Bazaar Garage", area: "Paltan Bazaar", lat: 30.3207, lng: 78.0391, parkFree: 3, parkTotal: 30, parkRate: 25, kwhRate: 0, chargers: [] },
  { id: 6, name: "Green Valley Chargers", area: "Sahastradhara Rd", lat: 30.3589, lng: 78.0912, parkFree: 0, parkTotal: 0, parkRate: 0, kwhRate: 16, chargers: [{ kind: "CCS", kw: 30, free: 2, total: 2 }] },
  { id: 7, name: "Riverside Plug Point", area: "Rispana", lat: 30.3011, lng: 78.0276, parkFree: 9, parkTotal: 20, parkRate: 20, kwhRate: 12, chargers: [{ kind: "Type 2", kw: 11, free: 0, total: 2 }] },
];

const g = globalThis;
if (!g.__pnpBookings) g.__pnpBookings = [];
export const bookings = g.__pnpBookings;
