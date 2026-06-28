import type { DayPeriod } from "@/lib/astronomy/sun-moon";
import type { OpenMeteoSky, WeatherCondition, WeerLive } from "@/lib/api/types";
import {
  conditionFromOpenMeteo,
  conditionFromShortwaveRadiation,
  isClearSkyCondition,
  openMeteoImpliesRain,
  openMeteoImpliesSnow,
  openMeteoImpliesThunder,
  pickSunnierSkyCondition,
} from "@/lib/open-meteo/condition";
import { isRecentLightningStrikeNearby } from "@/lib/weer/lightning-storm";

/** Lokale instraling mag het model alleen ophelderen (schaduw op sensor ≠ bewolkt). */
function blendWithLocalSolar(
  meteoCondition: WeatherCondition,
  solarWm2: number
): WeatherCondition {
  if (!isClearSkyCondition(meteoCondition)) return meteoCondition;
  const local = conditionFromShortwaveRadiation(solarWm2);
  return pickSunnierSkyCondition(meteoCondition, local);
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

/**
 * Onweer-hero alleen bij échte WH57-activiteit: een recente inslag of de
 * gelatchte stormkans (die nu uitsluitend door echte activiteit wordt gezet).
 * De onweersgevoelige-lucht-heuristiek zet de hero bewust NIET op onweer.
 */
function isStationThunder(data: WeerLive): boolean {
  if (isRecentLightningStrikeNearby(data)) return true;
  return data.lightning_storm_risk === true;
}

/**
 * Externe bevestiging van actueel onweer: Open-Meteo weercode 95-99 (nowcast)
 * of een actieve KNMI-onweerwaarschuwing. Geeft "storm" bij hagel (≥96).
 */
function externalThunderCondition(
  openMeteoSky: OpenMeteoSky | null | undefined,
  knmiThunder: boolean
): WeatherCondition | null {
  if (openMeteoSky && openMeteoImpliesThunder(openMeteoSky.weatherCode)) {
    return openMeteoSky.weatherCode >= 96 ? "storm" : "thunder";
  }
  if (knmiThunder) return "thunder";
  return null;
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
  openMeteoSky?: OpenMeteoSky | null,
  knmiThunder = false
): WeatherCondition {
  const external = externalThunderCondition(openMeteoSky, knmiThunder);
  if (!data) {
    if (external) return external;
    return period === "night" ? "night" : "cloudy";
  }

  if (isStationThunder(data)) return external ?? "thunder";
  if (external) return external;
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
