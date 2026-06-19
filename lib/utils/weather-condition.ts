import type { DayPeriod } from "@/lib/astronomy/sun-moon";
import type { OpenWeatherCurrent, WeatherCondition, WeerLive } from "@/lib/api/types";
import {
  conditionFromOpenWeather,
  openWeatherImpliesFog,
  openWeatherImpliesRain,
  openWeatherImpliesSnow,
  openWeatherImpliesThunder,
  openWeatherImpliesWind,
  openWeatherThunderCondition,
} from "@/lib/openweather/condition";
import { isRecentLightningStrike } from "@/lib/weer/lightning-time";

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

function isStationWindy(data: WeerLive): boolean {
  const wind = Number(data.windspd_avg10m_kmh) || 0;
  const gust = Number(data.windgust_kmh) || 0;
  return wind >= 40 || gust >= 55;
}

function isStationLightning(data: WeerLive): boolean {
  const km = data.lightning_km;
  if (km == null || km <= 0) return false;
  return isRecentLightningStrike(data.lightning_time ?? undefined);
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

  if (openWeather && openWeatherImpliesSnow(owId)) return "snow";
  if (isStationLightning(data)) return "thunder";
  if (openWeather && openWeatherImpliesThunder(owId)) {
    return openWeatherThunderCondition(owId);
  }
  if (rainRate > 0 || (openWeather && openWeatherImpliesRain(owId))) {
    return "rain";
  }
  if (isStationFoggy(data) || (openWeather && openWeatherImpliesFog(owId))) {
    return "fog";
  }
  if (openWeather && openWeatherImpliesWind(owId)) return "wind";
  if (isStationWindy(data)) return "wind";

  if (period === "night" || (period === "evening" && sunBelowHorizon)) {
    return "night";
  }
  if (period === "evening") return "evening";
  if (period === "dawn") return "dawn";

  if (openWeather) {
    const fromOw = conditionFromOpenWeather(owId, owClouds);
    if (fromOw !== "cloudy") return fromOw;
    // Model (804 / hoge bewolking%) zegt soms "dicht" terwijl het station nog duidelijk zon ziet.
    return conditionFromSolar(Number(data.solarradiation) || 0);
  }

  return conditionFromSolar(Number(data.solarradiation) || 0);
}

export const conditionLabels: Record<WeatherCondition, string> = {
  rain: "Regen",
  snow: "Sneeuw",
  thunder: "Onweer",
  storm: "Storm",
  wind: "Wind",
  fog: "Mist",
  night: "Nacht",
  evening: "Avond",
  dawn: "Dageraad",
  sunny: "Zonnig",
  "partly-cloudy": "Deels bewolkt",
  cloudy: "Bewolkt",
};
