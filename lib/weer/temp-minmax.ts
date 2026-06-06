import type { WeerLive } from "@/lib/api/types";

export interface VandaagTempMinMax {
  min: number | null;
  max: number | null;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * Min/max vandaag uit metingen (5-min samples). Geen live-ingest-spikes.
 * Zonder metingen vandaag: val terug op huidige temp_c.
 */
export function mergeVandaagTempMinMax(
  data: WeerLive,
  fromMetingen: VandaagTempMinMax
): WeerLive {
  const { min, max } = fromMetingen;
  if (min != null && max != null && Number.isFinite(min) && Number.isFinite(max)) {
    return { ...data, temp_min_c: round1(min), temp_max_c: round1(max) };
  }

  const temp = data.temp_c != null ? Number(data.temp_c) : NaN;
  if (!Number.isFinite(temp)) return data;
  return { ...data, temp_min_c: round1(temp), temp_max_c: round1(temp) };
}
