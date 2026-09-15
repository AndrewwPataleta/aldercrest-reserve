const express = require('express');
const path = require('path');
const { pool, init } = require('./db');

const app = express();
app.use(express.json());

// ---- Live precious-metals spot pricing -------------------------------------
// Source: api.gold-api.com (keyless). Cached 60s. Falls back to last-good.
const SYMBOLS = { gold: 'XAU', silver: 'XAG', platinum: 'XPT' };
let spotCache = { at: 0, data: null };

async function fetchSpot() {
  const now = Date.now();
  if (spotCache.data && now - spotCache.at < 60_000) return spotCache.data;
  const out = {};
  await Promise.all(Object.entries(SYMBOLS).map(async ([metal, sym]) => {
    try {
      const r = await fetch(`https://api.gold-api.com/price/${sym}`);
      const j = await r.json();
      if (typeof j.price === 'number') out[metal] = Math.round(j.price * 100) / 100;
    } catch (e) { /* keep prior value */ }
  }));
  const merged = { ...(spotCache.data || {}), ...out };
  spotCache = { at: now, data: merged };
  return merged;
}

// price a product row given current spot
function priceProduct(p, spot) {
  const s = spot[p.metal];
  if (p.pricing_mode === 'spot_plus' && s) return +(s * Number(p.weight_oz) + Number(p.premium_flat)).toFixed(2);
  if (p.pricing_mode === 'spot_mult' && s) return +(s * Number(p.weight_oz) * (1 + Number(p.premium_pct))).toFixed(2);
  return p.fixed_price != null ? Number(p.fixed_price) : null;
}

app.get('/api/health', (_req, res) => res.json({ ok: true, db: !!pool }));

app.get('/api/spot', async (_req, res) => {
  const spot = await fetchSpot();
  res.json({ currency: 'USD', unit: 'troy_oz', updated: new Date().toISOString(), spot });
});

// Products with live-computed price, premium over spot, and melt value.
app.get('/api/products', async (_req, res) => {
  const spot = await fetchSpot();
  if (!pool) return res.json({ spot, products: [] });
  const { rows } = await pool.query('SELECT * FROM products ORDER BY id');
  const products = rows.map((p) => {
    const price = priceProduct(p, spot);
    const melt = spot[p.metal] ? +(spot[p.metal] * Number(p.weight_oz)).toFixed(2) : null;
    const premium = price != null && melt != null ? +(price - melt).toFixed(2) : null;
    const premiumPct = premium != null && melt ? +((premium / melt) * 100).toFixed(1) : null;
    return { ...p, live_price: price, melt_value: melt, premium_over_spot: premium, premium_pct_live: premiumPct };
  });
  res.json({ spot, products });
});

// ---- Static storefront ------------------------------------------------------
app.use(express.static(path.join(__dirname, 'site')));

const PORT = process.env.PORT || 8080;
init()
  .catch((e) => console.error('[db] init failed:', e.message))
  .finally(() => app.listen(PORT, () => console.log(`Aldercrest Reserve on :${PORT}`)));
