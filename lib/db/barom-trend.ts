import type { RowDataPacket } from "mysql2";
import type { WeerLive } from "@/lib/api/types";
import { getPool } from "@/lib/db/pool";
import { meetMomentFromWeer } from "@/lib/db/nl-time";
import {
  BAROM_TREND_HOURS,
  computeBaromTrend,
  type BaromTrend,
} from "@/lib/weer/barom-trend";

interface PastBaromRow extends RowDataPacket {
  baromrel_hpa: number;
}

/** Druk ~3 uur geleden uit metingen (5-min samples, kolom baromrel_hpa). */
export async function fetchBaromHpaHoursAgo(
  referenceMoment: string,
  hours = BAROM_TREND_HOURS
): Promise<number | null> {
  const pool = getPool();
  const targetMin = hours * 60;
  const [rows] = await pool.query<PastBaromRow[]>(
    `SELECT baromrel_hpa
     FROM metingen
     WHERE baromrel_hpa IS NOT NULL
       AND meet_moment <= DATE_SUB(?, INTERVAL ? MINUTE)
       AND meet_moment >= DATE_SUB(?, INTERVAL ? MINUTE)
     ORDER BY ABS(TIMESTAMPDIFF(MINUTE, meet_moment, DATE_SUB(?, INTERVAL ? MINUTE)))
     LIMIT 1`,
    [
      referenceMoment,
      targetMin - 60,
      referenceMoment,
      targetMin + 60,
      referenceMoment,
      targetMin,
    ]
  );
  const row = rows[0];
  return row?.baromrel_hpa != null ? Number(row.baromrel_hpa) : null;
}

export async function resolveBaromTrend(data: WeerLive): Promise<BaromTrend | null> {
  const current = data.baromrel_hpa != null ? Number(data.baromrel_hpa) : NaN;
  if (Number.isNaN(current)) return null;

  const ref = meetMomentFromWeer(data);
  if (!ref) return null;

  const past = await fetchBaromHpaHoursAgo(ref);
  return computeBaromTrend(current, past);
}

export async function applyBaromTrend(data: WeerLive): Promise<WeerLive> {
  const trend = await resolveBaromTrend(data);
  if (!trend) return data;
  return {
    ...data,
    barom_trend_delta_hpa: trend.delta_hpa,
    barom_trend_hours: trend.hours,
    barom_trend_direction: trend.direction,
    barom_trend_label: trend.label,
  };
}
