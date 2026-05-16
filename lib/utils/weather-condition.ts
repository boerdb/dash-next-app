import type { DayPeriod } from "@/lib/astronomy/sun-moon";
import type { OpenWeatherCurrent, WeatherCondition, WeerLive } from "@/lib/api/types";
import {
  conditionFromOpenWeather,
  openWeatherImpliesFog,
  openWeatherImpliesRain,
} from "@/lib/openweather/condition";

function conditionFromSolar(solar: number): WeatherCondition {
  if (solar > 300) return "sunny";
  if (solar > 50) return "partly-cloudy";
  return "cloudy";
}

function isStationFoggy(data: WeerLive): boolean {
  const humidity = Number(data.humidity) || 0;
  const wind = Number(data.windspd_avg10m_kmh) || 0;
  return humidity >= 95 && wind < 5;
}

export function getWeatherCondition(
  data: WeerLive | null,
  period: DayPeriod = "day",
  openWeather?: OpenWeatherCurrent | null,
  sunBelowHorizon = false
): WeatherCondition {
  if (!data) return period === "night" ? "night" : "cloudy";

  const rainRate = Number(data.rainrate_mm) || 0;
  const owId = openWeather?.weatherId ?? 0;
  const owClouds = openWeather?.cloudsPct ?? 0;

  if (rainRate > 0 || (openWeather && openWeatherImpliesRain(owId))) {
    return "rain";
  }
  if (isStationFoggy(data) || (openWeather && openWeatherImpliesFog(owId))) {
    return "fog";
  }

  if (period === "night" || (period === "evening" && sunBelowHorizon)) {
    return "night";
  }
  if (period === "evening") return "evening";
  if (period === "dawn") return "dawn";

  if (openWeather) {
    return conditionFromOpenWeather(owId, owClouds);
  }

  return conditionFromSolar(Number(data.solarradiation) || 0);
}

export const conditionLabels: Record<WeatherCondition, string> = {
  rain: "Regen",
  fog: "Mist",
  night: "Nacht",
  evening: "Avond",
  dawn: "Dageraad",
  sunny: "Zonnig",
  "partly-cloudy": "Deels bewolkt",
  cloudy: "Bewolkt",
};
