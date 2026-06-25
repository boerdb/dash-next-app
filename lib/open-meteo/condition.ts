import type { WeatherCondition } from "@/lib/api/types";

/** WMO weather interpretation codes (Open-Meteo). */
export function conditionFromOpenMeteo(
  weatherCode: number,
  cloudCoverPct: number
): WeatherCondition {
  if (weatherCode === 0) return "sunny";
  if (weatherCode === 1 || weatherCode === 2) return "partly-cloudy";
  if (weatherCode === 3) return "cloudy";
  if (weatherCode === 45 || weatherCode === 48) return "fog";
  if (weatherCode >= 71 && weatherCode <= 77) return "snow";
  if (weatherCode >= 95 && weatherCode <= 99) {
    return weatherCode >= 96 ? "storm" : "thunder";
  }
  if (weatherCode >= 51 && weatherCode <= 67) return "rain";
  if (weatherCode >= 80 && weatherCode <= 82) return "rain";
  if (weatherCode >= 85 && weatherCode <= 86) return "snow";

  if (cloudCoverPct <= 25) return "sunny";
  if (cloudCoverPct <= 65) return "partly-cloudy";
  return "cloudy";
}

export function openMeteoImpliesRain(weatherCode: number): boolean {
  return (
    (weatherCode >= 51 && weatherCode <= 67) ||
    (weatherCode >= 80 && weatherCode <= 82)
  );
}

export function openMeteoImpliesSnow(weatherCode: number): boolean {
  return (
    (weatherCode >= 71 && weatherCode <= 77) ||
    (weatherCode >= 85 && weatherCode <= 86)
  );
}

export function openMeteoImpliesThunder(weatherCode: number): boolean {
  return weatherCode >= 95 && weatherCode <= 99;
}
