/**
 * DriverDost Lean MVP API — zero-dependency Node.js server.
 * Run: node server/src/index.js  (PORT env, default 4000)
 * Serves: / customer web, /driver chauffeur app, /driver/login driver login, /admin admin command center
 */
const http = require('http'), fs = require('fs'), path = require('path');
const store = require('./store');
const { quote } = require('./pricing');
const { matchDrivers } = require('./matching');
const auth = require('./auth');

const PORT = process.env.PORT || 4000;
const ROOT = path.join(__dirname, '..', '..');
const MIME = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json' };

function json(res, code, data) { res.writeHead(code, {'Content-Type':'application/json'}); res.end(JSON.stringify(data)); }
function body(req) { return new Promise(r => { let d=''; req.on('data',c=>d+=c); req.on('end',()=>{ try{r(JSON.parse(d||'{}'))}catch{r({})} }); }); }
function serveFile(res, file) {
  fs.readFile(file, (e, data) => { if (e) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, {'Content-Type': MIME[path.extname(file)] || 'text/plain'}); res.end(data); });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const p = url.pathname;

  // ---- API ----
  if (p === '/api/health') return json(res, 200, { ok: true, service: 'DriverDost MVP', city: 'Bengaluru' });
  if (p === '/api/pricing') return json(res, 200, quote(url.searchParams.get('hours') || 3));
  if (p === '/api/drivers' && req.method === 'GET')
    return json(res, 200, store.drivers.filter(d => d.approved && d.idVerified));

  // ---- LIVE GPS TELEMETRY & TRACKING ----
  if (p === '/api/location/telemetry' && req.method === 'GET') {
    return json(res, 200, { telemetry: store.liveTelemetry, timestamp: Date.now() });
  }

  if (p === '/api/location/update' && req.method === 'POST') {
    const b = await body(req);
    if (b.role === 'driver' && b.id) {
      store.liveTelemetry[b.id] = {
        lat: Number(b.lat),
        lng: Number(b.lng),
        heading: Number(b.heading || 0),
        speed: Number(b.speed || 0),
        status: b.status || 'ONLINE',
        updatedAt: new Date().toISOString()
      };
      const drv = store.drivers.find(d => d.id === Number(b.id));
      if (drv) {
        drv.location = { lat: Number(b.lat), lng: Number(b.lng), address: b.address || drv.location?.address };
      }
    }
    return json(res, 200, { ok: true, receivedAt: new Date().toISOString() });
  }

  // ---- BOOKINGS ----
  if (p === '/api/bookings' && req.method === 'GET') return json(res, 200, store.bookings);
  if (p === '/api/bookings' && req.method === 'POST') {
    const b = await body(req);
    if (!b.pickup || !b.hours) return json(res, 400, { error: 'pickup and hours are required' });
    
    // Generate secure 4-digit start OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const pickupCoords = b.pickupCoords || { lat: 12.9716, lng: 77.6412 }; // Default to Bengaluru city / Indiranagar
    const destCoords = b.destCoords || { lat: 13.1986, lng: 77.7066 }; // Default BLR Airport

    const booking = {
      id: store.nextId.booking++,
      customerName: b.customerName || 'Customer',
      customerPhone: b.customerPhone || '9876543210',
      pickup: b.pickup,
      destination: b.destination || 'Kempegowda International Airport (BLR)',
      pickupCoords,
      destCoords,
      serviceType: b.serviceType || 'Hourly',
      hours: Number(b.hours),
      transmission: b.transmission || 'Manual',
      status: 'SEARCHING_FOR_DRIVER',
      otp,
      sos: false,
      ...quote(b.hours, b.night),
      createdAt: new Date().toISOString(),
      driverId: null
    };

    const matches = matchDrivers(store.drivers, booking);
    booking.matches = matches.map(m => ({ driverId: m.driverId, score: m.score, breakdown: m.breakdown }));
    if (matches.length) {
      booking.driverId = matches[0].driverId;
      booking.status = 'DRIVER_ASSIGNED';
    }
    store.bookings.push(booking);
    return json(res, 201, booking);
  }

  // Single booking status & live tracking endpoint
  const singleBm = p.match(/^\/api\/bookings\/(\d+)$/);
  if (singleBm && req.method === 'GET') {
    const booking = store.bookings.find(x => x.id === Number(singleBm[1]));
    if (!booking) return json(res, 404, { error: 'booking not found' });
    const driver = store.drivers.find(d => d.id === booking.driverId) || null;
    return json(res, 200, { booking, driver, telemetry: store.liveTelemetry[booking.driverId] || null });
  }

  // Booking lifecycle actions: accept, reject, arriving, arrived, start, complete, cancel
  const bm = p.match(/^\/api\/bookings\/(\d+)\/(accept|reject|arriving|arrived|start|complete|cancel)$/);
  if (bm && req.method === 'POST') {
    const booking = store.bookings.find(x => x.id === Number(bm[1]));
    if (!booking) return json(res, 404, { error: 'booking not found' });
    const action = bm[2];

    if (action === 'reject') {
      booking.rejectedBy = booking.rejectedBy || [];
      if (booking.driverId) booking.rejectedBy.push(booking.driverId);
      // Auto-reassign to next best available verified driver
      const nextDriver = store.drivers.find(d => d.approved && d.online && !booking.rejectedBy.includes(d.id));
      if (nextDriver) {
        booking.driverId = nextDriver.id;
        booking.status = 'DRIVER_ASSIGNED';
      } else {
        booking.driverId = null;
        booking.status = 'SEARCHING_FOR_DRIVER';
      }
      return json(res, 200, { success: true, message: 'Trip declined. Auto-reassigned.', booking });
    }

    const flow = {
      accept: 'DRIVER_ASSIGNED',
      arriving: 'DRIVER_ARRIVING',
      arrived: 'DRIVER_ARRIVED',
      start: 'TRIP_STARTED',
      complete: 'TRIP_COMPLETED',
      cancel: 'CANCELLED'
    };
    booking.status = flow[action];
    return json(res, 200, { success: true, booking });
  }

  // Start Trip OTP Verification
  const otpm = p.match(/^\/api\/bookings\/(\d+)\/verify-otp$/);
  if (otpm && req.method === 'POST') {
    const b = await body(req);
    const booking = store.bookings.find(x => x.id === Number(otpm[1]));
    if (!booking) return json(res, 404, { error: 'booking not found' });
    if (String(b.otp).trim() === String(booking.otp).trim()) {
      booking.status = 'TRIP_STARTED';
      return json(res, 200, { success: true, message: 'OTP verified. Trip started successfully.', booking });
    }
    return json(res, 400, { success: false, error: 'Incorrect OTP. Ask the customer for the 4-digit code.' });
  }

  // Digital Vehicle Inspection (Pre-trip / Post-trip)
  const inspm = p.match(/^\/api\/bookings\/(\d+)\/inspect$/);
  if (inspm && req.method === 'POST') {
    const b = await body(req);
    const booking = store.bookings.find(x => x.id === Number(inspm[1]));
    if (!booking) return json(res, 404, { error: 'booking not found' });
    booking.inspection = {
      odometerKm: Number(b.odometerKm) || 0,
      fuelLevelPercent: Number(b.fuelLevelPercent) || 100,
      existingScratches: b.existingScratches || 'None reported',
      photosCount: Number(b.photosCount) || 4,
      verifiedByDriver: true,
      timestamp: new Date().toISOString()
    };
    booking.status = 'INSPECTION_COMPLETED';
    return json(res, 200, { success: true, message: 'Digital vehicle inspection logged.', inspection: booking.inspection, booking });
  }

  // Driver Duty Status Toggle (Online/Offline)
  const drvStatusm = p.match(/^\/api\/drivers\/(\d+)\/status$/);
  if (drvStatusm && req.method === 'POST') {
    const b = await body(req);
    const drv = store.drivers.find(x => x.id === Number(drvStatusm[1]));
    if (!drv) return json(res, 404, { error: 'driver not found' });
    drv.online = b.online !== undefined ? !!b.online : !drv.online;
    if (store.liveTelemetry[drv.id]) {
      store.liveTelemetry[drv.id].status = drv.online ? 'ONLINE' : 'OFFLINE';
      store.liveTelemetry[drv.id].updatedAt = new Date().toISOString();
    }
    return json(res, 200, { success: true, driverId: drv.id, online: drv.online });
  }

  // Emergency SOS Trigger
  const sosMatch = p.match(/^\/api\/bookings\/(\d+)\/sos$/);
  if (sosMatch && req.method === 'POST') {
    const b = await body(req);
    const booking = store.bookings.find(x => x.id === Number(sosMatch[1]));
    if (!booking) return json(res, 404, { error: 'booking not found' });
    
    booking.sos = true;
    const inc = {
      id: store.nextId.incident++,
      bookingId: booking.id,
      customerName: booking.customerName,
      driverId: booking.driverId,
      triggerBy: b.triggerBy || 'Customer',
      location: b.location || booking.pickupCoords,
      reason: b.reason || 'Panic Button / Emergency Assistance Requested',
      status: 'Open',
      createdAt: new Date().toISOString()
    };
    store.incidents.push(inc);
    return json(res, 201, { success: true, message: 'SOS alert received. Emergency protocols activated.', incident: inc });
  }

  const rm = p.match(/^\/api\/bookings\/(\d+)\/rate$/);
  if (rm && req.method === 'POST') {
    const b = await body(req); const booking = store.bookings.find(x => x.id === Number(rm[1]));
    if (!booking) return json(res, 404, { error: 'booking not found' });
    booking.rating = b.rating; booking.review = b.review || ''; return json(res, 200, booking);
  }

  // ---- Driver onboarding ----
  if (p === '/api/drivers/apply' && req.method === 'POST') {
    const b = await body(req);
    if (!b.name || !b.phone) return json(res, 400, { error: 'name and phone are required' });
    if (!b.govtIdType || !b.govtIdNumber) return json(res, 400, { error: 'Government ID type and number are required for verification' });
    if (!b.licenceNumber) return json(res, 400, { error: 'Driving licence number is required' });
    const mask = (v) => '****' + String(v).replace(/\s/g, '').slice(-4).toUpperCase();
    const app = { id: store.nextId.application++, name: b.name, phone: b.phone,
      experienceYears: Number(b.experienceYears) || 0, languages: b.languages || ['English'],
      transmissions: b.transmissions || ['Manual'],
      govtId: { type: b.govtIdType, masked: mask(b.govtIdNumber), verified: false },
      licenceMasked: mask(b.licenceNumber),
      status: 'Pending ID Verification', createdAt: new Date().toISOString() };
    store.applications.push(app); return json(res, 201, app);
  }
  if (p === '/api/admin/applications' && req.method === 'GET') {
    if (store.admins.length && !auth.adminFromToken(req)) return json(res, 401, { error: 'Admin login required' });
    return json(res, 200, store.applications);
  }
  const vm = p.match(/^\/api\/admin\/applications\/(\d+)\/(verify|reject)$/);
  if (vm && req.method === 'POST') {
    if (store.admins.length && !auth.adminFromToken(req)) return json(res, 401, { error: 'Admin login required' });
    const app = store.applications.find(a => a.id === Number(vm[1]));
    if (!app) return json(res, 404, { error: 'application not found' });
    if (app.status !== 'Pending ID Verification') return json(res, 400, { error: 'Application already ' + app.status });
    if (vm[2] === 'reject') { app.status = 'Rejected'; return json(res, 200, app); }
    app.status = 'ID Verified & Approved'; app.govtId.verified = true;
    const newId = Math.max(0, ...store.drivers.map(d => d.id)) + 1;
    const driver = {
      id: newId,
      profileId: 'DM' + (1000 + newId),
      name: app.name,
      photo: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&auto=format&fit=crop&q=80',
      avatarInitials: app.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(),
      experienceYears: app.experienceYears,
      languages: app.languages,
      rating: 5.0,
      trips: 0,
      reliabilityScore: 80,
      distanceKm: 3.0,
      online: true,
      approved: true,
      transmissions: app.transmissions,
      govtId: app.govtId,
      licenceMasked: app.licenceMasked,
      idVerified: true,
      location: { lat: 12.9716, lng: 77.5946, address: 'Bengaluru Central' },
      badges: ['Identity Verified', 'Licence Verified', 'Background Check Completed']
    };
    store.drivers.push(driver);
    store.liveTelemetry[newId] = { lat: 12.9716, lng: 77.5946, heading: 0, speed: 0, status: 'ONLINE', updatedAt: new Date().toISOString() };
    return json(res, 201, { application: app, driver });
  }
  if (p === '/api/incidents' && req.method === 'POST') {
    const b = await body(req);
    const inc = { id: store.nextId.incident++, ...b, status: 'Open', createdAt: new Date().toISOString() };
    store.incidents.push(inc); return json(res, 201, inc);
  }

  // ---- Chauffeur / Driver auth ----
  if (p === '/api/driver/login' && req.method === 'POST') {
    const b = await body(req);
    const s = await auth.loginDriver(b.identifier || b.phone || b.profileId, b.pin || b.password);
    if (s && s.rateLimited) return json(res, 429, { error: s.error });
    if (!s || s.error) return json(res, 401, { error: s?.error || 'Invalid driver credentials' });
    return json(res, 200, s);
  }

  if (p === '/api/driver/me' && req.method === 'GET') {
    const driver = auth.driverFromToken(req);
    if (!driver) return json(res, 401, { error: 'Chauffeur authentication required' });
    const activeBooking = store.bookings.find(b => 
      (b.driverId === driver.id) && !['TRIP_COMPLETED', 'CANCELLED'].includes(b.status)
    );
    return json(res, 200, { driver: auth.publicDriver(driver), activeBooking: activeBooking || null });
  }

  if (p === '/api/driver/logout' && req.method === 'POST') {
    const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
    if (token) store.driverSessions.delete(token);
    return json(res, 200, { ok: true, message: 'Logged out successfully' });
  }

  // ---- Admin auth ----
  if (p === '/api/admin/status' && req.method === 'GET')
    return json(res, 200, { hasAdmin: store.admins.length > 0, loggedIn: !!auth.adminFromToken(req) });
  if (p === '/api/admin/register' && req.method === 'POST') {
    if (store.admins.length) return json(res, 403, { error: 'Admin already exists. Log in instead.' });
    const b = await body(req);
    if (!b.username || !b.phone || !b.password) return json(res, 400, { error: 'username, phone and password are required' });
    if (String(b.password).length < 6) return json(res, 400, { error: 'Password must be at least 6 characters' });
    const admin = await auth.createAdmin(b);
    const s = await auth.login(b.username, b.password);
    return json(res, 201, { ...s, admin: auth.publicAdmin(admin) });
  }
  if (p === '/api/admin/login' && req.method === 'POST') {
    const b = await body(req);
    const s = await auth.login(b.identifier || b.username || b.phone, b.password);
    if (s && s.rateLimited) return json(res, 429, { error: s.error });
    if (!s) return json(res, 401, { error: 'Incorrect username/phone or password' });
    return json(res, 200, s);
  }
  if (p === '/api/admin/logout' && req.method === 'POST') {
    store.sessions.delete((req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim());
    return json(res, 200, { ok: true });
  }
  if (p === '/api/admin/update' && req.method === 'POST') {
    const admin = auth.adminFromToken(req);
    if (!admin) return json(res, 401, { error: 'Admin login required' });
    const b = await body(req);
    if (b.name) admin.name = b.name;
    if (b.username) admin.username = String(b.username).trim().toLowerCase();
    if (b.phone) admin.phone = auth.normalizePhone(b.phone);
    if (b.password) { const crypto = require('crypto'); admin.salt = crypto.randomBytes(16).toString('hex'); admin.passwordHash = await auth.hash(b.password, admin.salt); }
    return json(res, 200, { admin: auth.publicAdmin(admin) });
  }
  if (p === '/api/admin/stats' && req.method === 'GET') {
    if (store.admins.length && !auth.adminFromToken(req)) return json(res, 401, { error: 'Admin login required' });
    const done = store.bookings.filter(b => b.status === 'TRIP_COMPLETED');
    return json(res, 200, {
      totalBookings: store.bookings.length,
      activeBookings: store.bookings.filter(b => !['TRIP_COMPLETED','CANCELLED'].includes(b.status)).length,
      completedBookings: done.length,
      cancelledBookings: store.bookings.filter(b=>b.status==='CANCELLED').length,
      verifiedDrivers: store.drivers.filter(d=>d.approved).length,
      totalBookingValue: store.bookings.reduce((s,b)=>s+b.total,0),
      platformRevenue: done.reduce((s,b)=>s+b.platformCommission,0),
      pendingVerifications: store.applications.filter(a=>a.status==='Pending ID Verification').length,
      openIncidents: store.incidents.filter(i=>i.status==='Open').length
    });
  }
  if (p.startsWith('/api/')) return json(res, 404, { error: 'not found' });

  // ---- Static web apps ----
  if (p === '/' || p === '/portal' || p === '/customer') return serveFile(res, path.join(ROOT, 'apps/customer-web/index.html'));
  if (p === '/driver') return serveFile(res, path.join(ROOT, 'apps/driver-app/index.html'));
  if (p === '/driver/login' || p === '/driver-login') return serveFile(res, path.join(ROOT, 'apps/driver-login/index.html'));
  if (p === '/admin') return serveFile(res, path.join(ROOT, 'apps/admin/index.html'));
  if (p === '/analysis' || p === '/code-analysis') return serveFile(res, path.join(ROOT, 'apps/driver-login/index.html'));
  
  const staticFile = path.join(ROOT, p.replace(/^\//,''));
  if (staticFile.startsWith(ROOT) && fs.existsSync(staticFile)) return serveFile(res, staticFile);
  res.writeHead(404); res.end('Not found');
});

server.listen(PORT, () => console.log(`DriverDost MVP running at http://localhost:${PORT}  (/ customer, /driver, /driver/login, /admin)`));

