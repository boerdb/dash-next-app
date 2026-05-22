# Fase 3 — Ecowitt → Next (geen upload.php)

## Ecowitt gateway instellen

In **Ecowitt Customized Server** (WS View / gateway):

| Veld | Waarde |
|------|--------|
| Protocol | HTTP |
| Server / IP | IP van de machine waar **Next.js draait** |
| Poort | `3000` (dev) of `80`/`443` (productie) |
| Pad / URL | `/api/weer/ingest` |

### Voorbeelden

**Development** (Next op `192.168.1.32`):

```text
http://192.168.1.32:3000/api/weer/ingest
```

**Productie** (vast IP of hostname, poort 80):

```text
http://<jouw-next-host>/api/weer/ingest
```

Ecowitt gebruikt vaak **GET** met alle velden in de URL, of **POST** form — beide worden ondersteund.

Bij succes antwoordt de server: `SUCCESS` (platte tekst, zoals voorheen `upload.php`).

## Wat de app doet

1. Ontvangt station-data op `/api/weer/ingest`
2. Slaat live snapshot op in `weer_live` (MariaDB `.14`)
3. Voegt elke **5 minuten** een rij toe in `metingen` (was `save_weather.php` cron)

## Opruimen op .52 (optioneel)

Als Ecowitt naar Next wijst, kun je op `.52` uitzetten:

- Cron `save_weather.php` (dubbel met Next)
- `upload.php` hoeft geen data meer te ontvangen

`data.json` wordt dan niet meer bijgewerkt; live/historie komen uit DB via Next.

## Vereist

```env
DATABASE_URL=mysql://dash_app:...@192.168.1.14:3306/weerdata
```

Eenmalig: `python scripts/db-migration/grant-dash-insert-metingen.py`
