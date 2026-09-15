// Minimal Postgres layer. Safe no-op if DATABASE_URL is not set (local demo).
const { Pool } = require('pg');

const url = process.env.DATABASE_URL;
const pool = url
  ? new Pool({ connectionString: url, ssl: { rejectUnauthorized: false } })
  : null;

async function init() {
  if (!pool) {
    console.log('[db] DATABASE_URL not set - running without persistence');
    return;
  }
  // Minimal inventory schema. Supports fixed-price items and spot+premium formula items.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id            SERIAL PRIMARY KEY,
      sku           TEXT UNIQUE,
      name          TEXT NOT NULL,
      metal         TEXT,                       -- gold | silver | platinum | collectible
      category      TEXT,                       -- coin | bar | round | collectible
      purity        NUMERIC,                    -- e.g. 0.999
      weight_oz     NUMERIC,                    -- troy oz of metal content
      pricing_mode  TEXT DEFAULT 'fixed',       -- 'fixed' | 'spot_plus' | 'spot_mult'
      fixed_price   NUMERIC,                    -- used when pricing_mode = 'fixed'
      premium_flat  NUMERIC DEFAULT 0,          -- spot_plus: price = spot*weight + premium_flat
      premium_pct   NUMERIC DEFAULT 0,          -- spot_mult: price = spot*weight * (1 + premium_pct)
      stock         INTEGER DEFAULT 0,
      created_at    TIMESTAMPTZ DEFAULT now()
    );
  `);
  const { rows } = await pool.query('SELECT count(*)::int AS n FROM products');
  if (rows[0].n === 0) {
    await pool.query(`
      INSERT INTO products (sku,name,metal,category,purity,weight_oz,pricing_mode,premium_flat,premium_pct,fixed_price,stock) VALUES
      ('AU-1OZ-RND','1 oz Gold Round','gold','round',0.999,1,'spot_plus',65,0,NULL,12),
      ('AG-1OZ-RND','1 oz Silver Round','silver','round',0.999,1,'spot_plus',3.5,0,NULL,240),
      ('AG-10OZ-BAR','10 oz Silver Bar','silver','bar',0.999,10,'spot_mult',0,0.06,NULL,40),
      ('PT-1OZ-BAR','1 oz Platinum Bar','platinum','bar',0.9995,1,'spot_plus',95,0,NULL,8),
      ('COIN-COLL-01','Collector Silver Dollar','collectible','collectible',0.900,0.7734,'fixed',0,0,120,3);
    `);
    console.log('[db] seeded 5 demo products');
  }
}

module.exports = { pool, init };
