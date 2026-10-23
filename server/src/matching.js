// Matching score (illustrative, tune with real data):
// Score = 0.45*Proximity + 0.25*Reliability + 0.20*Availability + 0.10*Rating  (each 0-100)
function scoreDriver(driver, booking) {
  const proximity = Math.max(0, 100 - (driver.distanceKm || 5) * 10);
  const reliability = driver.reliabilityScore; // 0-100
  const availability = driver.online ? 100 : 0;
  const rating = (driver.rating / 5) * 100;
  const score = 0.45 * proximity + 0.25 * reliability + 0.20 * availability + 0.10 * rating;
  return { driverId: driver.id, score: Math.round(score * 10) / 10,
    breakdown: { proximity, reliability, availability, rating: Math.round(rating) } };
}
function matchDrivers(drivers, booking) {
  return drivers.filter(d => d.approved && d.online)
    .filter(d => !booking.transmission || driverSupports(d, booking.transmission))
    .map(d => ({ driver: d, ...scoreDriver(d, booking) }))
    .sort((a, b) => b.score - a.score);
}
function driverSupports(d, t) { return d.transmissions.includes(t); }
module.exports = { scoreDriver, matchDrivers };
