/**
 * Hitte-index (Heat Index, NOAA Rothfusz) uit temperatuur en relatieve vochtigheid.
 * Alleen zinvol vanaf ca. 27 °C; onder die grens is de lucht temperatuur leidend.
 */
export const HEAT_INDEX_MIN_TEMP_C = 27;

function fToC(f: number): number {
  return ((f - 32) * 5) / 9;
}

function cToF(c: number): number {
  return (c * 9) / 5 + 32;
}

/** Temperatuur in °F, vochtigheid 0–100 %. */
export function heatIndexFahrenheit(tempF: number, humidityPct: number): number {
  const t = tempF;
  const rh = humidityPct;

  if (t < 80) return t;

  let hi =
    -42.379 +
    2.04901523 * t +
    10.14333127 * rh -
    0.22475541 * t * rh -
    0.00683783 * t * t -
    0.05481717 * rh * rh +
    0.00122874 * t * t * rh +
    0.00085282 * t * rh * rh -
    0.00000199 * t * t * rh * rh;

  if (rh < 13 && t >= 80 && t <= 112) {
    hi -= ((13 - rh) / 4) * Math.sqrt((17 - Math.abs(t - 95)) / 17);
  } else if (rh > 85 && t >= 80 && t <= 87) {
    hi += ((rh - 85) / 10) * ((87 - t) / 5);
  }

  return hi;
}

export function computeHeatIndexC(
  tempC: number,
  humidityPct: number
): number | null {
  if (!Number.isFinite(tempC) || !Number.isFinite(humidityPct)) return null;
  if (humidityPct <= 0 || tempC < HEAT_INDEX_MIN_TEMP_C) return null;

  const hiC = fToC(heatIndexFahrenheit(cToF(tempC), humidityPct));
  return Math.round(hiC * 10) / 10;
}

/** Tonen vanaf 27 °C buiten, met geldige hitte-index. */
export function shouldShowHeatIndex(data: {
  temp_c?: number | string | null;
  hitte_index_c?: number | string | null;
}): boolean {
  const temp = data.temp_c != null ? Number(data.temp_c) : NaN;
  if (!Number.isFinite(temp) || temp < HEAT_INDEX_MIN_TEMP_C) return false;
  if (data.hitte_index_c == null || data.hitte_index_c === "") return false;
  return Number.isFinite(Number(data.hitte_index_c));
}
