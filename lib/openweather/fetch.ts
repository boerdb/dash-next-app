import { HARLINGEN } from "@/lib/location";
import type { OpenWeatherSupplement } from "@/lib/api/types";
import { mapOpenWeatherSupplement } from "./map";
import type { OwForecastResponse, OwWeatherResponse } from "./types";

const BASE = "https://api.openweathermap.org/data/2.5";
const LANG = "nl";
const UNITS = "metric";

function buildUrl(path: string, apiKey: string): string {
  const params = new URLSearchParams({
    lat: String(HARLINGEN.latitude),
    lon: String(HARLINGEN.longitude),
    appid: apiKey,
    units: UNITS,
    lang: LANG,
  });
  return `${BASE}/${path}?${params}`;
}

export async function fetchOpenWeatherSupplement(
  apiKey: string
): Promise<OpenWeatherSupplement> {
  const [currentRes, forecastRes] = await Promise.all([
    fetch(buildUrl("weather", apiKey), { next: { revalidate: 1800 } }),
    fetch(buildUrl("forecast", apiKey), { next: { revalidate: 1800 } }),
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
