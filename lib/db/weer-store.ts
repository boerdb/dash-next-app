import type { RowDataPacket } from "mysql2";
import type { WeerLive } from "@/lib/api/types";
import { enrichWeerLive } from "@/lib/weer/enrich-live";
import { mergeDailyMinMax } from "@/lib/weer/ecowitt-ingest";
import { getPool } from "@/lib/db/pool";
import { meetMomentFromWeer, NL_TZ_OFFSET } from "@/lib/db/nl-time";

const CACHE_MAX_AGE_MS = 10 * 60 * 1000;

interface CacheRow extends RowDataPacket {
  payload: string | WeerLive;
  updated_at: Date;
}

function parsePayload(row: CacheRow): WeerLive {
  return typeof row.payload === "string"
    ? (JSON.parse(row.payload) as WeerLive)
    : row.payload;
}

export async function readWeerLiveCache(): Promise<WeerLive | null> {
  const pool = getPool();
  const [rows] = await pool.query<CacheRow[]>(
    "SELECT payload, updated_at FROM weer_live WHERE id = 1 LIMIT 1"
  );
  const row = rows[0];
  if (!row) return null;
  return parsePayload(row);
}

export async function writeWeerLiveCache(data: WeerLive): Promise<WeerLive> {
  const enriched = enrichWeerLive(data);
  const pool = getPool();
  await pool.query(
    `INSERT INTO weer_live (id, payload) VALUES (1, ?)
     ON DUPLICATE KEY UPDATE payload = VALUES(payload), updated_at = CURRENT_TIMESTAMP`,
    [JSON.stringify(enriched)]
  );
  return enriched;
}

/** Elke 5 min een rij in metingen (zoals save_weather.php cron). */
export async function maybeInsertMeting(data: WeerLive): Promise<boolean> {
  const pool = getPool();
  const [gap] = await pool.query<RowDataPacket[]>(
    `SELECT TIMESTAMPDIFF(
       MINUTE,
       (SELECT MAX(meet_moment) FROM metingen),
       CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '+02:00')
     ) AS mins`
  );
  const mins = gap[0]?.mins as number | null;
  if (mins != null && mins < 5) {
    return false;
  }

  const temp = data.temp_c != null ? Number(data.temp_c) : 0;
  const humidity = data.humidity != null ? Number(data.humidity) : 0;
  const wind = data.windspd_avg10m_kmh != null ? Number(data.windspd_avg10m_kmh) : 0;
  const dir = data.winddir != null ? Number(data.winddir) : 0;
  const rain = data.dailyrain_mm != null ? Number(data.dailyrain_mm) : 0;
  const sun = data.solarradiation != null ? Number(data.solarradiation) : 0;

  const meetMoment =
    meetMomentFromWeer(data) ??
    null;

  await pool.query(
    `INSERT INTO metingen (meet_moment, temp_c, luchtvochtigheid, wind_kmh, wind_richting, regen_mm, zon_straling)
     VALUES (
       COALESCE(?, CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '${NL_TZ_OFFSET}')),
       ?, ?, ?, ?, ?, ?
     )`,
    [meetMoment, temp, humidity, wind, dir, rain, Math.round(sun)]
  );
  return true;
}

export async function ingestWeerLive(raw: WeerLive): Promise<WeerLive> {
  const previous = await readWeerLiveCache();
  const withMinMax = mergeDailyMinMax(raw, previous);
  const saved = await writeWeerLiveCache(withMinMax);
  await maybeInsertMeting(saved);
  return saved;
}

export function isCacheFresh(updatedAt: Date | null): boolean {
  if (!updatedAt) return false;
  return Date.now() - updatedAt.getTime() < CACHE_MAX_AGE_MS;
}

export async function getCacheUpdatedAt(): Promise<Date | null> {
  const pool = getPool();
  const [rows] = await pool.query<CacheRow[]>(
    "SELECT updated_at FROM weer_live WHERE id = 1 LIMIT 1"
  );
  const row = rows[0];
  return row ? new Date(row.updated_at) : null;
}
