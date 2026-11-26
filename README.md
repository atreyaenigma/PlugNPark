# PlugNPark

Smart parking and EV charging finder. Next.js 14 (React frontend, API routes on Node.js).

## Run
    npm install
    npm run dev
Open http://localhost:3000. Needs internet for Google Fonts and map tiles.
Optional: copy .env.example to .env.local and set SESSION_SECRET to a long random string.

## Pages
- /            home with the interactive parking lot
- /find        live map, filters, favourites, quick booking
- /station/:id full station details, directions, booking
- /login, /signup
- /dashboard   active bookings (cancel), history, saved stations, CO2 estimate (login required)
- /about, /contact, and a custom 404

## API
auth: /api/auth/{signup,login,logout,me}  stations: /api/stations, /api/stations/:id
bookings: /api/bookings (GET, POST), /api/bookings/:code (DELETE)  favorites: /api/favorites  contact: /api/contact  stats: /api/stats

## Database (MongoDB)
1. Make sure MongoDB is running. In Compass, connect to `mongodb://localhost:27017`.
2. Copy `.env.example` to `.env.local` (already done if the file exists) and check `MONGODB_URI`.
3. `npm run dev`. The `plugnpark` database and the 7 demo stations are created automatically on first run.

Collections: stations, users, bookings, messages. To reset the stations, delete the `stations` collection in Compass and reload.
To use MongoDB Atlas, put its `mongodb+srv://...` string in `MONGODB_URI`.
Slots are taken with atomic updates (no double booking) and are released when a booking ends or is cancelled.
Passwords are hashed with scrypt and sessions use signed httpOnly cookies.

## Admin panel
Open /admin (log in first). To become an admin, put your account email in `.env.local`:

    ADMIN_EMAILS=you@example.com

Restart `npm run dev` and log in with that email. An "Admin" link appears in the menu.
Alternative: in Compass, open the `users` collection and set your user's `role` to `admin`.
From the panel you can add, edit and delete stations (click the map to place them), see totals, and cancel any booking.

## Real chargers and live data (no hardware)
- **Import real chargers:** Admin panel > "Real chargers from Open Charge Map". Needs `OCM_API_KEY` in `.env.local`
  (free: openchargemap.org > My Profile > My Apps). Imported stations are "Not live": location, connectors and directions only, no booking.
- **Make live:** click "Make live" on an imported station to manage it here (bookings and live counts).
- **Operator updates:** the - / + buttons in the admin station list mark a bay or charger taken or free. Visitors see it within a few seconds.
- **Demo traffic:** "Start demo traffic" makes live stations change by themselves. The site labels this "Simulated". Keep the admin tab open.
- Imported data is crowd-sourced and © Open Charge Map contributors (CC BY 4.0). It can be incomplete or out of date.

## Map tiles
CARTO now requires a free key for its dark tiles (otherwise tiles say "API KEY REQUIRED"). The project uses OpenStreetMap tiles (darkened) with no key.
For the native dark style, get a free key at carto.com/basemaps/apikey and set `NEXT_PUBLIC_CARTO_KEY` in `.env.local`, then restart.
OpenStreetMap's public tile server is fine for development and demos; for a busy public site use a provider with a key.

## Place search on the map
Type any city or area on the Find page, press "Find place", and pick a result. The map flies there and lists stations within 50 km.
The first time someone searches an area, the site fetches real chargers around it from Open Charge Map (needs `OCM_API_KEY`), once per area per week.
Place search uses the public OpenStreetMap Nominatim service through `/api/geocode` (identifying User-Agent, 1 request per second, cached, search-on-submit only).
Set `GEOCODE_CONTACT` in `.env.local` to your email so the app identifies itself properly. For a busy public site, use a paid geocoder instead.

