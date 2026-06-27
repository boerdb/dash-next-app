/** Windchill is zinvol bij ca. 10 °C of kouder (KNMI-formule). */
export const WIND_CHILL_MAX_TEMP_C = 10;

/** Ondergrens Beaufort 3 (KNMI: 12–19 km/u). */
export const WIND_CHILL_MIN_WIND_KMH = 12;

export function resolveWindSpeedKmh(data: {
  windspd_avg10m_kmh?: number | string | null;
  windspeed_kmh?: number | string | null;
}): number {
  const avg = data.windspd_avg10m_kmh;
  if (avg !== undefined && avg !== "" && Number.isFinite(Number(avg))) {
    return Number(avg);
  }
  const cur = data.windspeed_kmh;
  if (cur !== undefined && cur !== "" && Number.isFinite(Number(cur))) {
    return Number(cur);
  }
  return NaN;
}

/** Toon gevoelstemperatuur/windchill alleen bij kou (≤10 °C) + wind ≥3 Bft. */
export function shouldShowWindChill(data: {
  temp_c?: number | string | null;
  gevoelstemperatuur?: number | string | null;
  windspd_avg10m_kmh?: number | string | null;
  windspeed_kmh?: number | string | null;
}): boolean {
  const temp = data.temp_c != null ? Number(data.temp_c) : NaN;
  if (!Number.isFinite(temp) || temp > WIND_CHILL_MAX_TEMP_C) return false;

  const windKmh = resolveWindSpeedKmh(data);
  if (!Number.isFinite(windKmh) || windKmh < WIND_CHILL_MIN_WIND_KMH) return false;

  if (data.gevoelstemperatuur == null || data.gevoelstemperatuur === "") return false;
  return Number.isFinite(Number(data.gevoelstemperatuur));
}
