import type {
  OpenWeatherCurrent,
  OpenWeatherDaily,
  OpenWeatherHourly,
  OpenWeatherMinutely,
  OpenWeatherSupplement,
} from "@/lib/api/types";
import { dagKeyAmsterdam, dagLabelAmsterdam } from "@/lib/tides/day-label";
import {
  humidityFromDewPoint,
  msToKmh,
  normalizeDewPointC,
  normalizeHumidityPct,
  normalizeMetricTemp,
} from "./normalize-metrics";
import type {
  OwForecastItem,
  OwForecastResponse,
  OwOneCallCurrent,
  OwOneCallDaily,
  OwOneCallHourly,
  OwOneCallMinutely,
  OwOneCallResponse,
  OwPrecipVolume,
  OwWeatherResponse,
} from "./types";

const TZ = "Europe/Amsterdam";

function formatTime(date: Date): string {
  return date.toLocaleTimeString("nl-NL", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TZ,
  });
}

function iconUrl(icon: string): string {
  return `https://openweathermap.org/img/wn/${icon}@2x.png`;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function precip1h(vol?: OwPrecipVolume): number | null {
  const mm = vol?.["1h"];
  if (mm == null || Number.isNaN(mm)) return null;
  return round1(mm);
}

function referenceDtSec(current: OwOneCallCurrent | undefined): number {
  return current?.dt ?? Math.floor(Date.now() / 1000);
}

/** Dichtstbij `current.dt` (of nu), niet array-volgorde. */
function hourliesByNearest(
  hourly: OwOneCallHourly[],
  refDt: number
): OwOneCallHourly[] {
  return [...hourly].sort(
    (a, b) => Math.abs(a.dt - refDt) - Math.abs(b.dt - refDt)
  );
}

/** One Call 3.0: `current.humidity` is leidend; bij ongeldige API-waarden nearest hourly. */
function pickHumidity(
  current: OwOneCallCurrent | undefined,
  hourly: OwOneCallHourly[]
): number | null {
  const fromCurrent = normalizeHumidityPct(current?.humidity);
  if (fromCurrent != null) return fromCurrent;

  const refDt = referenceDtSec(current);
  for (const slot of hourliesByNearest(hourly, refDt)) {
    const pct = normalizeHumidityPct(slot.humidity);
    if (pct != null) return pct;
  }

  const tempC = normalizeMetricTemp(current?.temp);
  if (tempC == null) return null;

  for (const slot of hourliesByNearest(hourly, refDt)) {
    const dewPointC = normalizeDewPointC(slot.dew_point);
    if (dewPointC != null) {
      return humidityFromDewPoint(tempC, dewPointC);
    }
  }

  return null;
}

function pickDewPoint(
  current: OwOneCallCurrent | undefined,
  hourly: OwOneCallHourly[]
): number | null {
  const fromCurrent = normalizeDewPointC(current?.dew_point);
  if (fromCurrent != null) return fromCurrent;

  const refDt = referenceDtSec(current);
  for (const slot of hourliesByNearest(hourly, refDt)) {
    const dp = normalizeDewPointC(slot.dew_point);
    if (dp != null) return dp;
  }
  return null;
}

function mapCurrent3(
  current: OwOneCallCurrent | undefined,
  hourlyRaw: OwOneCallHourly[]
): OpenWeatherCurrent {
  const w = current?.weather?.[0];
  const visibilityM = current?.visibility;
  const rain = precip1h(current?.rain);
  const snow = precip1h(current?.snow);

  return {
    description: w?.description ?? "—",
    icon: w?.icon ? iconUrl(w.icon) : "",
    weatherId: w?.id ?? 0,
    tempC: normalizeMetricTemp(current?.temp),
    feelsLikeC: normalizeMetricTemp(current?.feels_like),
    cloudsPct: Math.round(current?.clouds ?? 0),
    visibilityKm:
      visibilityM != null ? round1(visibilityM / 1000) : null,
    humidityPct: pickHumidity(current, hourlyRaw),
    dewPointC: pickDewPoint(current, hourlyRaw),
    pressureHpa:
      current?.pressure != null ? Math.round(current.pressure) : null,
    uvi: current?.uvi != null ? round1(current.uvi) : null,
    windSpeedKmh: msToKmh(current?.wind_speed),
    windDeg:
      current?.wind_deg != null ? Math.round(current.wind_deg) : null,
    windGustKmh: msToKmh(current?.wind_gust),
    rainMm1h: rain,
    snowMm1h: snow,
  };
}

function toOneCallMinutely(item: OwOneCallMinutely): OpenWeatherMinutely {
  const date = new Date(item.dt * 1000);
  return {
    at: item.dt * 1000,
    label: formatTime(date),
    precipitationMm: round1(item.precipitation ?? 0),
  };
}

function toOneCallHourly(item: OwOneCallHourly): OpenWeatherHourly {
  const date = new Date(item.dt * 1000);
  const w = item.weather?.[0];
  return {
    at: item.dt * 1000,
    label: formatTime(date),
    tempC: normalizeMetricTemp(item.temp) ?? 0,
    feelsLikeC: normalizeMetricTemp(item.feels_like),
    popPct: Math.round((item.pop ?? 0) * 100),
    humidityPct: normalizeHumidityPct(item.humidity),
    windSpeedKmh: msToKmh(item.wind_speed),
    windDeg: item.wind_deg != null ? Math.round(item.wind_deg) : null,
    description: w?.description ?? "",
    icon: w?.icon ? iconUrl(w.icon) : "",
  };
}

function toOneCallDaily(item: OwOneCallDaily): OpenWeatherDaily {
  const date = new Date(item.dt * 1000);
  const dagKey = dagKeyAmsterdam(date);
  const today = dagKeyAmsterdam(new Date());
  const weather = item.weather?.[0];

  return {
    dagKey,
    label: dagKey === today ? "Vandaag" : dagLabelAmsterdam(date),
    tempMinC: normalizeMetricTemp(item.temp?.min) ?? 0,
    tempMaxC: normalizeMetricTemp(item.temp?.max) ?? 0,
    popPct: Math.round((item.pop ?? 0) * 100),
    uviMax: item.uvi != null ? round1(item.uvi) : null,
    windSpeedKmh: msToKmh(item.wind_speed),
    windDeg: item.wind_deg != null ? Math.round(item.wind_deg) : null,
    sunriseAt: item.sunrise ? formatTime(new Date(item.sunrise * 1000)) : null,
    sunsetAt: item.sunset ? formatTime(new Date(item.sunset * 1000)) : null,
    rainMm: item.rain != null ? round1(item.rain) : null,
    snowMm: item.snow != null ? round1(item.snow) : null,
    description: weather?.description ?? "",
    icon: weather?.icon ? iconUrl(weather.icon) : "",
  };
}

/** Ruwe One Call `current`-velden (alleen voor development/debug). */
export function getOneCallRawCurrentDebug(data: OwOneCallResponse) {
  const c = data.current;
  return {
    rawHumidity: c?.humidity ?? null,
    rawDewPoint: c?.dew_point ?? null,
    rawTemp: c?.temp ?? null,
    rawDt: c?.dt ?? null,
  };
}

export function mapOneCall3(data: OwOneCallResponse): OpenWeatherSupplement {
  const now = Date.now();
  const hourlyRaw = data.hourly ?? [];

  const hourly: OpenWeatherHourly[] = hourlyRaw
    .filter((item) => item.dt * 1000 > now - 60_000)
    .slice(0, 8)
    .map((item) => toOneCallHourly(item));

  const daily: OpenWeatherDaily[] = (data.daily ?? [])
    .slice(0, 5)
    .map((item) => toOneCallDaily(item));

  const minutely: OpenWeatherMinutely[] = (data.minutely ?? [])
    .slice(0, 60)
    .map((item) => toOneCallMinutely(item));

  return {
    current: mapCurrent3(data.current, hourlyRaw),
    minutely,
    hourly,
    daily,
    dataSource: "onecall-3",
    updatedAt: new Date().toISOString(),
  };
}

function emptyCurrent25(
  partial: Partial<OpenWeatherCurrent>
): OpenWeatherCurrent {
  return {
    description: partial.description ?? "—",
    icon: partial.icon ?? "",
    weatherId: partial.weatherId ?? 0,
    tempC: partial.tempC ?? null,
    feelsLikeC: partial.feelsLikeC ?? null,
    cloudsPct: partial.cloudsPct ?? 0,
    visibilityKm: partial.visibilityKm ?? null,
    humidityPct: partial.humidityPct ?? null,
    dewPointC: partial.dewPointC ?? null,
    pressureHpa: partial.pressureHpa ?? null,
    uvi: partial.uvi ?? null,
    windSpeedKmh: partial.windSpeedKmh ?? null,
    windDeg: partial.windDeg ?? null,
    windGustKmh: partial.windGustKmh ?? null,
    rainMm1h: partial.rainMm1h ?? null,
    snowMm1h: partial.snowMm1h ?? null,
  };
}

export function mapOpenWeatherSupplement(
  current: OwWeatherResponse,
  forecast: OwForecastResponse
): OpenWeatherSupplement {
  const now = Date.now();
  const list = forecast.list ?? [];

  const hourly: OpenWeatherHourly[] = list
    .filter((item) => item.dt * 1000 > now - 60_000)
    .slice(0, 8)
    .map((item) => toHourly(item));

  const daily = groupDaily(list);

  const w = current.weather?.[0];
  const visibilityM = current.visibility;
  const dew = current.main?.dew_point;

  return {
    current: emptyCurrent25({
      description: w?.description ?? "—",
      icon: w?.icon ? iconUrl(w.icon) : "",
      weatherId: w?.id ?? 0,
      tempC: normalizeMetricTemp(current.main?.temp),
      feelsLikeC: normalizeMetricTemp(current.main?.feels_like),
      cloudsPct: current.clouds?.all ?? 0,
      visibilityKm:
        visibilityM != null ? round1(visibilityM / 1000) : null,
      humidityPct: normalizeHumidityPct(current.main?.humidity),
      dewPointC: normalizeDewPointC(dew),
      pressureHpa:
        current.main?.pressure != null
          ? Math.round(current.main.pressure)
          : null,
      windSpeedKmh: msToKmh(current.wind?.speed),
      windDeg:
        current.wind?.deg != null ? Math.round(current.wind.deg) : null,
      windGustKmh: msToKmh(current.wind?.gust),
    }),
    minutely: [],
    hourly,
    daily,
    dataSource: "2.5",
    updatedAt: new Date().toISOString(),
  };
}

function toHourly(item: OwForecastItem): OpenWeatherHourly {
  const date = new Date(item.dt * 1000);
  const w = item.weather?.[0];
  return {
    at: item.dt * 1000,
    label: formatTime(date),
    tempC: normalizeMetricTemp(item.main?.temp) ?? 0,
    feelsLikeC: normalizeMetricTemp(item.main?.feels_like),
    popPct: Math.round((item.pop ?? 0) * 100),
    humidityPct: normalizeHumidityPct(item.main?.humidity),
    windSpeedKmh: msToKmh(item.wind?.speed),
    windDeg: item.wind?.deg != null ? Math.round(item.wind.deg) : null,
    description: w?.description ?? "",
    icon: w?.icon ? iconUrl(w.icon) : "",
  };
}

function groupDaily(list: OwForecastItem[]): OpenWeatherDaily[] {
  const byDay = new Map<
    string,
    {
      temps: number[];
      pops: number[];
      icon: string;
      description: string;
      date: Date;
    }
  >();

  for (const item of list) {
    const date = new Date(item.dt * 1000);
    const key = dagKeyAmsterdam(date);
    const temp = item.main?.temp ?? 0;
    const pop = Math.round((item.pop ?? 0) * 100);
    const w = item.weather?.[0];
    const existing = byDay.get(key);

    if (!existing) {
      byDay.set(key, {
        temps: [temp],
        pops: [pop],
        icon: w?.icon ?? "01d",
        description: w?.description ?? "",
        date,
      });
    } else {
      existing.temps.push(temp);
      existing.pops.push(pop);
      if (pop >= Math.max(...existing.pops)) {
        existing.icon = w?.icon ?? existing.icon;
        existing.description = w?.description ?? existing.description;
      }
    }
  }

  const today = dagKeyAmsterdam(new Date());
  return [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(0, 5)
    .map(([dagKey, g]) => ({
      dagKey,
      label: dagKey === today ? "Vandaag" : dagLabelAmsterdam(g.date),
      tempMinC: round1(Math.min(...g.temps)),
      tempMaxC: round1(Math.max(...g.temps)),
      popPct: Math.max(...g.pops),
      uviMax: null,
      windSpeedKmh: null,
      windDeg: null,
      sunriseAt: null,
      sunsetAt: null,
      rainMm: null,
      snowMm: null,
      description: g.description,
      icon: iconUrl(g.icon),
    }));
}

/** Zorgt dat oude/gedeeltelijke API- of cache-responses niet crashen. */
export function normalizeOpenWeatherSupplement(
  raw: Partial<OpenWeatherSupplement> | null | undefined
): OpenWeatherSupplement | null {
  if (!raw?.current) return null;

  const c = raw.current;
  const tempC = c.tempC != null ? normalizeMetricTemp(c.tempC) : null;
  const feelsLikeC =
    c.feelsLikeC != null ? normalizeMetricTemp(c.feelsLikeC) : null;
  let dewPointC = c.dewPointC != null ? normalizeDewPointC(c.dewPointC) : null;
  let humidityPct =
    c.humidityPct != null ? normalizeHumidityPct(c.humidityPct) : null;

  if (humidityPct == null && Array.isArray(raw.hourly)) {
    for (const h of raw.hourly) {
      const pct = normalizeHumidityPct(h.humidityPct);
      if (pct != null) {
        humidityPct = pct;
        break;
      }
    }
  }

  if (
    humidityPct == null &&
    raw.dataSource === "onecall-3" &&
    tempC != null &&
    dewPointC != null
  ) {
    humidityPct = humidityFromDewPoint(tempC, dewPointC);
  }

  return {
    current: emptyCurrent25({
      ...c,
      tempC,
      feelsLikeC,
      humidityPct,
      dewPointC,
    }),
    minutely: Array.isArray(raw.minutely) ? raw.minutely : [],
    hourly: Array.isArray(raw.hourly) ? raw.hourly : [],
    daily: Array.isArray(raw.daily) ? raw.daily : [],
    dataSource: raw.dataSource === "onecall-3" ? "onecall-3" : "2.5",
    updatedAt: raw.updatedAt ?? new Date().toISOString(),
  };
}
