import type { RowDataPacket } from "mysql2";
import type { EnergieApiRaw } from "@/lib/api/types";
import { env } from "@/lib/env.server";
import {
  applyDagstartTotals,
  buildDagstartFromMeters,
  todayAmsterdam,
  type EnergieDagstart,
} from "@/lib/energie/dagstart";
import { amsterdamSqlOffset } from "@/lib/energie/amsterdam-sql-offset";
import { getPool } from "@/lib/db/pool";

const FETCH_TIMEOUT_MS = 2_000;

interface DagstartRow extends RowDataPacket {
  payload: string | EnergieDagstart;
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, {
      next: { revalidate: 0 },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function readDagstart(): Promise<EnergieDagstart | null> {
  const pool = getPool();
  const [rows] = await pool.query<DagstartRow[]>(
    "SELECT payload FROM energie_dagstart WHERE id = 1 LIMIT 1"
  );
  const row = rows[0];
  if (!row) return null;
  return typeof row.payload === "string"
    ? (JSON.parse(row.payload) as EnergieDagstart)
    : row.payload;
}

async function writeDagstart(start: EnergieDagstart): Promise<void> {
  const pool = getPool();
  await pool.query(
    `INSERT INTO energie_dagstart (id, payload) VALUES (1, ?)
     ON DUPLICATE KEY UPDATE payload = VALUES(payload), updated_at = CURRENT_TIMESTAMP`,
    [JSON.stringify(start)]
  );
}

async function resolveDagstart(data: EnergieApiRaw): Promise<EnergieDagstart> {
  const today = todayAmsterdam();
  let start = await readDagstart();

  if (!start || start.date !== today) {
    start = buildDagstartFromMeters(data);
    await writeDagstart(start);
  }

  return start;
}

export async function maybeInsertEnergieMeting(
  data: EnergieApiRaw
): Promise<boolean> {
  const pool = getPool();
  const offset = amsterdamSqlOffset();
  const [gap] = await pool.query<RowDataPacket[]>(
    `SELECT TIMESTAMPDIFF(
       MINUTE,
       (SELECT MAX(meet_moment) FROM energie_metingen),
       CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', ?)
     ) AS mins`,
    [offset]
  );
  const mins = gap[0]?.mins as number | null;
  if (mins != null && mins < 5) {
    return false;
  }

  await pool.query(
    `INSERT INTO energie_metingen (
      actueel_vermogen_w, tarief, stroom_in_kwh, stroom_uit_kwh, gas_m3, water_dag_l, water_actueel_lpm
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      Math.round(Number(data.active_power_w ?? 0)),
      Number(data.active_tariff ?? 1),
      Number(data.vandaag_stroom_in_kwh ?? 0),
      Number(data.vandaag_stroom_out_kwh ?? 0),
      Number(data.vandaag_gas_m3 ?? 0),
      Number(data.vandaag_water_l ?? 0),
      Number(data.active_liter_lpm ?? 0),
    ]
  );
  return true;
}

export async function fetchEnergieLiveRaw(): Promise<EnergieApiRaw> {
  const p1Url = env.ENERGIE_P1_URL;
  const waterUrl = env.ENERGIE_WATER_URL;

  const p1 = await fetchJson<EnergieApiRaw>(p1Url);
  if (!p1) {
    throw new Error("P1 meter niet bereikbaar");
  }

  const water = await fetchJson<{
    active_liter_lpm?: number;
    total_liter_m3?: number;
  }>(waterUrl);

  const merged: EnergieApiRaw = { ...p1 };
  if (water) {
    merged.active_liter_lpm = water.active_liter_lpm;
    merged.total_liter_m3 = water.total_liter_m3;
  }

  const start = await resolveDagstart(merged);
  const withTotals = applyDagstartTotals(merged, start);

  try {
    await maybeInsertEnergieMeting(withTotals);
  } catch (e) {
    console.warn("energie_metingen insert:", e);
  }

  return withTotals;
}
