import { HARLINGEN } from "@/lib/location";
import type { OpenWeatherSupplement } from "@/lib/api/types";
import { mapOneCall3, mapOpenWeatherSupplement } from "./map";
import type {
  OwForecastResponse,
  OwOneCallResponse,
  OwWeatherResponse,
} from "./types";

const BASE_25 = "https://api.openweathermap.org/data/2.5";
const BASE_30 = "https://api.openweathermap.org/data/3.0";
const LANG = "nl";
const UNITS = "metric";
const FETCH_OPTS = { next: { revalidate: 1800 } } as const;

const ONECALL_FALLBACK_STATUSES = new Set([401, 403, 404]);

function build25Url(path: string, apiKey: string): string {
  const params = new URLSearchParams({
    lat: String(HARLINGEN.latitude),
    lon: String(HARLINGEN.longitude),
    appid: apiKey,
    units: UNITS,
    lang: LANG,
  });
  return `${BASE_25}/${path}?${params}`;
}

function buildOneCallUrl(apiKey: string): string {
  const params = new URLSearchParams({
    lat: String(HARLINGEN.latitude),
    lon: String(HARLINGEN.longitude),
    appid: apiKey,
    units: UNITS,
    lang: LANG,
  });
  return `${BASE_30}/onecall?${params}`;
}

async function fetchOpenWeather25(apiKey: string): Promise<OpenWeatherSupplement> {
  const [currentRes, forecastRes] = await Promise.all([
    fetch(build25Url("weather", apiKey), FETCH_OPTS),
    fetch(build25Url("forecast", apiKey), FETCH_OPTS),
  ]);

  if (!currentRes.ok) {
    throw new Error(`OpenWeather current: ${currentRes.status}`);
  }
  if (!forecastRes.ok) {
    throw new Error(`OpenWeather forecast: ${forecastRes.status}`);
  }

  const current = (await currentRes.json()) as OwWeatherResponse;
  const forecast = (await forecastRes.json()) as OwForecastResponse;

  return mapOpenWeatherSupplement(current, forecast);
}

export async function fetchOpenWeatherSupplement(
  apiKey: string
): Promise<OpenWeatherSupplement> {
  const oneCallRes = await fetch(buildOneCallUrl(apiKey), FETCH_OPTS);

  if (oneCallRes.ok) {
    const data = (await oneCallRes.json()) as OwOneCallResponse;
    return mapOneCall3(data);
  }

  if (ONECALL_FALLBACK_STATUSES.has(oneCallRes.status)) {
    return fetchOpenWeather25(apiKey);
  }

  throw new Error(`OpenWeather One Call: ${oneCallRes.status}`);
}
