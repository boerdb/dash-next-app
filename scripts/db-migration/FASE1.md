# Fase 1 — Historie direct uit MariaDB

## Wat is gedaan

- `mysql2` connection pool (`lib/db/pool.ts`)
- Zelfde SQL als `historie.php` / `historie_energie.php` in `lib/db/historie-*.ts`
- API-routes gebruiken DB als `DATABASE_URL` gezet is, anders fallback naar PHP

## Setup

1. Op `.14` (eenmalig): `python scripts/db-migration/grant-dash-app-14.py`
2. In `.env.local`:

   ```env
   DATABASE_URL=mysql://dash_app:JOUW_WW@192.168.1.14:3306/weerdata
   ```

3. `npm run dev` — test `/api/weer/historie` en `/api/energie/historie`

## Fase 2 (live weer)

- `/api/weer/live` → `data.json` op `.52` + berekeningen in TS + cache in `weer_live` (geen `api.php`)
- Setup: `python scripts/db-migration/setup-weer-live-table.py`

## Nog via PHP

- `/api/energie/live` → `WEER_API_BASE`

## Productie

Voeg op `.14` een grant toe voor het vaste IP van je Next-server als dat niet `192.168.1.120` is.