## Trip planner (/trip)
Pick a start, destination and car. The server gets the road route from OSRM (public demo server: 1 request per second, non-commercial; set `OSRM_URL` to use your own),
loads real chargers along the road from Open Charge Map (once per 40 km stretch per week, up to 12 stretches per trip), then plans stops with `src/lib/trip.js`.
Rules: never end a leg below your reserve battery, charge only as much as needed (up to 80%), count the detour to each charger, and prefer fast chargers that are free now.
Car figures in `src/lib/vehicles.js` are approximate. The planner is a pure function, so it is easy to test.

## Reviews, reports and the forecast chart
- **Reviews:** 1 to 5 stars and an optional comment, one per driver per station (posting again edits it). Names show as "Asha K.", never emails.
- **Reports:** "It worked", "Broken or out of service", "Busy or blocked", "Wrong information". Broken and wrong-info go to the admin queue; the other two are information only.
  A station shows "Reported broken" when someone reported it in the last 72 hours and nobody has since said it worked. This gives imported (not live) chargers a community signal.
  The trip planner avoids stations reported broken when it has an alternative.
- **Forecast ("When is it busy?"):** shows booking demand by day and hour, relative to the busiest hour. With no bookings it shows a typical city pattern and says so;
  with 1 to 29 bookings it blends data and pattern; from 30 bookings it shows only what was measured. It shows "often full" only when slots were really full.
  Set `APP_TIMEZONE` (default Asia/Kolkata) for the right hours.
- **Demo history:** Admin panel > "Forecast demo history" creates flagged past bookings so the chart has data during a presentation. The chart labels it as demo and no statistics count it.

## Car profile and compatibility
- The first time a driver is logged in (and has no saved car), a dialog asks what they drive: pick a model or enter their own battery, range, charging power and plugs. They can skip; it is not asked again.
- **My car** (/profile) changes or removes it any time.
- Find page: "Fits your car" / "Fits, slow charging" / "Won't fit your car" on every station, a "Hide chargers that won't fit" filter, and dimmed pins on the map.
- Station page: each charger listed with what the car would really get (limited by the car's own maximum) and about how long 20% to 80% takes. Booking an incompatible charger shows a warning.
- The trip planner starts with the saved car.
- Presets use approximate figures from `src/lib/vehicles.js`. A preset always uses its own figures; "another car" uses what the driver enters.

## "Best match" ranking (Find page)
Each station is scored 0 to 100 and the list is sorted best first. Open "Why this ranking?" on any card for the breakdown.
- Charging: distance 30%, free now 22%, charging speed on your car 20%, price 13%, rating 10%, driver reports 5%.
- Parking: distance 35%, free now 25%, price 20%, rating 15%, driver reports 5%.
- Distance is left out when we do not know where you are. Price is compared with the other stations shown. Ratings are smoothed, so one 5-star review does not beat 4.6 from 40.
- Safety rules: reported broken x0.4; a charger your car cannot use x0.15; nothing free right now x0.6; a station that is not live scores low on availability.
- Other sorts: Nearest, Cheapest (pick EV or Parking first), Fastest charging (pick EV first), Top rated.
- The order stays still while a card is open. The weights live in `src/lib/rank.js`.

## Look and feel (white theme and picture hero)
- The whole site uses a white theme. Every colour comes from the variables at the top of `src/app/globals.css`
  (`--asphalt` page, `--asphalt2` panels, `--paint` text, `--charge` text-safe green, `--charge-fill` button green, and so on).
  Text colours were checked against WCAG AA contrast with axe-core on every page.
- The homepage picture is `public/images/hero-1600.(jpg|webp)` and `hero-960.(jpg|webp)`. The picture sits on the bottom layer
  (`z-index: -1`); the white card with the headline sits above it (`z-index: 1`). Both live in `.herox-*` rules at the end of `globals.css`
  and in `src/app/page.js`.
- The picture has a sign painted into it. The white card is placed exactly over that sign so only our own text shows.
  If you replace the picture with one that has no sign, move or restyle `.herox-card` (its `left/top/width/height` percentages).
- Below 900px wide the headline moves under the picture and a small brand card covers the sign.
- Map tiles use OpenStreetMap (light). With a free CARTO key in `NEXT_PUBLIC_CARTO_KEY` they use CARTO's light style.
