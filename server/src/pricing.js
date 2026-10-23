// Pricing — MARKET MATCH (user decision 2026-10-23, vs DriveU from Rs 129/hr):
// Tiered hourly rate: 1-3 hrs = Rs 149/hr, 4-7 hrs = Rs 139/hr, 8+ hrs = Rs 129/hr
// Platform commission 20% (driver gets 80%). Night charge: +Rs 200 flat if trip ends 10PM-6AM (caller sets night=true).
function hourlyRateFor(hours) { const h = Number(hours) || 1; return h >= 8 ? 129 : h >= 4 ? 139 : 149; }
function quote(hours, night = false) {
  const h = Math.max(1, Number(hours) || 1);
  const rate = hourlyRateFor(h);
  const base = h * rate;
  const nightCharge = night ? 200 : 0;
  const total = base + nightCharge;
  const driverEarnings = Math.round(total * 0.8);
  const platformCommission = total - driverEarnings; // exactly 20% (subject to rupee rounding)
  return { hours: h, hourlyRate: rate, base, nightCharge, total, driverEarnings, platformCommission, currency: 'INR',
    tiers: [{ range: '1-3 hrs', rate: 149 }, { range: '4-7 hrs', rate: 139 }, { range: '8+ hrs', rate: 129 }] };
}
module.exports = { quote, hourlyRateFor };
