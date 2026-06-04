# Interne infrastructuur (thuisnetwerk)

| Host | Rol | Services |
|------|-----|----------|
| **192.168.1.52** | PHP | `/var/www/html/weer/`, `/personen/`, `/labels/` (zie README.txt per map) |
| **192.168.1.14** | Data | **MariaDB** (`weerdata`, `personen_db`, `ic_labels_db`, user `ben` vanaf `.52`), **Redis** |

## MariaDB (.14)

- Database weer/energie: `weerdata` (tabellen o.a. `metingen`, `energie_metingen`, `getijden`)
- Next-app (`192.168.1.32`) via user `dash_app`

## Redis (.14)

- Staat op dezelfde LXC als MariaDB
- Standaard poort: **6379**
- Deze Next-app gebruikt Redis **nog niet**; beschikbaar voor cache, sessies of PHP later

Voorbeeld URL (als je het later nodig hebt vanaf `.52` of een app-server op het LAN):

```env
# REDIS_URL=redis://192.168.1.14:6379
```

## Next.js dashboard (`192.168.1.32`)

**Publiek:** Cloudflare Tunnel → [https://dash.clvs.nl](https://dash.clvs.nl) (zelfde app als `:3000`).

**Ecowitt** blijft op het **LAN** wijzen (niet via de tunnel):

`http://192.168.1.32:3000/api/weer/ingest`

Na een deploy: op `dash.clvs.nl` sitegegevens wissen of PWA opnieuw installeren (oude service worker cachet anders API’s).

Met `DATABASE_URL` naar `.14`:

| Endpoint | Bron |
|----------|------|
| `/api/weer/ingest` | Ecowitt → `weer_live` + `metingen` |
| `/api/weer/live` | `weer_live` |
| `/api/weer/historie` | `metingen` |
| `/api/energie/live` | P1 `.178` + water `.169` + batterijen `.179`/`.170` → `energie_metingen` |
| `/api/energie/historie` | `energie_metingen` |
| `/api/weer/getijden` | RWS / Open-Meteo (geen PHP) |

Personen/labels (optioneel nog PHP op `.52`): `/personen/`, `/labels/`

## MariaDB op .52

**Geen** — MariaDB en phpMyAdmin zijn verwijderd. PHP gebruikt `php8.1-mysql` om naar `.14` te verbinden. Databasebeheer: phpMyAdmin op **192.168.1.14**.

## Opgeruimd op .52

- **Weer/energie** (dashboard via Next): map `weer/`, symlinks en cron `save_*` / `getijden_beheer` verwijderd → `_archief/weer-naar-next-*` (script: `cleanup-52-weer.py`).
- **Blijft:** `personen/`, `labels/`.
- Oudere PWA/test: `_archief/<datum>/` (`archive-52-clutter.py`).
