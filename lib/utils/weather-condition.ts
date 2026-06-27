import type { DayPeriod } from "@/lib/astronomy/sun-moon";
import type { OpenMeteoSky, WeatherCondition, WeerLive } from "@/lib/api/types";
import {
  conditionFromOpenMeteo,
  conditionFromShortwaveRadiation,
  isClearSkyCondition,
  openMeteoImpliesRain,
  openMeteoImpliesSnow,
  openMeteoImpliesThunder,
  pickDarkerSkyCondition,
} from "@/lib/open-meteo/condition";
import {
  computeLightningStormRisk,
  isRecentLightningStrikeNearby,
} from "@/lib/weer/lightning-storm";

function blendWithLocalSolar(
  meteoCondition: WeatherCondition,
  solarWm2: number
): WeatherCondition {
  if (!isClearSkyCondition(meteoCondition)) return meteoCondition;
  const local = conditionFromShortwaveRadiation(solarWm2);
  return pickDarkerSkyCondition(meteoCondition, local);
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

function isStationThunder(data: WeerLive): boolean {
  if (isRecentLightningStrikeNearby(data)) return true;
  if (data.lightning_storm_risk === true) return true;
  return computeLightningStormRisk(data);
}

function isStationRainy(data: WeerLive): boolean {
  const rate = Number(data.rainrate_mm) || 0;
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
  return conditionFromOpenMeteo(
    code,
    sky.cloudCoverPct,
    sky.shortwaveRadiationWm2
  );
}

export function getWeatherCondition(
  data: WeerLive | null,
  period: DayPeriod = "day",
  sunBelowHorizon = false,
  openMeteoSky?: OpenMeteoSky | null
): WeatherCondition {
  if (!data) return period === "night" ? "night" : "cloudy";

  if (isStationThunder(data)) return "thunder";
  if (isStationRainy(data)) return "rain";
  if (isStationFoggy(data)) return "fog";
  if (isStationWindy(data)) return "wind";

  if ( period === "night" || ( period === "evening" && sunBelowHorizon ) ) {
    return "night";
  }
  if ( period === "evening" ) return "evening";
  if ( period === "dawn" ) return "dawn";

  const stationSolar = Number(data.solarradiation);

  if (openMeteoSky) {
    const meteo = skyFromOpenMeteo(openMeteoSky);
    if (Number.isFinite(stationSolar) && stationSolar >= 0) {
      return blendWithLocalSolar(meteo, stationSolar);
    }
    return meteo;
  }

  if (Number.isFinite(stationSolar) && stationSolar >= 0) {
    return conditionFromShortwaveRadiation(stationSolar);
  }

  return "cloudy";
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
