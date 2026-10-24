# DriverDost — Lean MVP (College Demo + Pilot-Ready Core)

**Your Car. Our Driver. Your Convenience.**
On-demand verified drivers for your own car — Bengaluru pilot. "Uber, but you bring the car."

## What's in this zip
```
driverdost-mvp/
  server/            Zero-dependency Node.js API (runs instantly, no npm install)
    src/index.js     REST API + serves the web apps
    src/store.js     In-memory store seeded with 6 verified Bengaluru drivers
    src/matching.js  Matching score: 0.45 proximity + 0.25 reliability + 0.20 availability + 0.10 rating
    src/pricing.js   Tiered Rs149/139/129 per hr by duration, 20% platform / 80% driver
  apps/
    customer-web/    Customer website + booking flow (served at /)
    admin/           Admin dashboard (served at /admin)
    driver-app/      React Native (Expo) driver app + web preview at /driver
    customer-app/    React Native (Expo) customer app screens
  database/
    schema.sql       PostgreSQL schema (13 tables) for the production build
    schema.prisma    Prisma version of the same schema
  docs/
    SETUP.md         Run, test, and go-live checklist
    API.md           All endpoints with examples
  docker-compose.yml Postgres + API for the production path
  .env.example
```

## Run it in 10 seconds (demo mode)
```bash
cd driverdost-mvp
node server/src/index.js
# Open http://localhost:4000        -> Customer website
# Open http://localhost:4000/driver -> Driver app (web preview)
# Open http://localhost:4000/admin  -> Admin dashboard
```
No dependencies to install. Node 18+ is enough.

Try the flow: Book a driver (Customer) -> Accept it (Driver) -> Watch revenue update (Admin).

## Pricing model
Market-match pricing (changed 2026-10-23 from Rs 300/hr, after DriveU comparison): 1-3 hrs Rs 149/hr, 4-7 hrs Rs 139/hr, 8+ hrs Rs 129/hr. Platform keeps 20%, driver gets 80%. Night charge +Rs 200 for trips ending 10PM-6AM.
Example: 3 hrs = Rs 447 total = Rs 358 driver + Rs 89 platform. This is gross commission,
before payment gateway, support, verification, insurance and marketing costs.

## Production path (from the Blueprint PDF)
- Frontend apps: React Native (this repo's screens) + Next.js
- Backend: NestJS (the API contract in docs/API.md maps 1:1)
- Database: PostgreSQL using database/schema.sql
- Payments: Razorpay / UPI, Maps: Google Maps Platform, Push: FCM
- Before paid launch: legal advice, motor insurance confirmation for hired-driver use,
  driver police/licence verification, and incident/SOS operations process.

## Safety note
DriverDost is a working name, not a verified trademark. Pricing and competitor
details are planning illustrations — verify before commercial launch.
