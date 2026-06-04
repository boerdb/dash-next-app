# Fase 1 — Historie direct uit MariaDB

## Wat is gedaan

- `mysql2` connection pool (`lib/db/pool.ts`)
- Zelfde SQL als `historie.php` / `historie_energie.php` in `lib/db/historie-*.ts`
- API-routes vereisen `DATABASE_URL` (geen PHP-fallback meer)

## Setup

1. Op `.14` (eenmalig): `python scripts/db-migration/grant-dash-app-14.py`
2. In `.env.local`:

   ```env
   DATABASE_URL=mysql://dash_app:JOUW_WW@192.168.1.14:3306/weerdata
   ```

3. `npm run dev` — test `/api/weer/historie` en `/api/energie/historie`

## Fase 2 (live weer)

- `/api/weer/live` → `weer_live` + Ecowitt-ingest op `.32`
- Setup: `python scripts/db-migration/setup-weer-live-table.py`

## Productie

Next-server: `192.168.1.32` — extra grants via `grant-dash-app-32.py` (naast subnet `192.168.1.%` in `grant-dash-app-14.py`).
