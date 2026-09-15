# Aldercrest Reserve

Premium precious-metals storefront (gold, silver, platinum, bullion & collectibles).

MVP scaffold by PatStudio:
- **Frontend**: responsive storefront (`/site`) — catalog, filters, search, cart, saved pieces.
- **Backend**: Node/Express (`server.js`) serving the storefront + a small API.
- **Live spot pricing**: `GET /api/spot` — gold/silver/platinum, keyless source, 60s cache.
- **Formula pricing**: `GET /api/products` computes live price, premium over spot, premium %, and melt value per item (`spot_plus`, `spot_mult`, or `fixed`).
- **Database**: Postgres (`db.js`) — minimal `products`/inventory schema, auto-migrates and seeds on boot.

## Run locally
```bash
npm install
npm start          # http://localhost:8080
# with DB:
DATABASE_URL=postgres://... npm start
```

## API
- `GET /api/health` — service + db status
- `GET /api/spot` — current USD/oz spot for gold, silver, platinum
- `GET /api/products` — inventory with live-computed pricing

_Deployed on Railway. Domain: aldercrest-reserve.patstudio.tech_
