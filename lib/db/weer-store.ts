import type { RowDataPacket } from "mysql2";
import type { WeerLive } from "@/lib/api/types";
import { enrichWeerLive } from "@/lib/weer/enrich-live";
import { resolveLightningStormRisk } from "@/lib/weer/lightning-storm";
import { applyWindAvg10m } from "@/lib/weer/wind-avg10m";
import { mergeWeerLiveBySource } from "@/lib/weer/merge-weer-sources";
import {
  fetchGatewayLiveData,
  mapGatewayLightning,
  mapGatewayLive,
} from "@/lib/weer/ecowitt-local-client";
import { env } from "@/lib/env.server";
import { getPool } from "@/lib/db/pool";
import {
  GATEWAY_LIGHTNING_SUPPLEMENT_MS,
  shouldAccelerateLightningPoll,
} from "@/lib/weer/lightning-storm";
import {
  applyGatewayTempMinMax,
  carryForwardTempMinMax,
} from "@/lib/weer/gateway-temp-minmax";
import { applyMaxGustTime } from "@/lib/weer/max-gust-time";
import { meetMomentFromWeer, NL_TZ_OFFSET } from "@/lib/db/nl-time";
import { syncRegenFromIngest } from "@/lib/db/weer-regen-store";
import { persistBliksemAfterLiveUpdate } from "@/lib/db/weer-bliksem-store";
import {
  regenDagSyncFromIngest,
  regenMmFromWeer,
} from "@/lib/weer/regen-dag";
import {
  resolveDailyLightningStrike,
  shouldPersistBliksemLive,
} from "@/lib/weer/bliksem-dag";

const CACHE_MAX_AGE_MS = 10 * 60 * 1000;
/** Gateway-poll bij rustig weer (wind/sensoren sneller dan de ~1 min upload). */
const GATEWAY_SUPPLEMENT_MS = 15_000;

let lastGatewayPollAt = 0;

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

export async function writeWeerLiveCache(
  data: WeerLive,
  options?: { trackGatewayTempMinMax?: boolean }
): Promise<WeerLive> {
  const previous = await readWeerLiveCache();
  const withGust = applyMaxGustTime(data, previous);
  const withTempMinMax = options?.trackGatewayTempMinMax
    ? applyGatewayTempMinMax(withGust, previous)
    : carryForwardTempMinMax(withGust, previous);
  const withLightning = resolveDailyLightningStrike(withTempMinMax, previous);
  const enriched = enrichWeerLive(withLightning);
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
  const saved = await writeWeerLiveCache(withStorm);
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
  if (shouldPersistBliksemLive(saved, previous)) {
    try {
      await persistBliksemAfterLiveUpdate(saved, previous);
    } catch (e) {
      console.warn("weer_bliksem_dag sync:", e);
    }
  }
  return saved;
}

/**
 * Poll GW1100 LAN-API (.150): wind/temp/vocht/zon/UV/regen + WH57-bliksem.
 * Lokaal ververst de gateway sneller dan de Ecowitt custom upload (~1 min).
 */
export async function supplementWeerFromGateway(): Promise<WeerLive | null> {
  const gatewayUrl = env.ECOWITT_GATEWAY_URL;
  if (!gatewayUrl) return null;

  const previous = await readWeerLiveCache();
  if (!previous) return null;

  const raw = await fetchGatewayLiveData(gatewayUrl);
  if (!raw) return null;

  const fields = {
    ...mapGatewayLive(raw),
    ...mapGatewayLightning(raw, previous.dateutc),
  };
  if (Object.keys(fields).length === 0) return previous;

  const merged = applyWindAvg10m({ ...previous, ...fields }, previous);
  const enriched = enrichWeerLive(merged);
  const saved = await writeWeerLiveCache(enriched, { trackGatewayTempMinMax: true });
  if (saved) {
    try {
      await persistBliksemAfterLiveUpdate(saved, previous);
    } catch (e) {
      console.warn("weer_bliksem_dag gateway sync:", e);
    }
  }
  return saved;
}

/**
 * Gateway-aanvulling met throttle: elke ~15 s, of elke 5 s tijdens onweer.
 * Zo loopt o.a. de windmeter near-real-time mee met de lokale GW1100.
 */
export async function maybeSupplementFromGateway(): Promise<void> {
  const previous = await readWeerLiveCache();
  if (!previous) return;

  const interval = shouldAccelerateLightningPoll(previous)
    ? GATEWAY_LIGHTNING_SUPPLEMENT_MS
    : GATEWAY_SUPPLEMENT_MS;
  const now = Date.now();
  if (now - lastGatewayPollAt < interval) return;
  lastGatewayPollAt = now;
  await supplementWeerFromGateway();
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
