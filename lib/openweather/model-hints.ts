import type { OpenWeatherCurrent } from "@/lib/api/types";
import { openWeatherImpliesRain } from "./condition";

export function parseStationHumidityPct(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 100) return null;
  return Math.round(n);
}

export function openWeatherModelImpliesWet(current: OpenWeatherCurrent): boolean {
  if (current.rainMm1h != null && current.rainMm1h > 0) return true;
  return openWeatherImpliesRain(current.weatherId);
}

const STATION_MODEL_RH_GAP_PCT = 30;

export function shouldShowStationHumidityComparison(
  modelRh: number | null,
  stationRh: number | null
): boolean {
  if (modelRh == null || stationRh == null) return false;
  return Math.abs(stationRh - modelRh) >= STATION_MODEL_RH_GAP_PCT;
}

export function shouldShowWetWeatherModelHint(
  current: OpenWeatherCurrent,
  stationRh: number | null
): boolean {
  const modelRh = current.humidityPct;
  if (modelRh == null || modelRh >= 50) return false;
  if (!openWeatherModelImpliesWet(current)) return false;
  if (stationRh != null && stationRh >= 70) return true;
  return modelRh < 50;
}
