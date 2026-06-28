import type { WeerLive } from "@/lib/api/types";

export interface VandaagTempMinMax {
  min: number | null;
  max: number | null;
  /** Tijdstip (HH:MM, Amsterdam) van het minimum. */
  minAt?: string | null;
  /** Tijdstip (HH:MM, Amsterdam) van het maximum. */
  maxAt?: string | null;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * Min/max vandaag uit metingen (5-min samples). Geen live-ingest-spikes.
 * Zonder metingen vandaag (bv. net na middernacht): val terug op huidige temp_c.
 */
export function mergeVandaagTempMinMax(
  data: WeerLive,
  fromMetingen: VandaagTempMinMax
): WeerLive {
  const { min, max, minAt, maxAt } = fromMetingen;
  if (min != null && max != null && Number.isFinite(min) && Number.isFinite(max)) {
    return {
      ...data,
      temp_min_c: round1(min),
      temp_max_c: round1(max),
      temp_min_time: minAt ?? null,
      temp_max_time: maxAt ?? null,
    };
  }

  const temp = data.temp_c != null ? Number(data.temp_c) : NaN;
  if (!Number.isFinite(temp)) return data;
  return {
    ...data,
    temp_min_c: round1(temp),
    temp_max_c: round1(temp),
    temp_min_time: null,
    temp_max_time: null,
  };
}
