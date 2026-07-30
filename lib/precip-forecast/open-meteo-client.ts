import type { OpenMeteoSky, PrecipForecastResponse, PrecipForecastSlot } from "@/lib/api/types";
import { HARLINGEN } from "@/lib/location";

const TZ = "Europe/Amsterdam";
/** Komende 48 uur (uurlijks). */
export const PRECIP_FORECAST_HOURS = 48;

interface OpenMeteoForecastResponse {
  current?: {
    cloud_cover?: number;
    weather_code?: number;
    precipitation?: number;
    shortwave_radiation?: number;
  };
  hourly?: {
    time?: string[];
    precipitation?: number[];
    precipitation_probability?: number[];
  };
}

function formatSlotLabel(isoLocal: string): string {
  const time = isoLocal.slice(11, 16);
  // Middernacht + middag krijgen weekdag — voorkomt dubbele "12:00"-labels
  // over twee dagen (Recharts koppelt tooltip anders aan het verkeerde uur).
  if (isoLocal.slice(11, 13) === "00" || isoLocal.slice(11, 13) === "12") {
    const d = new Date(isoLocal);
    const day = d.toLocaleDateString("nl-NL", {
      weekday: "short",
      timeZone: TZ,
    });
    return `${day} ${time}`;
  }
  return time;
}

export function mapOpenMeteoCurrentSky(
  raw: OpenMeteoForecastResponse
): OpenMeteoSky | null {
  const current = raw.current;
  if (!current) return null;
  const cloudCoverPct = Number(current.cloud_cover);
  const weatherCode = Number(current.weather_code);
  if (!Number.isFinite(cloudCoverPct) || !Number.isFinite(weatherCode)) {
    return null;
  }
  const shortwave = Number(current.shortwave_radiation);
  return {
    cloudCoverPct: Math.round(cloudCoverPct),
    weatherCode: Math.round(weatherCode),
    precipitationMm: Math.round(Number(current.precipitation ?? 0) * 10) / 10,
    shortwaveRadiationWm2: Number.isFinite(shortwave)
      ? Math.round(shortwave)
      : null,
  };
}

export function mapOpenMeteoPrecipForecast(
  raw: OpenMeteoForecastResponse,
  now = new Date()
): PrecipForecastSlot[] {
  const times = raw.hourly?.time ?? [];
  const precip = raw.hourly?.precipitation ?? [];
  const pop = raw.hourly?.precipitation_probability ?? [];
  // Start vanaf het huidige uur — Open-Meteo levert vanaf middernacht.
  const hourStart = new Date(now);
  hourStart.setMinutes(0, 0, 0);
  const fromMs = hourStart.getTime();

  const slots: PrecipForecastSlot[] = [];
  for (let i = 0; i < times.length && slots.length < PRECIP_FORECAST_HOURS; i++) {
    const iso = times[i];
    if (!iso) continue;
    const at = new Date(iso).getTime();
    if (Number.isNaN(at) || at < fromMs) continue;
    slots.push({
      at,
      label: formatSlotLabel(iso),
      precipitationMm: Math.round(Number(precip[i] ?? 0) * 10) / 10,
      probabilityPct:
        pop[i] != null && Number.isFinite(Number(pop[i]))
          ? Math.round(Number(pop[i]))
          : null,
    });
  }
  return slots;
}

export async function fetchHarlingenPrecipForecast(): Promise<PrecipForecastResponse> {
  const params = new URLSearchParams({
    latitude: String(HARLINGEN.latitude),
    longitude: String(HARLINGEN.longitude),
    current: "cloud_cover,weather_code,precipitation,shortwave_radiation",
    hourly: "precipitation,precipitation_probability",
    timezone: TZ,
    // 3 dagen zodat er na filteren vanaf nu altijd ~48 toekomstige uren overblijven
    forecast_days: "3",
  });

  const res = await fetch(
    `https://api.open-meteo.com/v1/forecast?${params}`,
    { next: { revalidate: 1800 } }
  );
  if (!res.ok) {
    throw new Error(`Open-Meteo regenvoorspelling: ${res.status}`);
  }

  const raw = (await res.json()) as OpenMeteoForecastResponse;
  const slots = mapOpenMeteoPrecipForecast(raw);
  if (slots.length === 0) {
    throw new Error("Open-Meteo regenvoorspelling: geen data");
  }

  return {
    slots,
    hours: slots.length,
    currentSky: mapOpenMeteoCurrentSky(raw),
    source: "open-meteo",
    updatedAt: new Date().toISOString(),
  };
}
