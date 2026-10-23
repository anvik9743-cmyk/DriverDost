# 🚗 DriverDost

> **Your Car. Our Driver. Your Convenience.**
>
> On-demand, ID-verified drivers for **your own car** — book by the hour in Bengaluru.
> Think *"Uber, but you bring the car."*

![Pilot](https://img.shields.io/badge/Pilot-Bengaluru-orange)
![Pricing](https://img.shields.io/badge/From-%E2%82%B9129%2Fhr-green)
![Node](https://img.shields.io/badge/Node-18%2B-brightgreen)
![Dependencies](https://img.shields.io/badge/Dependencies-Zero-blue)

---

## 📖 About

DriverDost connects car owners with professional, verified drivers on demand. Instead of hiring a full-time driver or struggling with parking and traffic, you book a driver for a few hours — airport runs, weddings, family trips, full days, nights out — and travel in the comfort of your own car.

**The core problem we solve is trust.** A stranger drives *your* car, so every DriverDost driver is onboarded only after government ID verification, licence checks and admin approval — and customers always see exactly who is coming.

---

## ✨ Features

### 👤 Customer App & Website
- Book a driver by the hour (hourly, airport, full-day, wedding & family trips)
- Transparent pricing shown **before** you book — no hidden charges
- Full driver profile before the trip: photo ID reference (masked), rating, trips completed, experience, languages, car types handled
- Vehicle inspection checklist at trip start, live trip flow, SOS button, trip rating

### 🚘 Driver App
- Apply with government ID (Aadhaar / Driving Licence / PAN) + licence number
- Go online/offline, accept trips, guided flow: **Accept → Arrived → Start → Complete**
- Earnings dashboard with the 80/20 split shown per trip

### 🛠️ Admin Dashboard
- Login-protected (username **or** phone number + password — no default password, the admin creates their own)
- **Driver verification queue:** review ID applications → *Verify ID & Approve* or *Reject*
- Live totals: bookings, GMV, platform revenue, incidents (SOS) and resolution

---

## 💰 Pricing

Simple tiered pricing — the longer the trip, the cheaper the hour. **Platform keeps 20%, the driver earns 80%.**

| Duration | Price / hour | Example total | Driver earns | Platform earns |
|----------|-------------|---------------|--------------|----------------|
| 1–3 hrs  | ₹149/hr     | 3 hrs = ₹447  | ₹358         | ₹89            |
| 4–7 hrs  | ₹139/hr     | 5 hrs = ₹695  | ₹556         | ₹139           |
| 8+ hrs   | ₹129/hr     | 8 hrs = ₹1,032 | ₹826        | ₹206           |

- 🌙 **Night charge:** +₹200 for trips ending between 10 PM and 6 AM
- Totals above are gross commission, before payment gateway, support, verification, insurance and marketing costs

---

## 🧠 How Driver Matching Works

Every booking is scored against available verified drivers:

| Factor | Weight | Why |
|--------|--------|-----|
| Proximity to pickup | 45% | Faster arrival |
| Reliability score | 25% | On-time, completed-trip history |
| Availability | 20% | Online and free for the full duration |
| Customer rating | 10% | Quality signal |

**Match score = 0.45 × proximity + 0.25 × reliability + 0.20 × availability + 0.10 × rating**

---

## 🛡️ Driver Verification Flow

```
Driver applies (Govt ID + licence number)
        ↓
Status: "Pending ID Verification" — invisible to customers, cannot be booked
        ↓
Admin reviews the ID in the dashboard
        ↓
 ✅ Verify ID & Approve  → driver becomes bookable, gets a DriverDost profile ID
 ❌ Reject               → application closed, driver never appears to customers
```

Customers only ever see a **masked** ID reference (e.g. `Aadhaar ****4821`) with an *ID Verified* badge — full ID numbers are never shown.

---

## 🗂️ Project Structure

```
driverdost-mvp/
├── server/                  Zero-dependency Node.js API (no npm install needed)
│   └── src/
│       ├── index.js         REST API + serves all three web apps
│       ├── auth.js          Admin accounts (scrypt-hashed passwords, sessions)
│       ├── store.js         In-memory store, seeded with 6 verified Bengaluru drivers
│       ├── matching.js      Driver matching score (formula above)
│       └── pricing.js       Tiered pricing, night charge, 80/20 split
├── apps/
│   ├── customer-web/        Customer website + booking flow      → served at /
│   ├── driver-app/          Expo driver app + web preview        → served at /driver
│   ├── customer-app/        Expo customer app screens
│   └── admin/               Admin dashboard (login-gated)        → served at /admin
├── database/
│   ├── schema.sql           PostgreSQL schema — 13 tables (production)
│   └── schema.prisma        Prisma version of the same schema
├── docs/
│   ├── SETUP.md             Run, test and go-live checklist
│   └── API.md               Every endpoint, with examples
├── docker-compose.yml       Postgres + API for the production path
└── .env.example
```

---

## 🚀 Quick Start

**Prerequisite:** Node.js 18+ — nothing else. No `npm install`, no build step.

```bash
node server/src/index.js
```

| App | URL |
|-----|-----|
| Customer website | http://localhost:4000/ |
| Driver app (web preview) | http://localhost:4000/driver |
| Admin dashboard | http://localhost:4000/admin |

**Try the full flow in 2 minutes:**
1. **Customer** — book a driver for 3 hrs → you'll pay ₹447
2. **Driver** — accept the trip → Arrived → Start → Complete
3. **Admin** — create your admin account on first visit, then watch revenue update to ₹89

---

## 🔌 API Overview

Full reference: [docs/API.md](docs/API.md). A few key endpoints:

| Method | Endpoint | What it does |
|--------|----------|--------------|
| `GET` | `/api/health` | Service + city status |
| `GET` | `/api/pricing?hours=3` | Price quote with driver/platform split |
| `GET` | `/api/drivers` | Only approved, ID-verified drivers |
| `POST` | `/api/bookings` | Create a booking (auto-matches best driver) |
| `POST` | `/api/drivers/apply` | Driver application — government ID required |
| `POST` | `/api/admin/applications/:id/verify` | Admin: verify ID & make driver bookable |

---

## 🧱 Tech Stack

| Layer | This MVP | Production path |
|-------|----------|-----------------|
| Customer / Driver apps | Web + React Native (Expo) screens | React Native + Next.js |
| Backend | Zero-dependency Node.js | NestJS (same API contract) |
| Database | In-memory store (demo) | PostgreSQL — `database/schema.sql` |
| Payments | Simulated | Razorpay / UPI |
| Maps | Simulated distance/ETA | Google Maps Platform |
| Auth | scrypt-hashed admin accounts | + OTP for customers & drivers |

---

## 🗺️ Roadmap

- [x] Customer booking flow with live price quotes
- [x] Driver app trip flow & earnings
- [x] Admin login, dashboard & revenue tracking
- [x] Driver ID verification & approval queue
- [x] Market-matched tiered pricing
- [ ] PostgreSQL persistence (schema ready in `database/`)
- [ ] Real payments (Razorpay / UPI)
- [ ] Live GPS tracking & maps
- [ ] Public launch hosting for the Bengaluru pilot

---

## ⚠️ Disclaimer

DriverDost is a working brand name, not yet a verified trademark. Pricing and competitor references are planning illustrations — verify before commercial launch. Before a paid launch: obtain legal advice, confirm motor insurance covers hired-driver use, complete driver police/licence verification processes, and set up an incident/SOS operations process.

## 📬 Contact

Built by **CH Bhaskar** — Founder, DriverDost · Bengaluru, India
GitHub: [@anvik9743-cmyk](https://github.com/anvik9743-cmyk)
