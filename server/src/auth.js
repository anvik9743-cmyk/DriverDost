// Admin auth — login with username OR phone number + password.
// Passwords hashed with Node's built-in scrypt + per-user salt (use bcrypt/argon2 in production).
const crypto = require('crypto');
const store = require('./store');

const hash = (password, salt) => crypto.scryptSync(password, salt, 64).toString('hex');
function createAdmin({ name, username, phone, password }) {
  const salt = crypto.randomBytes(16).toString('hex');
  const admin = { id: store.nextId.admin++, name: name || username, username: String(username).trim().toLowerCase(),
    phone: normalizePhone(phone), salt, passwordHash: hash(password, salt) };
  store.admins.push(admin); return admin;
}
function normalizePhone(p) { // "+91 98765 43210" -> "9876543210"
  let d = String(p || '').replace(/\D/g, '');
  if (d.length === 12 && d.startsWith('91')) d = d.slice(2);
  if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
  return d;
}
function findAdmin(identifier) {
  const id = String(identifier || '').trim().toLowerCase();
  const phone = normalizePhone(identifier);
  return store.admins.find(a => a.username === id || a.phone === phone);
}
function verify(admin, password) {
  if (!admin) return false;
  const attempt = Buffer.from(hash(password, admin.salt));
  const real = Buffer.from(admin.passwordHash);
  return attempt.length === real.length && crypto.timingSafeEqual(attempt, real);
}
function login(identifier, password) {
  const admin = findAdmin(identifier);
  if (!verify(admin, password)) return null;
  const token = crypto.randomBytes(32).toString('hex');
  store.sessions.set(token, admin.id); return { token, admin: publicAdmin(admin) };
}
function adminFromToken(req) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  const id = store.sessions.get(token);
  return store.admins.find(a => a.id === id) || null;
}
function publicAdmin(a) { return { id: a.id, name: a.name, username: a.username, phone: a.phone }; }
module.exports = { createAdmin, findAdmin, login, adminFromToken, publicAdmin, normalizePhone, hash };
