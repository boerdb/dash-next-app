import type { WeatherCondition } from "@/lib/api/types";

/**
 * OpenWeather condition codes → hero-achtergrond.
 * @see https://openweathermap.org/weather-conditions
 */

const STORM_THUNDER_IDS = new Set([202, 212, 221, 232]);

export function openWeatherImpliesSnow(weatherId: number): boolean {
  return weatherId >= 600 && weatherId < 700;
}

export function openWeatherImpliesThunder(weatherId: number): boolean {
  return weatherId >= 200 && weatherId < 300;
}

export function openWeatherThunderCondition(weatherId: number): "thunder" | "storm" {
  return STORM_THUNDER_IDS.has(weatherId) ? "storm" : "thunder";
}

export function openWeatherImpliesRain(weatherId: number): boolean {
  return (
    (weatherId >= 300 && weatherId < 400) ||
    (weatherId >= 500 && weatherId < 600)
  );
}

export function openWeatherImpliesFog(weatherId: number): boolean {
  return weatherId === 701 || weatherId === 741 || weatherId === 721;
}

export function openWeatherImpliesWind(weatherId: number): boolean {
  return weatherId === 771;
}

export function conditionFromOpenWeather(
  weatherId: number,
  cloudsPct: number
): WeatherCondition {
  if (openWeatherImpliesSnow(weatherId)) return "snow";
  if (openWeatherImpliesThunder(weatherId)) {
    return openWeatherThunderCondition(weatherId);
  }
  if (openWeatherImpliesRain(weatherId)) return "rain";
  if (openWeatherImpliesFog(weatherId)) return "fog";
  if (openWeatherImpliesWind(weatherId)) return "wind";

  if (weatherId === 800) return "sunny";
  if (weatherId === 801 || weatherId === 802 || weatherId === 803) {
    return "partly-cloudy";
  }
  // 804 = overcast; dik bewolkt
  if (weatherId === 804) return "cloudy";

  if (cloudsPct <= 10) return "sunny";
  // Geen bekende weather-id: wolken% is vaak geleidelijker dan 40% = "half"
  if (cloudsPct <= 55) return "partly-cloudy";
  return "cloudy";
}
