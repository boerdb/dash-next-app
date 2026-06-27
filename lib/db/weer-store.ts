import type { RowDataPacket } from "mysql2";
import type { WeerLive } from "@/lib/api/types";
import { enrichWeerLive } from "@/lib/weer/enrich-live";
import { resolveLightningStormRisk } from "@/lib/weer/lightning-storm";
import { applyWindAvg10m } from "@/lib/weer/wind-avg10m";
import { mergeWeerLiveBySource } from "@/lib/weer/merge-weer-sources";
import {
  fetchGatewayLiveData,
  mapGatewayLightning,
} from "@/lib/weer/ecowitt-local-client";
import { env } from "@/lib/env.server";
import { getPool } from "@/lib/db/pool";
import { todayAmsterdamDate } from "@/lib/weer/regen-jaar-labels";
import {
  mergeVandaagTempMinMax,
  type VandaagTempMinMax,
} from "@/lib/weer/temp-minmax";
import { meetMomentFromWeer, NL_TZ_OFFSET } from "@/lib/db/nl-time";
import { syncRegenFromIngest } from "@/lib/db/weer-regen-store";
import { regenDagSyncFromIngest, regenMmFromWeer } from "@/lib/weer/regen-dag";

const CACHE_MAX_AGE_MS = 10 * 60 * 1000;

interface CacheRow extends RowDataPacket {
  payload: string | WeerLive;
  updated_at: Date;
}

interface TempMinMaxRow extends RowDataPacket {
  tmin: number | null;
  tmax: number | null;
}

async function fetchVandaagTempMinMax(dag: string): Promise<VandaagTempMinMax> {
  const pool = getPool();
  // meet_moment = Amsterdam wall clock (server_timestamp), geen UTC.
  const [rows] = await pool.query<TempMinMaxRow[]>(
    `SELECT ROUND(MIN(temp_c), 1) AS tmin, ROUND(MAX(temp_c), 1) AS tmax
     FROM metingen
     WHERE DATE(meet_moment) = ?`,
    [dag]
  );
  const row = rows[0];
  return {
    min: row?.tmin != null ? Number(row.tmin) : null,
    max: row?.tmax != null ? Number(row.tmax) : null,
  };
}

export async function applyVandaagTempMinMax(data: WeerLive): Promise<WeerLive> {
  const dag = todayAmsterdamDate();
  const fromMetingen = await fetchVandaagTempMinMax(dag);
  return mergeVandaagTempMinMax(data, fromMetingen);
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
  const previous = await readWeerLiveCache();
  const enriched = enrichWeerLive(data);
  const withStorm = resolveLightningStormRisk(enriched, previous);
  const pool = getPool();
  await pool.query(
    `INSERT INTO weer_live (id, payload) VALUES (1, ?)
     ON DUPLICATE KEY UPDATE payload = VALUES(payload), updated_at = CURRENT_TIMESTAMP`,
    [JSON.stringify(withStorm)]
  );
  return withStorm;
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
  const wind =
    data.windspd_avg10m_kmh != null
      ? Number(data.windspd_avg10m_kmh)
      : data.windspeed_kmh != null
        ? Number(data.windspeed_kmh)
        : 0;
  const dir = data.winddir != null ? Number(data.winddir) : 0;
  const rain = regenMmFromWeer(data);
  const sun = data.solarradiation != null ? Number(data.solarradiation) : 0;
  const barom =
    data.baromrel_hpa != null && Number.isFinite(Number(data.baromrel_hpa))
      ? Number(data.baromrel_hpa)
      : null;

  const meetMoment =
    meetMomentFromWeer(data) ??
    null;

  await pool.query(
    `INSERT INTO metingen (meet_moment, temp_c, luchtvochtigheid, wind_kmh, wind_richting, regen_mm, zon_straling, baromrel_hpa)
     VALUES (
       COALESCE(?, CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '${NL_TZ_OFFSET}')),
       ?, ?, ?, ?, ?, ?, ?
     )`,
    [meetMoment, temp, humidity, wind, dir, rain, Math.round(sun), barom]
  );
  return true;
}

export async function ingestWeerLive(raw: WeerLive): Promise<WeerLive> {
  const previous = await readWeerLiveCache();
  const merged = mergeWeerLiveBySource(raw, previous);
  const withWindAvg = applyWindAvg10m(merged, previous);
  const enriched = enrichWeerLive(withWindAvg);
  const withStorm = resolveLightningStormRisk(enriched, previous);
  await maybeInsertMeting(withStorm);
  const withMinMax = await applyVandaagTempMinMax(withStorm);
  const saved = await writeWeerLiveCache(withMinMax);
  try {
    const sync = regenDagSyncFromIngest(saved, previous);
    await syncRegenFromIngest(
      sync.archiveDag,
      sync.archiveMm,
      sync.vandaagDag,
      sync.vandaagMm
    );
  } catch (e) {
    console.warn("weer_regen_dag sync:", e);
  }
  return saved;
}

/** Poll GW1100 LAN-API (.150) voor WH57-data; vult gaten in custom upload. */
export async function supplementWeerFromGateway(): Promise<WeerLive | null> {
  const gatewayUrl = env.ECOWITT_GATEWAY_URL;
  if (!gatewayUrl) return null;

  const previous = await readWeerLiveCache();
  if (!previous) return null;

  const raw = await fetchGatewayLiveData(gatewayUrl);
  if (!raw) return null;

  const lightning = mapGatewayLightning(raw, previous.dateutc);
  if (Object.keys(lightning).length === 0) return previous;

  const merged = { ...previous, ...lightning };
  const enriched = enrichWeerLive(merged);
  return writeWeerLiveCache(enriched);
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
