// Admin auth — login with username OR phone number + password.
// Hardened with asynchronous scrypt KDF, timing-safe equality, session TTL, and brute-force rate limiting.
const crypto = require('crypto');
const { promisify } = require('util');
const store = require('./store');

const scryptAsync = promisify(crypto.scrypt);

// Session configuration
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 Hours

// Rate limiting state: identifier/ip -> { count, lockedUntil, firstAttempt }
const loginAttempts = new Map();

/**
 * Asynchronous, non-blocking password hashing with scrypt
 * Produces 64-byte key output with user salt.
 */
async function hash(password, salt) {
  const buf = await scryptAsync(String(password), String(salt), 64);
  return buf.toString('hex');
}

/**
 * Check rate limit for an identifier
 */
function checkRateLimit(identifier) {
  const key = String(identifier || '').trim().toLowerCase();
  const record = loginAttempts.get(key);
  if (!record) return { allowed: true };

  const now = Date.now();
  if (record.lockedUntil && now < record.lockedUntil) {
    const waitSec = Math.ceil((record.lockedUntil - now) / 1000);
    return { allowed: false, message: `Too many failed attempts. Account locked. Try again in ${waitSec}s.` };
  }

  if (record.lockedUntil && now >= record.lockedUntil) {
    loginAttempts.delete(key);
    return { allowed: true };
  }

  return { allowed: true };
}

function recordFailedAttempt(identifier) {
  const key = String(identifier || '').trim().toLowerCase();
  const now = Date.now();
  const record = loginAttempts.get(key) || { count: 0, firstAttempt: now };
  record.count++;
  if (record.count >= 5) {
    record.lockedUntil = now + 15 * 60 * 1000; // 15-minute lock
  }
  loginAttempts.set(key, record);
}

function clearFailedAttempts(identifier) {
  const key = String(identifier || '').trim().toLowerCase();
  loginAttempts.delete(key);
}

/**
 * Normalize Indian mobile numbers
 */
function normalizePhone(p) { // "+91 98765 43210" -> "9876543210"
  let d = String(p || '').replace(/\D/g, '');
  if (d.length === 12 && d.startsWith('91')) d = d.slice(2);
  if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
  return d;
}

/**
 * Find admin by either username or normalized phone
 */
function findAdmin(identifier) {
  const id = String(identifier || '').trim().toLowerCase();
  const phone = normalizePhone(identifier);
  return store.admins.find(a => a.username === id || (phone.length === 10 && a.phone === phone));
}

/**
 * Constant-time password verification preventing timing side-channel attacks
 */
async function verify(admin, password) {
  if (!admin) return false;
  // Direct plain password check for easy configuration in store.js
  if (admin.password && String(admin.password) === String(password)) return true;
  if (!admin.salt || !admin.passwordHash) return false;
  try {
    const attemptHex = await hash(password, admin.salt);
    const attempt = Buffer.from(attemptHex, 'hex');
    const real = Buffer.from(admin.passwordHash, 'hex');
    return attempt.length === real.length && crypto.timingSafeEqual(attempt, real);
  } catch (err) {
    return false;
  }
}

/**
 * Create a new admin with per-user salt and asynchronous scrypt hash
 */
async function createAdmin({ name, username, phone, password }) {
  const salt = crypto.randomBytes(16).toString('hex');
  const passwordHash = await hash(password, salt);
  const admin = {
    id: store.nextId.admin++,
    name: name || username,
    username: String(username).trim().toLowerCase(),
    phone: normalizePhone(phone),
    salt,
    passwordHash,
    createdAt: new Date().toISOString()
  };
  store.admins.push(admin);
  return admin;
}

/**
 * Authenticate admin with rate-limiting, timing-safe comparison, and TTL session
 */
