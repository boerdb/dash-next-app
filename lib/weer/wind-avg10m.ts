import type { WeerLive } from "@/lib/api/types";

/** Rolling 10-min wind average (Ecowitt windspdmph_avg10m equivalent). */
export const WIND_AVG_WINDOW_MS = 10 * 60 * 1000;

export interface WindSample {
  t: number;
  kmh: number;
}

export function updateWindSamples(
  previous: WindSample[] | undefined,
  windspeedKmh: number | undefined,
  nowMs = Date.now()
): WindSample[] {
  const cutoff = nowMs - WIND_AVG_WINDOW_MS;
  const kept = (previous ?? []).filter((s) => s.t > cutoff);
  if (windspeedKmh != null && Number.isFinite(windspeedKmh)) {
    kept.push({ t: nowMs, kmh: windspeedKmh });
  }
  return kept;
}

export function averageWindSamples(samples: WindSample[]): number | null {
  if (samples.length === 0) return null;
  const sum = samples.reduce((acc, s) => acc + s.kmh, 0);
  return Math.round((sum / samples.length) * 10) / 10;
}

/** Voeg sample toe en zet windspd_avg10m_kmh uit het rolling venster. */
export function applyWindAvg10m(
  fresh: WeerLive,
  previous: WeerLive | null
): WeerLive {
  const speed =
    fresh.windspeed_kmh != null ? Number(fresh.windspeed_kmh) : undefined;
  const samples = updateWindSamples(previous?._wind_samples, speed);
  const computed = averageWindSamples(samples);
  const gateway =
    fresh.windspd_avg10m_kmh != null
      ? Number(fresh.windspd_avg10m_kmh)
      : undefined;

  return {
    ...fresh,
    _wind_samples: samples,
    windspd_avg10m_kmh: computed ?? gateway ?? speed,
  };
}
