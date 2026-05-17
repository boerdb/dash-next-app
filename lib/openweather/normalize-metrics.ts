/** Normaliseert One Call 3.0 waarden (metric/Kelvin-mix, ongeldige percentages). */

const KELVIN_THRESHOLD_C = 60;
const MIN_HUMIDITY_PCT = 5;
const MAX_HUMIDITY_PCT = 100;
const MIN_DEW_POINT_C = -25;
const MAX_DEW_POINT_C = 35;

export function normalizeMetricTemp(value: number | undefined | null): number | null {
  if (value == null || Number.isNaN(value)) return null;
  const c = value > KELVIN_THRESHOLD_C ? value - 273.15 : value;
  if (c < -60 || c > 60) return null;
  return Math.round(c * 10) / 10;
}

export function normalizeHumidityPct(value: number | undefined | null): number | null {
  if (value == null || Number.isNaN(value)) return null;
  let pct = value;
  if (pct > 0 && pct < 1) pct *= 100;
  pct = Math.round(pct);
  if (pct < MIN_HUMIDITY_PCT || pct > MAX_HUMIDITY_PCT) return null;
  return pct;
}

export function normalizeDewPointC(value: number | undefined | null): number | null {
  if (value == null || Number.isNaN(value)) return null;
  const fromKelvin = value > KELVIN_THRESHOLD_C;
  const c = fromKelvin ? value - 273.15 : value;
  if (c < MIN_DEW_POINT_C || c > MAX_DEW_POINT_C) return null;
  return Math.round(c * 10) / 10;
}

export function msToKmh(ms: number | undefined | null): number | null {
  if (ms == null || Number.isNaN(ms)) return null;
  return Math.round(ms * 3.6 * 10) / 10;
}
