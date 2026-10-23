// Customer booking screen logic — see App.js for the wired implementation.
export const SERVICE_TYPES = ['Hourly','One Way','Round Trip','Airport Transfer','Full Day','Scheduled','Wedding','Family Booking'];
export const rateFor = (h) => h>=8?129:h>=4?139:149;
export const quote = (hours) => { const r=rateFor(hours), total=hours*r, d=Math.round(total*0.8); return { hourlyRate:r, total, driverEarnings:d, platformCommission:total-d }; };