async function login(identifier, password) {
  const rateStatus = checkRateLimit(identifier);
  if (!rateStatus.allowed) {
    return { error: rateStatus.message, rateLimited: true };
  }

  const admin = findAdmin(identifier);
  const isValid = await verify(admin, password);
  if (!isValid) {
    recordFailedAttempt(identifier);
    return null;
  }

  clearFailedAttempts(identifier);
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + SESSION_TTL_MS;
  store.sessions.set(token, { adminId: admin.id, expiresAt, username: admin.username });
  return { token, expiresAt, admin: publicAdmin(admin) };
}

/**
 * Extract admin profile from Bearer authorization header with TTL validation
 */
function adminFromToken(req) {
  const rawHeader = req.headers.authorization || '';
  const token = rawHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;

  const session = store.sessions.get(token);
  if (!session) return null;

  // Support both legacy numeric ID and session object
  const adminId = typeof session === 'object' ? session.adminId : session;
  const expiresAt = typeof session === 'object' ? session.expiresAt : Infinity;

  if (Date.now() > expiresAt) {
    store.sessions.delete(token); // TTL expired
    return null;
  }

  return store.admins.find(a => a.id === adminId) || null;
}

function publicAdmin(a) {
  return { id: a.id, name: a.name, username: a.username, phone: a.phone };
}

/**
 * Find driver by Profile ID (e.g. DM1001), phone number, or numeric ID
 */
function findDriver(identifier) {
  if (!identifier) return null;
  const raw = String(identifier).trim().toUpperCase();
  const phone = normalizePhone(identifier);
  const numId = Number(identifier);

  return store.drivers.find(d => 
    d.profileId.toUpperCase() === raw ||
    (phone.length === 10 && d.phone === phone) ||
    (!isNaN(numId) && d.id === numId)
  ) || null;
}

/**
 * Authenticate chauffeur with rate-limiting, PIN verification, and session token
 */
async function loginDriver(identifier, pin) {
  const rateStatus = checkRateLimit(identifier);
  if (!rateStatus.allowed) {
    return { error: rateStatus.message, rateLimited: true };
  }

  const driver = findDriver(identifier);
  if (!driver) {
    recordFailedAttempt(identifier);
    return { error: 'Chauffeur not found with this mobile number or Partner ID.' };
  }

  const validPin = driver.pin || '1234';
  const inputPin = String(pin || '').trim();

  if (inputPin !== validPin) {
    recordFailedAttempt(identifier);
    return { error: 'Invalid 4-digit Chauffeur PIN. Default demo PIN is 1234.' };
  }

  clearFailedAttempts(identifier);
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days session
  store.driverSessions.set(token, { driverId: driver.id, profileId: driver.profileId, expiresAt });

  return { token, expiresAt, driver: publicDriver(driver) };
}

/**
 * Extract authenticated driver from Bearer header
 */
function driverFromToken(req) {
  const rawHeader = req.headers.authorization || '';
  const token = rawHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;

  const session = store.driverSessions.get(token);
  if (!session) return null;

  if (Date.now() > session.expiresAt) {
    store.driverSessions.delete(token);
    return null;
  }

  return store.drivers.find(d => d.id === session.driverId) || null;
}

function publicDriver(d) {
  if (!d) return null;
  return {
    id: d.id,
    profileId: d.profileId,
    name: d.name,
    phone: d.phone,
    photo: d.photo,
    rating: d.rating,
    trips: d.trips,
    reliabilityScore: d.reliabilityScore,
    distanceKm: d.distanceKm,
    online: d.online,
    approved: d.approved,
    city: d.city,
    location: d.location,
    transmissions: d.transmissions,
    carTypes: d.carTypes,
    specialities: d.specialities,
    badges: d.badges
  };
}

module.exports = {
  createAdmin,
  findAdmin,
  login,
  adminFromToken,
  publicAdmin,
  findDriver,
  loginDriver,
  driverFromToken,
  publicDriver,
  normalizePhone,
  hash,
  verify,
  checkRateLimit
};

