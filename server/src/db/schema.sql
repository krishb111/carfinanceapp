CREATE EXTENSION IF NOT EXISTS timescaledb;

CREATE TABLE IF NOT EXISTS customers (
  id               SERIAL PRIMARY KEY,
  nessie_id        TEXT UNIQUE,
  name             TEXT NOT NULL,
  zip              TEXT,
  vehicle_model    TEXT NOT NULL,
  vehicle_year     INT NOT NULL,
  lease_end        DATE,
  monthly_payment  NUMERIC(10,2),
  buyout_price     NUMERIC(10,2),
  miles            INT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payment_history (
  time         TIMESTAMPTZ NOT NULL,
  customer_id  INT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  amount       NUMERIC(10,2) NOT NULL,
  category     TEXT NOT NULL,
  description  TEXT
);
SELECT create_hypertable('payment_history', 'time', if_not_exists => TRUE);
CREATE INDEX IF NOT EXISTS payment_history_customer_idx ON payment_history (customer_id, time DESC);

CREATE TABLE IF NOT EXISTS price_history (
  time        TIMESTAMPTZ NOT NULL,
  model       TEXT NOT NULL,
  year        INT,
  kind        TEXT NOT NULL,  -- 'new', 'used', 'trade_in'
  price       NUMERIC(10,2) NOT NULL,
  source      TEXT,
  zip         TEXT
);
SELECT create_hypertable('price_history', 'time', if_not_exists => TRUE);
CREATE INDEX IF NOT EXISTS price_history_model_idx ON price_history (model, kind, time DESC);
