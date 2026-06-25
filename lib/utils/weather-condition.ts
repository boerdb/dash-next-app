import type { DayPeriod } from "@/lib/astronomy/sun-moon";
import type { OpenMeteoSky, WeatherCondition, WeerLive } from "@/lib/api/types";
import {
  conditionFromOpenMeteo,
  openMeteoImpliesRain,
  openMeteoImpliesSnow,
  openMeteoImpliesThunder,
} from "@/lib/open-meteo/condition";
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

function isStationRainy(data: WeerLive): boolean {
  const rate = Number(data.rainrate_mm) || Number(data.rainrate_piezo_mm) || 0;
  return rate > 0;
}

function skyFromOpenMeteo(sky: OpenMeteoSky): WeatherCondition {
  const code = sky.weatherCode;
  if (openMeteoImpliesThunder(code)) {
    return code >= 96 ? "storm" : "thunder";
  }
  if (openMeteoImpliesSnow(code)) return "snow";
  if (openMeteoImpliesRain(code) || sky.precipitationMm > 0) return "rain";
  if (code === 45 || code === 48) return "fog";
  return conditionFromOpenMeteo(code, sky.cloudCoverPct);
}

export function getWeatherCondition(
  data: WeerLive | null,
  period: DayPeriod = "day",
  sunBelowHorizon = false,
  openMeteoSky?: OpenMeteoSky | null
): WeatherCondition {
  if (!data) return period === "night" ? "night" : "cloudy";

  if (isStationLightning(data)) return "thunder";
  if (isStationRainy(data)) return "rain";
  if (isStationFoggy(data)) return "fog";
  if (isStationWindy(data)) return "wind";

  if (period === "night" || (period === "evening" && sunBelowHorizon)) {
    return "night";
  }
  if (period === "evening") return "evening";
  if (period === "dawn") return "dawn";

  if (openMeteoSky) {
    return skyFromOpenMeteo(openMeteoSky);
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
