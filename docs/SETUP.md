# Setup

## Demo (fastest)
1. Install Node 18+
2. `node server/src/index.js`
3. Open /, /driver, /admin on http://localhost:4000

## Test the flow with curl
```bash
curl localhost:4000/api/health
curl -X POST localhost:4000/api/bookings -H 'Content-Type: application/json' \
  -d '{"customerName":"Test","pickup":"Indiranagar, Bengaluru","hours":3,"transmission":"Manual"}'
curl -X POST localhost:4000/api/bookings/1/complete
curl localhost:4000/api/admin/stats
```

## Mobile apps (Expo)
The React Native code is in apps/customer-app/App.js and apps/driver-app/App.js.
Create an Expo project, copy the file in, point API_URL at your server, run `npx expo start`.

## Go-live checklist (do NOT skip)
- [ ] Legal advice on aggregator / transport rules for your state
- [ ] Insurer confirms hired-driver cover for customer cars
- [ ] Driver police verification + licence validation + driving test
- [ ] Razorpay/UPI payments, refunds and reconciliation
- [ ] SOS / incident operations with a real support team
- [ ] Privacy: encrypt ID documents, set retention, restrict admin access
