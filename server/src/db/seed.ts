import { pool } from "./pool.js";

// Demo customer: 2023 RAV4 lease ending in ~2 months
const { rows } = await pool.query(
  `INSERT INTO customers (name, zip, vehicle_model, vehicle_year, lease_end, monthly_payment, buyout_price, miles)
   VALUES ('Demo Driver', '75201', 'RAV4', 2023, now()::date + 60, 389.00, 26450.00, 31200)
   RETURNING id`
);
const customerId = rows[0].id;

// 24 months of on-time lease payments
for (let m = 24; m >= 1; m--) {
  await pool.query(
    `INSERT INTO payment_history (time, customer_id, amount, category, description)
     VALUES (now() - make_interval(months => $1), $2, 389.00, 'lease', 'Toyota Financial lease payment')`,
    [m, customerId]
  );
}

// 12 months of RAV4 price trends: used prices drifting down, trade-in tracking ~88% of used
for (let m = 12; m >= 0; m--) {
  const used = 29800 - (12 - m) * 140;
  await pool.query(
    `INSERT INTO price_history (time, model, year, kind, price, source, zip) VALUES
       (now() - make_interval(months => $1), 'RAV4', 2023, 'used', $2, 'seed', '75201'),
       (now() - make_interval(months => $1), 'RAV4', 2023, 'trade_in', $3, 'seed', '75201'),
       (now() - make_interval(months => $1), 'RAV4', 2026, 'new', $4, 'seed', '75201')`,
    [m, used, Math.round(used * 0.88), 31900 + (12 - m) * 35]
  );
}

console.log(`Seeded customer ${customerId}`);
await pool.end();
