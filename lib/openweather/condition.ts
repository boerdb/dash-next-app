import type { WeatherCondition } from "@/lib/api/types";

/**
 * OpenWeather condition codes → hero-achtergrond.
 * @see https://openweathermap.org/weather-conditions
 */
export function conditionFromOpenWeather(
  weatherId: number,
  cloudsPct: number
): WeatherCondition {
  if (weatherId >= 200 && weatherId < 600) return "rain";
  if (weatherId === 701 || weatherId === 741 || weatherId === 721) return "fog";

  if (weatherId === 800) return "sunny";
  if (weatherId === 801) return "partly-cloudy";
  if (weatherId === 802) return "partly-cloudy";
  if (weatherId === 803 || weatherId === 804) return "cloudy";

  if (cloudsPct <= 10) return "sunny";
  if (cloudsPct <= 40) return "partly-cloudy";
  return "cloudy";
}

export function openWeatherImpliesRain(weatherId: number): boolean {
  return weatherId >= 200 && weatherId < 600;
}

export function openWeatherImpliesFog(weatherId: number): boolean {
  return weatherId === 701 || weatherId === 741 || weatherId === 721;
}
