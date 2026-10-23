# DriverDost API

Base: http://localhost:4000

- GET  /api/health
- GET  /api/pricing?hours=3 -> tiered: 1-3h Rs149/hr, 4-7h Rs139/hr, 8+h Rs129/hr, 20% commission. 3h = { total: 447, driverEarnings: 358, platformCommission: 89 }
- GET  /api/drivers
- GET  /api/bookings
- POST /api/bookings  { customerName, pickup, destination, serviceType, transmission, hours }
- POST /api/bookings/:id/accept | arrived | start | complete | cancel
- POST /api/bookings/:id/rate  { rating, review }
- GET  /api/drivers  (ID-verified & approved drivers only, full details for customers, ID numbers masked e.g. ****4821)
- POST /api/drivers/apply  { name, phone, govtIdType (Aadhaar|Driving Licence|PAN), govtIdNumber, licenceNumber, experienceYears, languages, transmissions } -> status "Pending ID Verification". Driver is NOT visible to customers yet.
- GET  /api/admin/applications  (admin token required)
- POST /api/admin/applications/:id/verify  (admin token) -> verifies ID and CREATES the driver (profileId DMxxxx, idVerified=true) — this is the only way a driver gets added
- POST /api/admin/applications/:id/reject  (admin token) -> status Rejected, no driver created
- POST /api/incidents  { bookingId, incidentType, description }
- GET  /api/admin/status
- POST /api/admin/register  { name, username, phone, password }  (first-time setup only, blocked afterwards, returns { token, admin })
- POST /api/admin/login     { identifier, password }  identifier = username OR phone (+91 formats ok), returns { token, admin }
- POST /api/admin/logout    (Authorization: Bearer <token>)
- POST /api/admin/update    { name, username, phone, password }  (requires token)
- GET  /api/admin/stats     (requires admin token once an admin account exists)

Booking statuses: SEARCHING_FOR_DRIVER -> DRIVER_ASSIGNED -> DRIVER_ARRIVED -> TRIP_STARTED -> TRIP_COMPLETED | CANCELLED
