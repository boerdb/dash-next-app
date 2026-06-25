import { HARLINGEN } from "@/lib/location";
import type { PrecipForecastResponse, PrecipForecastSlot } from "@/lib/api/types";

const TZ = "Europe/Amsterdam";
/** Komende 48 uur (uurlijks). */
export const PRECIP_FORECAST_HOURS = 48;

interface OpenMeteoForecastResponse {
  hourly?: {
    time?: string[];
    precipitation?: number[];
    precipitation_probability?: number[];
  };
}

function formatSlotLabel(isoLocal: string): string {
  const time = isoLocal.slice(11, 16);
  if (isoLocal.slice(11, 13) === "00") {
    const d = new Date(isoLocal);
    const day = d.toLocaleDateString("nl-NL", {
      weekday: "short",
      timeZone: TZ,
    });
    return `${day} ${time}`;
  }
  return time;
}

export function mapOpenMeteoPrecipForecast(
  raw: OpenMeteoForecastResponse
): PrecipForecastSlot[] {
  const times = raw.hourly?.time ?? [];
  const precip = raw.hourly?.precipitation ?? [];
  const pop = raw.hourly?.precipitation_probability ?? [];
  const limit = Math.min(times.length, PRECIP_FORECAST_HOURS);

  const slots: PrecipForecastSlot[] = [];
  for (let i = 0; i < limit; i++) {
    const iso = times[i];
    if (!iso) continue;
    const at = new Date(iso).getTime();
    if (Number.isNaN(at)) continue;
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
    hourly: "precipitation,precipitation_probability",
    timezone: TZ,
    forecast_days: "2",
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
    source: "open-meteo",
    updatedAt: new Date().toISOString(),
  };
}
