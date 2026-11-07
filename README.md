# PlugNPark

Smart parking and EV charging finder. Next.js 14 (React frontend, API routes on Node.js).

## Run
    npm install
    npm run dev
Open http://localhost:3000 (needs internet for Google Fonts and map tiles).

## What is inside
- Loading screen: a car parks, the bay is painted, the cable connects, a battery counter hits 100 (src/components/Loader.jsx)
- Home: an interactive parking lot you can park in, steps, live numbers
- /find: real map (Leaflet with dark OpenStreetMap tiles), filters, availability bars, reservation with a pass
- API: /api/stations, /api/bookings, /api/stats

## Next steps
- Replace src/lib/data.js with MongoDB (Mongoose) or PostgreSQL (Prisma)
- Add login with NextAuth.js and a bookings dashboard
- Swap the pseudo-QR for a real QR library
- Use the browser location API to sort stations by distance
